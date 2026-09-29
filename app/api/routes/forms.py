from datetime import datetime, timezone, timedelta
import json
import uuid
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.services.analytics_engine import calculate_form_analytics
from app.services.submission_query_service import get_paginated_form_responses
from app.services.export_service import generate_csv_export, generate_json_export


from app.crud.form import (
    create_form_with_version,
    get_form_by_id,
    list_forms_by_user,
    update_form,
    archive_form,
    unarchive_form,
    delete_form,
    publish_form,
    ensure_draft_version,
    get_form_versions,
    get_form_version_by_id,
    generate_share_slug
)
from app.crud.field import (
    get_field_by_id,
    add_field_to_version,
    update_field_in_version,
    delete_field,
    reorder_fields
)
from app.schemas.form import (
    FormCreate,
    FormUpdate,
    FormResponse,
    FormVersionResponse,
    FormVersionSummaryResponse,
    ShareLinkResponse,
    BulkFormDeleteRequest,
    BulkFormDeleteResponse
)
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse, FieldReorderRequest
from app.schemas.conditional_rule import (
    ConditionalRuleCreate,
    ConditionalRuleUpdate,
    ConditionalRuleResponse
)
from app.schemas.submission import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    RetentionUpdateRequest,
    RetentionUpdateResponse
)
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.conditional_rule import ConditionalRule
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.models.uploaded_file import UploadedFile
from app.models.audit_log import AuditLog

router = APIRouter()


