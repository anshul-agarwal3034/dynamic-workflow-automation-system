import uuid
from typing import Any, Dict, List, Optional, Set, Union


class FieldIdSet(set):
    """
    A set of canonical field IDs (strings) that also allows membership checks
    via alternative aliases (e.g., UUID objects, field labels, or snake_case names).
    """
    def __init__(self, items=None, alias_to_id=None):
        super().__init__(items or [])
        self._alias_to_id = alias_to_id or {}

    def __contains__(self, item: Any) -> bool:
        if super().__contains__(item):
            return True
        if super().__contains__(str(item)):
            return True
        norm_key = _normalize_key(str(item))
        canonical = self._alias_to_id.get(str(item)) or self._alias_to_id.get(norm_key)
        if canonical and super().__contains__(canonical):
            return True
        return False


class EvaluationResult(dict):
    """
    Result dictionary that also allows attribute access (e.g. res.visible_fields, res.errors).
    """
    def __init__(self, visible_fields: FieldIdSet, required_fields: FieldIdSet, errors: List[str]):
        is_valid = len(errors) == 0
        super().__init__(
            visible_fields=visible_fields,
            required_fields=required_fields,
            errors=errors,
            is_valid=is_valid
        )
        self.visible_fields = visible_fields
        self.required_fields = required_fields
        self.errors = errors
        self.is_valid = is_valid


def _normalize_key(key: Any) -> str:
    """Normalizes a label or key into snake_case lowercase for matching."""
    return str(key).strip().lower().replace(" ", "_").replace("-", "_")


def _build_field_map(rules, fields=None):
    """
    Builds lookup structures mapping UUIDs, labels, and normalized names to canonical str UUIDs.
    """
    alias_to_id = {}
    id_to_label = {}
    all_fields = set()

    if fields:
        for f in fields:
            fid = str(f.id if hasattr(f, "id") else f["id"])
            flabel = f.label if hasattr(f, "label") else f.get("label", "")
            all_fields.add(fid)
            alias_to_id[fid] = fid
            if flabel:
                id_to_label[fid] = flabel
                alias_to_id[flabel] = fid
                alias_to_id[_normalize_key(flabel)] = fid

    for r in (rules or []):
        trig_id = str(r.trigger_field_id if hasattr(r, "trigger_field_id") else r["trigger_field_id"])
        targ_id = str(r.target_field_id if hasattr(r, "target_field_id") else r["target_field_id"])
        all_fields.add(trig_id)
        all_fields.add(targ_id)
        alias_to_id[trig_id] = trig_id
        alias_to_id[targ_id] = targ_id

        trig_field = getattr(r, "trigger_field", None)
        if trig_field and getattr(trig_field, "label", None):
            lbl = trig_field.label
            id_to_label[trig_id] = lbl
            alias_to_id[lbl] = trig_id
            alias_to_id[_normalize_key(lbl)] = trig_id

        targ_field = getattr(r, "target_field", None)
        if targ_field and getattr(targ_field, "label", None):
            lbl = targ_field.label
            id_to_label[targ_id] = lbl
            alias_to_id[lbl] = targ_id
            alias_to_id[_normalize_key(lbl)] = targ_id

    return alias_to_id, id_to_label, all_fields


def evaluate_condition(operator: str, submitted_value: Any, comparison_value: Any) -> bool:
    """
    Evaluates an individual operator against submitted_value and comparison_value.
    Operators: equals, not_equals, contains, greater_than, is_empty.
    """
    op = (operator or "").strip().lower()

    if op == "equals":
        if submitted_value is None:
            return False
        try:
            # Numeric comparison if both can be type-cast to float
            if float(submitted_value) == float(comparison_value):
                return True
        except (ValueError, TypeError):
            pass
        return str(submitted_value).strip().lower() == str(comparison_value if comparison_value is not None else "").strip().lower()

    elif op == "not_equals":
        if submitted_value is None or submitted_value == "":
            return True
        try:
            if float(submitted_value) == float(comparison_value):
                return False
        except (ValueError, TypeError):
            pass
        return str(submitted_value).strip().lower() != str(comparison_value if comparison_value is not None else "").strip().lower()

    elif op == "contains":
        if submitted_value is None:
            return False
        comp_str = str(comparison_value if comparison_value is not None else "").strip().lower()
        if isinstance(submitted_value, (list, tuple, set)):
            return any(str(item).strip().lower() == comp_str or comp_str in str(item).strip().lower() for item in submitted_value)
        return comp_str in str(submitted_value).strip().lower()

    elif op == "greater_than":
        try:
            return float(submitted_value) > float(comparison_value)
        except (ValueError, TypeError):
            return False

    elif op == "is_empty":
        if submitted_value is None or submitted_value == "":
            return True
        if isinstance(submitted_value, (list, tuple, set, dict)) and len(submitted_value) == 0:
            return True
        return False

    return False


