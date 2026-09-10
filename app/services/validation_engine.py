import os
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Union

from app.services.conditional_engine import evaluate_form_rules, _normalize_key


class ValidationResult(dict):
    """
    Validation result dictionary supporting:
      - res.is_valid (bool)
      - res.errors (Dict[str, str])
      - res["errors"] (Dict[str, str])
      - len(res) == 0 when valid
      - res[field_id] -> error message
      - bool(res) -> True if valid (0 errors)
    """
    def __init__(self, errors: Optional[Dict[str, str]] = None):
        err_dict = errors or {}
        super().__init__(**err_dict)
        self._errors_map = dict(err_dict)
        self.is_valid = len(err_dict) == 0

    @property
    def errors(self) -> Dict[str, str]:
        return self._errors_map

    def __getitem__(self, key: str) -> Any:
        if key == "errors" and "errors" not in self._errors_map:
            return self._errors_map
        return super().__getitem__(key)

    def get(self, key: str, default: Any = None) -> Any:
        if key == "errors" and "errors" not in self._errors_map:
            return self._errors_map
        return super().get(key, default)

    def __bool__(self) -> bool:
        return self.is_valid


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
URL_REGEX = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)


def _is_empty_value(value: Any) -> bool:
    """Checks if a submitted value is considered empty/missing."""
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, (list, tuple, set, dict)) and len(value) == 0:
        return True
    return False


