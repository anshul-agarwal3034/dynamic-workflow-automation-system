import uuid
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
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
    ShareLinkResponse
)
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse, FieldReorderRequest
from app.models.user import User

router = APIRouter()


@router.post("/forms", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new form and auto-creates its initial FormVersion (version_number=1, status='draft')
    in a single atomic transaction.
    """
    form = create_form_with_version(
        db=db,
        title=payload.title,
        description=payload.description,
        user_id=current_user.id
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
    Updates form title and description.
    Requires ownership (403) and draft status (or published, which clones to a new draft).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this form.")

    if form.status == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Archived forms cannot be modified.")

    if form.status == "published":
        ensure_draft_version(db, form)

    updated = update_form(db=db, form=form, title=payload.title, description=payload.description)
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
    share_url = f"http://127.0.0.1:8000/pages/react-app.html#/public/forms/{slug}"
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


@router.delete("/forms/{id}", status_code=200)
@router.delete("/api/forms/{id}", status_code=200)
@router.delete("/{id}", status_code=200)
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
@router.delete("/api/fields/{field_id}", status_code=200)
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