def evaluate_form_rules(rules: List[Any], submitted_data: Dict[str, Any], fields: Optional[List[Any]] = None) -> EvaluationResult:
    """
    Evaluates conditional rules against submitted form responses.
    Returns EvaluationResult containing:
      - visible_fields: Set of field IDs that should be visible.
      - required_fields: Set of field IDs dynamically required by rules.
      - errors: List of validation error strings.
    """
    alias_to_id, id_to_label, all_fields = _build_field_map(rules, fields)

    # Normalize submitted_data keys to canonical str field IDs
    normalized_submissions: Dict[str, Any] = {}
    for raw_key, val in (submitted_data or {}).items():
        key_norm = _normalize_key(raw_key)
        fid = alias_to_id.get(str(raw_key)) or alias_to_id.get(key_norm) or str(raw_key)
        normalized_submissions[fid] = val

    # Determine which fields are targeted by 'show' and 'hide' rules
    show_targets: Set[str] = set()
    hide_targets: Set[str] = set()

    for r in (rules or []):
        act = r.action if hasattr(r, "action") else r["action"]
        targ = str(r.target_field_id if hasattr(r, "target_field_id") else r["target_field_id"])
        if act in ("show", "show_and_require"):
            show_targets.add(targ)
        elif act == "hide":
            hide_targets.add(targ)

    # Default visibility:
    # All fields default to visible, UNLESS targeted by at least one 'show' rule
    # (in which case it defaults to hidden until a 'show' rule evaluates to True).
    visible_ids: Set[str] = set()
    for fid in all_fields:
        if fid not in show_targets:
            visible_ids.add(fid)

    required_ids: Set[str] = set()

    # Evaluate each rule
    for r in (rules or []):
        trig = str(r.trigger_field_id if hasattr(r, "trigger_field_id") else r["trigger_field_id"])
        targ = str(r.target_field_id if hasattr(r, "target_field_id") else r["target_field_id"])
        op = r.operator if hasattr(r, "operator") else r["operator"]
        comp = r.comparison_value if hasattr(r, "comparison_value") else r.get("comparison_value")
        act = r.action if hasattr(r, "action") else r["action"]

        trig_val = normalized_submissions.get(trig)
        met = evaluate_condition(op, trig_val, comp)

        if act == "show":
            if met:
                visible_ids.add(targ)
        elif act == "hide":
            if met:
                visible_ids.discard(targ)
        elif act == "require":
            if met:
                required_ids.add(targ)
        elif act == "show_and_require":
            if met:
                visible_ids.add(targ)
                required_ids.add(targ)

    visible_fields = FieldIdSet(visible_ids, alias_to_id)
    required_fields = FieldIdSet(required_ids, alias_to_id)

    # Validate submissions against conditional states
    errors: List[str] = []

    # 1. Reject submitted values for hidden fields
    for fid, val in normalized_submissions.items():
        if fid not in visible_fields:
            if val is not None and val != "" and val != []:
                label = id_to_label.get(fid, fid)
                errors.append(f"Field '{label}' is hidden by conditional logic and cannot accept values.")

    # 2. Enforce presence for visible conditionally required fields
    for fid in required_ids:
        if fid in visible_fields:
            val = normalized_submissions.get(fid)
            if val is None or val == "" or val == []:
                label = id_to_label.get(fid, fid)
                errors.append(f"Field '{label}' is required by conditional logic.")

    return EvaluationResult(
        visible_fields=visible_fields,
        required_fields=required_fields,
        errors=errors
    )
