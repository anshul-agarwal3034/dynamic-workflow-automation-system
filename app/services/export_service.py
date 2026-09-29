import io
import csv
import json
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.models.uploaded_file import UploadedFile
from app.services.analytics_engine import format_duration_display as format_duration


def get_export_fields(db: Session, form: Form, version_id: Optional[uuid.UUID] = None) -> List[Field]:
    """
    Resolves the ordered list of fields to define standard export headers.
    Prefers the specified version_id, or the form's active published version,
    or the latest version.
    """
    version = None
    if version_id:
        version = db.query(FormVersion).filter(
            FormVersion.id == version_id,
            FormVersion.form_id == form.id
        ).first()

    if not version:
        # Check for active published version
        version = db.query(FormVersion).filter(
            FormVersion.form_id == form.id,
            FormVersion.is_active == True
        ).first()

    if not version and form.versions:
        # Fallback to latest version
        version = form.versions[0]

    if not version:
        return []

    return (
        db.query(Field)
        .filter(Field.form_version_id == version.id)
        .order_by(Field.display_order.asc())
        .all()
    )


def generate_csv_export(db: Session, form: Form, version_id: Optional[uuid.UUID] = None) -> io.StringIO:
    """
    Generates an Excel-compatible CSV export buffer (with UTF-8 BOM) containing all
    completed form submissions with dynamic field headers.
    """
    fields = get_export_fields(db, form, version_id)

    # Standard columns followed by dynamic field labels
    headers = ["Response ID", "Submission Date", "Status", "Duration"] + [f.label for f in fields]

    # Query all completed submissions for this form (or specific version)
    query = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == form.id)
        .filter(Submission.status == "completed")
    )
    if version_id:
        query = query.filter(Submission.form_version_id == version_id)

    submissions = query.order_by(Submission.submitted_at.desc()).all()

    # Pre-cache file IDs to original names for rapid resolution
    file_map: Dict[str, str] = {}
    uploaded_files = db.query(UploadedFile).all()
    for uf in uploaded_files:
        file_map[str(uf.id)] = uf.original_name

    csv_buffer = io.StringIO()
    # Write UTF-8 BOM for seamless Microsoft Excel compatibility
    csv_buffer.write('\ufeff')
    writer = csv.writer(csv_buffer)
    writer.writerow(headers)

    for sub in submissions:
        resp_id = sub.response_id or f"RESP-{str(sub.id)[:8].upper()}"
        sub_date = sub.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if sub.submitted_at else ""
        sub_status = sub.status or "completed"
        duration = format_duration(sub.completion_time_seconds) if sub.completion_time_seconds is not None else ""

        # Map field answers by field_id and field_label
        answer_by_id = {}
        for rv in sub.response_values:
            val = rv.value
            fld = rv.field
            fld_type = fld.field_type if fld else "text"

            if isinstance(val, list):
                cell_val = "; ".join(str(x) for x in val)
            elif isinstance(val, dict):
                cell_val = json.dumps(val)
            elif fld_type == "file" and val:
                val_str = str(val).strip()
                cell_val = file_map.get(val_str, val_str)
            else:
                cell_val = str(val) if val is not None else ""

            answer_by_id[str(rv.field_id)] = cell_val

        row = [resp_id, sub_date, sub_status, duration]
        for fld in fields:
            row.append(answer_by_id.get(str(fld.id), ""))

        writer.writerow(row)

    csv_buffer.seek(0)
    return csv_buffer


def generate_json_export(db: Session, form: Form, version_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
    """
    Generates a structured JSON export list containing all completed responses
    with mapped answers keyed by field label.
    """
    fields = get_export_fields(db, form, version_id)
    field_label_map = {str(f.id): f.label for f in fields}

    query = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == form.id)
        .filter(Submission.status == "completed")
    )
    if version_id:
        query = query.filter(Submission.form_version_id == version_id)

    submissions = query.order_by(Submission.submitted_at.desc()).all()

    # Pre-cache file IDs to original names
    file_map: Dict[str, str] = {}
    uploaded_files = db.query(UploadedFile).all()
    for uf in uploaded_files:
        file_map[str(uf.id)] = uf.original_name

    results = []
    for sub in submissions:
        answers = {}
        for rv in sub.response_values:
            fld = rv.field
            label = fld.label if fld else field_label_map.get(str(rv.field_id), f"Field_{str(rv.field_id)[:6]}")
            val = rv.value
            fld_type = fld.field_type if fld else "text"

            if fld_type == "file" and val:
                val_str = str(val).strip()
                answers[label] = {
                    "file_id": val_str,
                    "file_name": file_map.get(val_str, "Uploaded File"),
                    "file_url": f"/files/{val_str}"
                }
            else:
                answers[label] = val

        results.append({
            "response_id": sub.response_id or f"RESP-{str(sub.id)[:8].upper()}",
            "submission_id": str(sub.id),
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            "status": sub.status or "completed",
            "duration_seconds": sub.completion_time_seconds,
            "answers": answers
        })

    return results