@router.post("/forms", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new form and auto-creates its initial FormVersion (version_number=1, status='draft')
    in a single atomic transaction. Enforces unique case-insensitive title per tenant/workspace.
    """
    existing = db.query(Form).filter(
        func.lower(Form.title) == func.lower(payload.title.strip()),
        Form.created_by == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A form with this title already exists in your workspace."
        )

    form = create_form_with_version(
        db=db,
        title=payload.title,
        description=payload.description,
        user_id=current_user.id,
        max_submissions=payload.max_submissions,
        closes_at=payload.closes_at,
        closed_message=payload.closed_message
    )
    return get_form_by_id(db, form.id)


@router.get("/forms", response_model=List[FormResponse])
def list_forms(
    search: Optional[str] = Query(None, description="Case-insensitive partial match on title"),
    status_filter: Optional[str] = Query(None, alias="status", description="Exact match on status (draft|published|archived)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all forms created by the logged-in user with optional title search and status filtering.
    """
    return list_forms_by_user(db=db, user_id=current_user.id, search=search, status=status_filter)


@router.get("/forms/{id}", response_model=FormResponse)
def get_form(id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves a form by ID along with its versions and fields.
    Requires authentication. Read-only access is allowed for any authenticated user.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found."
        )
    return form


@router.put("/forms/{id}", response_model=FormResponse)
def update_form_endpoint(
    id: uuid.UUID,
    payload: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates form title, description, and availability settings.
    Requires ownership (403) and draft status (or published, which clones to a new draft).
    Enforces unique case-insensitive title per tenant/workspace.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Archived forms cannot be modified.")

    if payload.title:
        existing = db.query(Form).filter(
            func.lower(Form.title) == func.lower(payload.title.strip()),
            Form.created_by == current_user.id,
            Form.id != id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A form with this title already exists in your workspace."
            )

    if form.status == "published":
        ensure_draft_version(db, form)

    updated = update_form(
        db=db,
        form=form,
        title=payload.title,
        description=payload.description,
        max_submissions=payload.max_submissions,
        closes_at=payload.closes_at,
        closed_message=payload.closed_message,
        fields_set=payload.model_fields_set
    )
    return get_form_by_id(db, updated.id)


@router.post("/forms/{id}/publish", response_model=FormResponse)
def publish_form_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Publishes the active draft FormVersion.
    Requires ownership (403) and at least 1 field in the form version (400).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to publish this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Archived forms cannot be published.")

    try:
        publish_form(db=db, form=form)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    return get_form_by_id(db, form.id)


@router.get("/forms/{id}/versions", response_model=List[FormVersionSummaryResponse])
def list_form_versions_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all historical FormVersion records for a form.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view version history.")

    versions = get_form_versions(db=db, form_id=id)
    result = []
    for v in versions:
        result.append(
            FormVersionSummaryResponse(
                id=v.id,
                form_id=v.form_id,
                version_number=v.version_number,
                is_active=v.is_active,
                published_at=v.published_at,
                field_count=len(v.fields)
            )
        )
    return result


@router.get("/forms/{id}/versions/{version_id}", response_model=FormVersionResponse)
def get_form_version_detail_endpoint(
    id: uuid.UUID,
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the exact read-only field schema and options for a historical version snapshot.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this version.")

    version = get_form_version_by_id(db=db, version_id=version_id)
    if not version or version.form_id != id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form version not found.")

    return version


@router.post("/forms/{id}/generate-link", response_model=ShareLinkResponse)
def generate_share_link_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a unique shareable slug/URL for the published form.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to generate share link for this form.")

    slug = generate_share_slug(db=db, form=form)
    share_url = f"http://127.0.0.1:8000/app/public/index.html#/public/forms/{slug}"
    return ShareLinkResponse(share_slug=slug, share_url=share_url)


@router.patch("/forms/{id}/archive", response_model=FormResponse)
def archive_form_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archives a form (sets status='archived').
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to archive this form.")

    archived = archive_form(db=db, form=form)
    return get_form_by_id(db, archived.id)


@router.patch("/forms/{id}/unarchive", response_model=FormResponse)
def unarchive_form_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restores an archived form back to 'published' (if active version exists) or 'draft'.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to unarchive this form.")

    unarchived = unarchive_form(db=db, form=form)
    return get_form_by_id(db, unarchived.id)


@router.post("/forms/bulk-delete", response_model=BulkFormDeleteResponse)
def bulk_delete_forms_endpoint(
    payload: BulkFormDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently deletes multiple forms owned by the current user in a single transaction.
    Cleans up all child submissions, rules, options, fields, versions, and records an audit log entry.
    """
    if not payload.form_ids:
        return BulkFormDeleteResponse(
            success=True,
            deleted_count=0,
            message="No matching forms found"
        )

    # 1. Query matching forms owned by current_user
    forms = (
        db.query(Form)
        .filter(Form.id.in_(payload.form_ids))
        .filter(Form.created_by == current_user.id)
        .all()
    )

    if not forms:
        return BulkFormDeleteResponse(
            success=True,
            deleted_count=0,
            message="No matching forms found"
        )

    form_uuids = [f.id for f in forms]
    deleted_form_ids = [str(fid) for fid in form_uuids]
    deleted_count = len(deleted_form_ids)

    try:
        # Step A: Delete versions' child submissions & response values
        all_version_ids = [
            vid for (vid,) in db.query(FormVersion.id).filter(FormVersion.form_id.in_(form_uuids)).all()
        ]
        if all_version_ids:
            sub_ids = [
                sid for (sid,) in db.query(Submission.id).filter(Submission.form_version_id.in_(all_version_ids)).all()
            ]
            if sub_ids:
                db.query(ResponseValue).filter(ResponseValue.submission_id.in_(sub_ids)).delete(synchronize_session=False)
                db.query(Submission).filter(Submission.id.in_(sub_ids)).delete(synchronize_session=False)

            # Step B: Delete conditional rules
            field_id_subq = db.query(Field.id).filter(Field.form_version_id.in_(all_version_ids))
            db.query(ConditionalRule).filter(
                (ConditionalRule.trigger_field_id.in_(field_id_subq)) |
                (ConditionalRule.target_field_id.in_(field_id_subq))
            ).delete(synchronize_session=False)

            # Step C: Delete field options and fields
            all_field_ids = [fid for (fid,) in field_id_subq.all()]
            if all_field_ids:
                db.query(FieldOption).filter(FieldOption.field_id.in_(all_field_ids)).delete(synchronize_session=False)
                db.query(Field).filter(Field.id.in_(all_field_ids)).delete(synchronize_session=False)

            # Step D: Delete form versions
            db.query(FormVersion).filter(FormVersion.id.in_(all_version_ids)).delete(synchronize_session=False)

        # Step E: Delete forms
        for form in forms:
            db.delete(form)

        # Step F: AuditLog entry
        audit_entry = AuditLog(
            user_id=current_user.id,
            action="bulk_delete_forms",
            resource_type="form",
            resource_id=None,
            details={
                "deleted_count": deleted_count,
                "form_ids": deleted_form_ids
            }
        )
        db.add(audit_entry)
        db.commit()

        return BulkFormDeleteResponse(
            success=True,
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} forms"
        )
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database deletion error: {str(e)}")


@router.delete("/forms/{id}", status_code=200)
def delete_form_endpoint(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Validate UUID
        try:
            target_uuid = str(uuid.UUID(id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid form ID format")

        # 1. Verify form exists and belongs to current user
        form_check = db.execute(
            text("SELECT id FROM forms WHERE id = :form_id AND created_by = :user_id"),
            {"form_id": target_uuid, "user_id": str(current_user.id)}
        ).fetchone()

        if not form_check:
            raise HTTPException(status_code=404, detail="Form not found or unauthorized")

        # 2. Delete all child records in strict dependency order via SQL
        # Step A: Delete response_values belonging to any submission of any version of this form
        db.execute(text("""
            DELETE FROM response_values 
            WHERE submission_id IN (
                SELECT s.id FROM submissions s
                JOIN form_versions v ON s.form_version_id = v.id
                WHERE v.form_id = :form_id
            )
        """), {"form_id": target_uuid})

        # Step B: Delete submissions
        db.execute(text("""
            DELETE FROM submissions 
            WHERE form_version_id IN (
                SELECT id FROM form_versions WHERE form_id = :form_id
            )
        """), {"form_id": target_uuid})

        # Step C: Delete conditional_rules linked to fields in this form
        db.execute(text("""
            DELETE FROM conditional_rules
            WHERE trigger_field_id IN (
                SELECT f.id FROM fields f
                JOIN form_versions v ON f.form_version_id = v.id
                WHERE v.form_id = :form_id
            ) OR target_field_id IN (
                SELECT f.id FROM fields f
                JOIN form_versions v ON f.form_version_id = v.id
                WHERE v.form_id = :form_id
            )
        """), {"form_id": target_uuid})

        # Step D: Delete field_options
        db.execute(text("""
            DELETE FROM field_options 
            WHERE field_id IN (
                SELECT f.id FROM fields f
                JOIN form_versions v ON f.form_version_id = v.id
                WHERE v.form_id = :form_id
            )
        """), {"form_id": target_uuid})

        # Step E: Delete fields
        db.execute(text("""
            DELETE FROM fields 
            WHERE form_version_id IN (
                SELECT id FROM form_versions WHERE form_id = :form_id
            )
        """), {"form_id": target_uuid})

        # Step F: Delete form_versions
        db.execute(text("""
            DELETE FROM form_versions WHERE form_id = :form_id
        """), {"form_id": target_uuid})

        # Step G: Delete the form itself
        db.execute(text("""
            DELETE FROM forms WHERE id = :form_id
        """), {"form_id": target_uuid})

        db.commit()
        return {"success": True, "message": "Form permanently deleted"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database deletion error: {str(e)}")



@router.post("/forms/{id}/fields", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
def add_field_endpoint(
    id: uuid.UUID,
    payload: FieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Adds a field to the form's active draft version.
    If form is published, automatically clones a new draft version.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields cannot be added to archived forms.")

    draft_version = ensure_draft_version(db=db, form=form)
    field = add_field_to_version(db=db, version_id=draft_version.id, field_data=payload)
    return field


@router.put("/fields/{id}", response_model=FieldResponse)
def update_field_endpoint(
    id: uuid.UUID,
    payload: FieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates an existing field (label, placeholder, is_required, choices).
    If parent form is published, clones a new draft version first.
    """
    field = get_field_by_id(db, field_id=id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found.")

    form = field.form_version.form

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit fields in this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields cannot be updated in archived forms.")

    if form.status == "published":
        draft_version = ensure_draft_version(db=db, form=form)
        matching_field = next((f for f in draft_version.fields if f.label == field.label and f.display_order == field.display_order), None)
        if matching_field:
            return update_field_in_version(db=db, field=matching_field, field_data=payload)

    return update_field_in_version(db=db, field=field, field_data=payload)


@router.delete("/fields/{field_id}", status_code=200)
def delete_field_route(
    field_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        f_uuid = str(uuid.UUID(field_id))
        
        # Delete dependent responses, rules, options first
        db.execute(text("DELETE FROM response_values WHERE field_id = :f_id"), {"f_id": f_uuid})
        db.execute(text("DELETE FROM conditional_rules WHERE trigger_field_id = :f_id OR target_field_id = :f_id"), {"f_id": f_uuid})
        db.execute(text("DELETE FROM field_options WHERE field_id = :f_id"), {"f_id": f_uuid})
        db.execute(text("DELETE FROM fields WHERE id = :f_id"), {"f_id": f_uuid})
        
        db.commit()
        return {"success": True, "message": "Field deleted"}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/forms/{id}/reorder-fields", response_model=FormResponse)
def reorder_fields_endpoint(
    id: uuid.UUID,
    payload: Union[FieldReorderRequest, List[dict]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorders fields within a form.
    If form is published, clones to a new draft version first.
    Requires ownership (403).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reorder fields in this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields cannot be reordered in archived forms.")

    if form.status == "published":
        ensure_draft_version(db=db, form=form)
        form = get_form_by_id(db, form_id=id)

    # Handle flexible payload shape (wrapper dict vs raw list)
    if isinstance(payload, list):
        items = payload
    elif hasattr(payload, "items"):
        items = payload.items
    else:
        items = []

    reorder_fields(db=db, items=items)
    return get_form_by_id(db, form.id)


@router.post("/forms/{id}/rules", response_model=ConditionalRuleResponse, status_code=status.HTTP_201_CREATED)
def create_conditional_rule(
    id: uuid.UUID,
    payload: ConditionalRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a conditional rule for fields belonging to this form.
    Validates form ownership and verifies both trigger and target fields belong to the form.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add rules to this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rules cannot be added to archived forms.")

    # Validate that both trigger_field_id and target_field_id belong to the given form
    trigger_field = db.query(Field).join(FormVersion).filter(
        Field.id == payload.trigger_field_id,
        FormVersion.form_id == form.id
    ).first()

    target_field = db.query(Field).join(FormVersion).filter(
        Field.id == payload.target_field_id,
        FormVersion.form_id == form.id
    ).first()

    if not trigger_field or not target_field:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both trigger_field_id and target_field_id must belong to this form."
        )

    rule = ConditionalRule(
        trigger_field_id=payload.trigger_field_id,
        target_field_id=payload.target_field_id,
        operator=payload.operator,
        comparison_value=payload.comparison_value,
        action=payload.action
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/forms/{id}/rules", response_model=List[ConditionalRuleResponse])
def get_form_rules(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all conditional rules associated with the fields of this form.
    Requires form ownership.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view rules for this form.")

    rules = db.query(ConditionalRule).join(
        Field, ConditionalRule.trigger_field_id == Field.id
    ).join(
        FormVersion, Field.form_version_id == FormVersion.id
    ).filter(
        FormVersion.form_id == form.id
    ).all()
    return rules


@router.put("/rules/{rule_id}", response_model=ConditionalRuleResponse)
def update_conditional_rule(
    rule_id: uuid.UUID,
    payload: ConditionalRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates an existing conditional rule.
    Requires rule existence and ownership via parent field/form.
    """
    rule = db.query(ConditionalRule).filter(ConditionalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")

    if not rule.trigger_field or not rule.trigger_field.form_version or not rule.trigger_field.form_version.form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form associated with this rule not found.")

    form = rule.trigger_field.form_version.form
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this rule.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Archived forms cannot be modified.")

    new_trigger_id = payload.trigger_field_id if payload.trigger_field_id is not None else rule.trigger_field_id
    new_target_id = payload.target_field_id if payload.target_field_id is not None else rule.target_field_id

    if new_trigger_id == new_target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A field cannot target itself: trigger_field_id cannot equal target_field_id."
        )

    if payload.trigger_field_id is not None:
        tf = db.query(Field).join(FormVersion).filter(Field.id == payload.trigger_field_id, FormVersion.form_id == form.id).first()
        if not tf:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trigger field does not belong to this form.")
        rule.trigger_field_id = payload.trigger_field_id

    if payload.target_field_id is not None:
        tgf = db.query(Field).join(FormVersion).filter(Field.id == payload.target_field_id, FormVersion.form_id == form.id).first()
        if not tgf:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target field does not belong to this form.")
        rule.target_field_id = payload.target_field_id

    if payload.operator is not None:
        rule.operator = payload.operator
    if payload.comparison_value is not None:
        rule.comparison_value = payload.comparison_value
    if payload.action is not None:
        rule.action = payload.action

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_conditional_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes an existing conditional rule.
    Requires rule existence and ownership.
    """
    rule = db.query(ConditionalRule).filter(ConditionalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")

    if not rule.trigger_field or not rule.trigger_field.form_version or not rule.trigger_field.form_version.form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form associated with this rule not found.")

    form = rule.trigger_field.form_version.form
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this rule.")

    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted successfully"}


@router.get("/forms/{form_id}/submissions")
def get_form_submissions(
    form_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all submissions for a given form owned by current_user, ordered by submitted_at DESC.
    Resolves response values, field labels, field types, and file metadata.
    """
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access submissions for this form.")

    # Query all completed submissions for any version of this form
    submissions = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == form_id)
        .filter(Submission.status == 'completed')
        .order_by(Submission.submitted_at.desc())
        .all()
    )


    results = []
    for sub in submissions:
        answers = []
        for rv in sub.response_values:
            fld = rv.field
            field_label = fld.label if fld else "Unknown Field"
            field_type = fld.field_type if fld else "text"
            val = rv.value
            file_name = None
            file_url = None

            # If field is file type or value is a valid file UUID
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

        results.append({
            "submission_id": str(sub.id),
            "response_id": sub.response_id or f"RESP-{str(sub.id)[:8].upper()}",
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            "answers": answers
        })

    return results


@router.get("/forms/{id}/analytics")
def get_form_analytics_endpoint(
    id: uuid.UUID,
    version_id: Optional[uuid.UUID] = Query(None, description="Optional version ID filter"),
    from_date: Optional[datetime] = Query(None, description="Optional start datetime ISO filter"),
    to_date: Optional[datetime] = Query(None, description="Optional end datetime ISO filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves aggregated response metrics and field value distributions for a form.
    Requires ownership of the form.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view analytics for this form.")

    analytics_data = calculate_form_analytics(
        db=db,
        form_id=id,
        version_id=version_id,
        from_date=from_date,
        to_date=to_date
    )
    return analytics_data


@router.get("/forms/{id}/responses")
def get_form_responses(
    id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    from_date: Optional[str] = Query(None, description="Optional start datetime ISO or YYYY-MM-DD filter"),
    to_date: Optional[str] = Query(None, description="Optional end datetime ISO or YYYY-MM-DD filter"),
    field_filters: Optional[str] = None,  # JSON string
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves server-side filtered, searched, and paginated responses for a form.
    Requires ownership of the form.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access responses for this form.")

    parsed_field_filters = None
    if field_filters and field_filters.strip():
        try:
            parsed_field_filters = json.loads(field_filters)
            if not isinstance(parsed_field_filters, dict):
                parsed_field_filters = None
        except Exception:
            parsed_field_filters = None

    return get_paginated_form_responses(
        db=db,
        form_id=id,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
        from_date=from_date,
        to_date=to_date,
        field_filters=parsed_field_filters
    )


@router.get("/forms/{id}/export/csv")
def export_form_responses_csv(
    id: uuid.UUID,
    version_id: Optional[uuid.UUID] = Query(None, description="Optional version filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports all completed responses for a form as an Excel-compatible CSV file (with UTF-8 BOM).
    Requires form creator authorization.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to export responses for this form.")

    csv_buf = generate_csv_export(db, form, version_id=version_id)
    filename = f"responses_{form.id}.csv"
    return StreamingResponse(
        iter([csv_buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/forms/{id}/export/json")
def export_form_responses_json(
    id: uuid.UUID,
    version_id: Optional[uuid.UUID] = Query(None, description="Optional version filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports all completed responses for a form as a structured JSON document.
    Requires form creator authorization.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to export responses for this form.")

    json_data = generate_json_export(db, form, version_id=version_id)
    filename = f"responses_{form.id}.json"
    return JSONResponse(
        content=json_data,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/forms/{id}/responses/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_responses(
    id: uuid.UUID,
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atomically deletes a collection of form responses belonging to the given form.
    Logs the action in audit_logs.
    Requires form creator authorization.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete responses for this form.")

    if not payload.response_ids:
        return BulkDeleteResponse(success=True, deleted_count=0)

    # Query matching submissions belonging to this form
    submissions = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == id)
        .filter(Submission.id.in_(payload.response_ids))
        .all()
    )

    deleted_ids = [sub.id for sub in submissions]
    deleted_count = len(deleted_ids)

    if deleted_count > 0:
        for sub in submissions:
            db.delete(sub)

        audit_entry = AuditLog(
            user_id=current_user.id,
            action="bulk_delete_responses",
            resource_type="form_response",
            resource_id=str(form.id),
            details={
                "deleted_count": deleted_count,
                "response_ids": [str(i) for i in deleted_ids]
            }
        )
        db.add(audit_entry)
        db.commit()

    return BulkDeleteResponse(success=True, deleted_count=deleted_count)


@router.put("/forms/{id}/retention", response_model=RetentionUpdateResponse)
def update_form_retention(
    id: uuid.UUID,
    payload: RetentionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the retention duration policy for a form and purges any expired responses.
    Logs the policy change and any purges in audit_logs.
    Requires form creator authorization.
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to configure retention for this form.")

    retention_val = payload.retention_days if (payload.retention_days and payload.retention_days > 0) else None
    form.retention_days = retention_val

    audit_entry = AuditLog(
        user_id=current_user.id,
        action="update_retention",
        resource_type="form",
        resource_id=str(form.id),
        details={"retention_days": retention_val}
    )
    db.add(audit_entry)

    purged_count = 0
    if retention_val is not None:
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=retention_val)
        expired_subs = (
            db.query(Submission)
            .join(FormVersion, Submission.form_version_id == FormVersion.id)
            .filter(FormVersion.form_id == id)
            .filter(func.coalesce(Submission.submitted_at, Submission.started_at) < cutoff_time)
            .all()
        )
        purged_count = len(expired_subs)
        if purged_count > 0:
            purged_ids = [str(s.id) for s in expired_subs]
            for s in expired_subs:
                db.delete(s)
            purge_audit = AuditLog(
                user_id=current_user.id,
                action="purge_expired_responses",
                resource_type="form_response",
                resource_id=str(form.id),
                details={
                    "purged_count": purged_count,
                    "cutoff": cutoff_time.isoformat(),
                    "response_ids": purged_ids
                }
            )
            db.add(purge_audit)

    db.commit()
    db.refresh(form)
    return RetentionUpdateResponse(
        success=True,
        retention_days=form.retention_days,
        purged_count=purged_count
    )





