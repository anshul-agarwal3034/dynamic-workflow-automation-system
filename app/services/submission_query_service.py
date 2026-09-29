import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from sqlalchemy import func, or_, distinct, cast, String, select
from sqlalchemy.orm import Session

from app.models.form_version import FormVersion
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.models.field import Field
from app.models.uploaded_file import UploadedFile
from app.services.analytics_engine import format_duration_display


def parse_query_datetime(dt_val: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """
    Parses datetime objects or ISO / YYYY-MM-DD date strings gracefully.
    Handles '+' decoded to spaces in URL query strings.
    """
    if dt_val is None:
        return None
    if isinstance(dt_val, datetime):
        return dt_val
    s = str(dt_val).strip()
    if not s:
        return None
    # If + was decoded as space in URL query parameter
    if " " in s and "+" not in s:
        parts = s.rsplit(" ", 1)
        if len(parts) == 2 and (":" in parts[1] or len(parts[1]) in (2, 4)):
            s = f"{parts[0]}+{parts[1]}"
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except Exception:
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except Exception:
            return None


def get_paginated_form_responses(
    db: Session,
    form_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[Union[datetime, str]] = None,
    to_date: Optional[Union[datetime, str]] = None,
    field_filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes a multi-attribute server-side filtered, searched, and paginated
    query over submissions belonging to a given form.
    """
    # 1. Base query joins Submission with FormVersion
    query = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == form_id)
    )

    # 2. Status filter
    if status and status.strip() and status.strip().lower() != "all":
        query = query.filter(Submission.status == status.strip().lower())

    # 3. Date range filter on submitted_at (fallback to started_at)
    date_col = func.coalesce(Submission.submitted_at, Submission.started_at)
    parsed_from = parse_query_datetime(from_date)
    parsed_to = parse_query_datetime(to_date)

    if parsed_from:
        query = query.filter(date_col >= parsed_from)
    if parsed_to:
        query = query.filter(date_col <= parsed_to)

    # 4. Search filter: matches response_id OR any response_values.value
    if search and search.strip():
        term = f"%{search.strip()}%"
        matching_sub_ids = (
            select(ResponseValue.submission_id)
            .filter(func.cast(ResponseValue.value, String).ilike(term))
        )
        query = query.filter(
            or_(
                Submission.response_id.ilike(term),
                Submission.id.in_(matching_sub_ids)
            )
        )

    # 5. Field filters: e.g. {"Department": "IT"}
    if field_filters and isinstance(field_filters, dict):
        for field_key, target_val in field_filters.items():
            if target_val is not None and str(target_val).strip() != "":
                val_term = f"%{str(target_val).strip()}%"
                matching_field_sub_ids = (
                    select(ResponseValue.submission_id)
                    .join(Field, ResponseValue.field_id == Field.id)
                    .filter(
                        or_(
                            Field.label.ilike(field_key.strip()),
                            cast(Field.id, String) == field_key.strip()
                        ),
                        func.cast(ResponseValue.value, String).ilike(val_term)
                    )
                )
                query = query.filter(Submission.id.in_(matching_field_sub_ids))

    # 6. Total count (distinct submissions)
    total_count = query.with_entities(func.count(distinct(Submission.id))).scalar() or 0

    # 7. Ordering: most recent submissions first (nulls last)
    query = query.order_by(
        Submission.submitted_at.desc().nullslast(),
        Submission.started_at.desc().nullslast()
    )

    # 8. Pagination offset and limit
    safe_page = max(1, page)
    safe_page_size = max(1, min(100, page_size))
    offset = (safe_page - 1) * safe_page_size
    submissions = query.offset(offset).limit(safe_page_size).all()

    # 9. Format response items with resolved answers and metadata
    items: List[Dict[str, Any]] = []
    for sub in submissions:
        answers = []
        answers_map: Dict[str, Any] = {}

        for rv in sub.response_values:
            fld = rv.field
            field_label = fld.label if fld else "Unknown Field"
            field_type = fld.field_type if fld else "text"
            val = rv.value
            file_name = None
            file_url = None

            # File field resolving
            if field_type == "file" and val:
                file_uuid_str = str(val).strip()
                try:
                    f_uuid = uuid.UUID(file_uuid_str)
                    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == f_uuid).first()
                    if uploaded_file:
                        file_name = uploaded_file.original_name
                        file_url = f"/files/{uploaded_file.id}"
                    else:
                        file_name = "Uploaded File"
                        file_url = f"/files/{file_uuid_str}"
                except (ValueError, TypeError):
                    file_name = str(val)
                    file_url = None

            answers.append({
                "field_id": str(rv.field_id),
                "field_label": field_label,
                "field_type": field_type,
                "value": val,
                "file_name": file_name,
                "file_url": file_url
            })
            answers_map[field_label] = val

        duration_sec = sub.completion_time_seconds
        duration_display = format_duration_display(duration_sec)

        items.append({
            "id": str(sub.id),
            "submission_id": str(sub.id),
            "response_id": sub.response_id or f"RESP-{str(sub.id)[:8].upper()}",
            "status": sub.status or "completed",
            "form_version_id": str(sub.form_version_id),
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            "completion_time_seconds": duration_sec,
            "completion_time_display": duration_display,
            "answers": answers,
            "answers_map": answers_map
        })

    total_pages = math.ceil(total_count / safe_page_size) if total_count > 0 else 1

    return {
        "items": items,
        "total_count": total_count,
        "page": safe_page,
        "page_size": safe_page_size,
        "total_pages": total_pages
    }