def validate_field_value(field: Any, value: Any, is_conditionally_required: bool = False) -> Optional[str]:
    """
    Validates a single field value against its definition and validation_config.
    Returns None if valid, or an error message string if invalid.
    """
    label = getattr(field, "label", None) or (field.get("label") if isinstance(field, dict) else "Field")
    field_type = getattr(field, "field_type", None) or (field.get("field_type") if isinstance(field, dict) else "text")
    field_type = (field_type or "text").strip().lower()

    is_required = getattr(field, "is_required", False) or (field.get("is_required", False) if isinstance(field, dict) else False)
    validation_config = getattr(field, "validation_config", None) or (field.get("validation_config") if isinstance(field, dict) else None) or {}
    options = getattr(field, "options", None) or (field.get("options") if isinstance(field, dict) else None) or []

    # 1. Required Check
    empty = _is_empty_value(value)
    if is_required or is_conditionally_required:
        if empty:
            return f"{label} is required."
    else:
        if empty:
            return None

    # 2. Type Validations
    if field_type in ("text", "textarea"):
        val_str = str(value)
        min_len = validation_config.get("min_length")
        if min_len is not None and len(val_str) < int(min_len):
            return f"{label} must be at least {min_len} characters."

        max_len = validation_config.get("max_length")
        if max_len is not None and len(val_str) > int(max_len):
            return f"{label} cannot exceed {max_len} characters."

        regex_pattern = validation_config.get("regex")
        if regex_pattern and not re.search(regex_pattern, val_str):
            return validation_config.get("regex_error", f"{label} does not match the required pattern.")

    elif field_type == "number":
        try:
            num_val = float(value)
        except (ValueError, TypeError):
            return f"{label} must be a valid number."

        min_val = validation_config.get("min_value")
        if min_val is not None and num_val < float(min_val):
            return f"{label} must be at least {min_val}."

        max_val = validation_config.get("max_value")
        if max_val is not None and num_val > float(max_val):
            return f"{label} cannot exceed {max_val}."

    elif field_type == "email":
        val_str = str(value).strip()
        if not EMAIL_REGEX.match(val_str):
            return f"{label} must be a valid email address."

    elif field_type == "date":
        val_str = str(value).strip()
        try:
            date_val = datetime.strptime(val_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return f"{label} must be a valid date in YYYY-MM-DD format."

        min_date_cfg = validation_config.get("min_date")
        if min_date_cfg:
            try:
                min_d = datetime.strptime(str(min_date_cfg).strip(), "%Y-%m-%d").date()
                if date_val < min_d:
                    return f"{label} must be on or after {min_date_cfg}."
            except (ValueError, TypeError):
                pass

        max_date_cfg = validation_config.get("max_date")
        if max_date_cfg:
            try:
                max_d = datetime.strptime(str(max_date_cfg).strip(), "%Y-%m-%d").date()
                if date_val > max_d:
                    return f"{label} must be on or before {max_date_cfg}."
            except (ValueError, TypeError):
                pass

    elif field_type in ("dropdown", "radio"):
        allowed = [
            str(opt.option_value if hasattr(opt, "option_value") else opt["option_value"]).strip()
            for opt in options
        ]
        if str(value).strip() not in allowed:
            return f"{label} contains an invalid selection."

    elif field_type in ("checkbox", "multiselect"):
        if not isinstance(value, (list, tuple, set)):
            return f"{label} must be a list of selections."

        allowed = [
            str(opt.option_value if hasattr(opt, "option_value") else opt["option_value"]).strip()
            for opt in options
        ]
        for item in value:
            if str(item).strip() not in allowed:
                return f"{label} contains an invalid selection '{item}'."

        min_sel = validation_config.get("min_selected")
        if min_sel is not None and len(value) < int(min_sel):
            return f"{label} must have at least {min_sel} options selected."

        max_sel = validation_config.get("max_selected")
        if max_sel is not None and len(value) > int(max_sel):
            return f"{label} cannot have more than {max_sel} options selected."

    elif field_type == "rating":
        try:
            rating_val = int(value)
        except (ValueError, TypeError):
            return f"{label} must be a valid rating integer."

        min_rating = int(validation_config.get("min_rating", 1))
        max_rating = int(validation_config.get("max_rating", 5))
        if rating_val < min_rating or rating_val > max_rating:
            return f"{label} must be between {min_rating} and {max_rating}."

    elif field_type == "url":
        val_str = str(value).strip()
        if not URL_REGEX.match(val_str):
            return f"{label} must be a valid URL starting with http:// or https://."

    elif field_type == "file":
        filename = None
        if isinstance(value, dict):
            filename = value.get("name") or value.get("original_name") or value.get("filename")
        elif isinstance(value, str):
            filename = value

        allowed_exts = validation_config.get("allowed_extensions")
        if allowed_exts and filename:
            norm_exts = [
                ext.lower() if ext.startswith(".") else f".{ext.lower()}"
                for ext in allowed_exts
            ]
            _, file_ext = os.path.splitext(filename)
            if file_ext and file_ext.lower() not in norm_exts:
                return f"{label} must have one of the following extensions: {', '.join(norm_exts)}."

    return None


def validate_submission_data(
    fields: List[Any],
    submitted_data: Dict[str, Any],
    conditionally_required_ids: Optional[Union[Set[Any], List[Any]]] = None,
    visible_field_ids: Optional[Union[Set[Any], List[Any]]] = None,
    rules: Optional[List[Any]] = None
) -> ValidationResult:
    """
    Validates complete form submission data across all fields and conditional states.
    Returns ValidationResult with field error mappings and is_valid status.
    """
    # 1. Coordinate with conditional evaluation engine if rules are provided
    cond_visible: Optional[Set[str]] = None
    cond_required: Optional[Set[str]] = None

    if rules is not None:
        eval_res = evaluate_form_rules(rules, submitted_data, fields=fields)
        cond_visible = set(str(fid) for fid in eval_res.visible_fields)
        cond_required = set(str(fid) for fid in eval_res.required_fields)

    # 2. Build set of visible field IDs and conditionally required field IDs
    final_visible: Optional[Set[str]] = None
    if visible_field_ids is not None:
        final_visible = set(str(fid) for fid in visible_field_ids)
    elif cond_visible is not None:
        final_visible = cond_visible

    final_required: Set[str] = set()
    if conditionally_required_ids is not None:
        final_required.update(str(fid) for fid in conditionally_required_ids)
    if cond_required is not None:
        final_required.update(cond_required)

    # 3. Build lookup from alias/normalized names to canonical str(field.id)
    alias_to_field: Dict[str, Any] = {}
    for f in (fields or []):
        fid = str(f.id if hasattr(f, "id") else f["id"])
        flabel = f.label if hasattr(f, "label") else f.get("label", "")
        alias_to_field[fid] = f
        if flabel:
            alias_to_field[flabel] = f
            alias_to_field[_normalize_key(flabel)] = f

    errors: Dict[str, str] = {}

    # 4. Check for submitted values in hidden fields
    for raw_key, val in (submitted_data or {}).items():
        key_str = str(raw_key)
        matched_field = alias_to_field.get(key_str) or alias_to_field.get(_normalize_key(key_str))
        if matched_field:
            fid = str(matched_field.id if hasattr(matched_field, "id") else matched_field["id"])
            if final_visible is not None and fid not in final_visible:
                if not _is_empty_value(val):
                    lbl = matched_field.label if hasattr(matched_field, "label") else matched_field.get("label", "Field")
                    errors[raw_key] = f"{lbl} is hidden by conditional logic and cannot accept values."

    # 5. Validate visible fields
    for f in (fields or []):
        fid = str(f.id if hasattr(f, "id") else f["id"])
        flabel = f.label if hasattr(f, "label") else f.get("label", "")
        norm_label = _normalize_key(flabel)

        # Check visibility
        is_visible = True
        if final_visible is not None:
            is_visible = (fid in final_visible) or (flabel in final_visible) or (norm_label in final_visible)

        if not is_visible:
            continue

        # Get submitted value for this field
        val = None
        key_used = fid
        if fid in submitted_data:
            val = submitted_data[fid]
            key_used = fid
        elif flabel and flabel in submitted_data:
            val = submitted_data[flabel]
            key_used = flabel
        elif norm_label and norm_label in submitted_data:
            val = submitted_data[norm_label]
            key_used = norm_label

        is_cond_req = (fid in final_required) or (flabel in final_required) or (norm_label in final_required)
        err = validate_field_value(f, val, is_conditionally_required=is_cond_req)
        if err:
            errors[key_used] = err

    return ValidationResult(errors)
