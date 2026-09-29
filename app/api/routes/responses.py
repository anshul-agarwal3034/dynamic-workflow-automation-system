import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.submission import Submission
from app.models.uploaded_file import UploadedFile
from app.services.analytics_engine import format_duration_display as format_duration

router = APIRouter()


@router.get("/responses/{id}")
def get_response_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches individual submission details by UUID.
    Validates that the authenticated user owns the form associated with the submission.
    Returns metadata, timestamps, duration, and resolved question answers with file metadata.
    """
    sub = db.query(Submission).filter(Submission.id == id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response submission not found."
        )

    form_version = sub.form_version
    if not form_version or not form_version.form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form associated with this response not found."
        )

    form = form_version.form
    if form.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this response."
        )

    answers = []
    for rv in sub.response_values:
        fld = rv.field
        field_label = fld.label if fld else "Unknown Field"
        field_type = fld.field_type if fld else "text"
        val = rv.value
        file_name = None
        file_url = None

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

    duration_secs = sub.completion_time_seconds
    if duration_secs is None and sub.started_at and sub.submitted_at:
        duration_secs = max(0, int((sub.submitted_at - sub.started_at).total_seconds()))

    return {
        "id": str(sub.id),
        "submission_id": str(sub.id),
        "response_id": sub.response_id or f"RESP-{str(sub.id)[:8].upper()}",
        "form_id": str(form.id),
        "form_title": form.title,
        "form_version_id": str(sub.form_version_id),
        "version_number": form_version.version_number if form_version else 1,
        "status": sub.status or "completed",
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
        "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        "completion_time_seconds": duration_secs,
        "completion_time_display": format_duration(duration_secs) if duration_secs is not None else None,
        "answers": answers
    }
