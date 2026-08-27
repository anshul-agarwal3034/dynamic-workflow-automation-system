import uuid
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.crud.form import (
    create_form_with_version,
    get_form_by_id,
    update_form,
    archive_form
)
from app.crud.field import (
    get_field_by_id,
    add_field_to_version,
    delete_field,
    reorder_fields
)
from app.schemas.form import FormCreate, FormUpdate, FormResponse
from app.schemas.field import FieldCreate, FieldResponse, FieldReorderRequest
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
    Requires ownership (403) and draft status (409).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    # 1. Check ownership first
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this form.")

    # 2. Check draft status
    if form.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only draft forms can be modified.")

    updated = update_form(db=db, form=form, title=payload.title, description=payload.description)
    return get_form_by_id(db, updated.id)


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


@router.post("/forms/{id}/fields", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
def add_field_endpoint(
    id: uuid.UUID,
    payload: FieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Adds a field to the form's active form_version (version_number=1).
    Requires ownership (403) and draft status (409).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    # 1. Check ownership first
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this form.")

    # 2. Check draft status
    if form.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields can only be added to draft forms.")

    if not form.versions:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Form version not found.")

    active_version = form.versions[0]
    field = add_field_to_version(db=db, version_id=active_version.id, field_data=payload)
    return field


@router.delete("/fields/{id}", status_code=status.HTTP_200_OK)
def remove_field_endpoint(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a field by ID.
    Requires ownership of parent form (403) and draft status on parent form (409).
    """
    field = get_field_by_id(db, field_id=id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found.")

    form = field.form_version.form

    # 1. Check ownership first
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete fields from this form.")

    # 2. Check draft status
    if form.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields can only be deleted from draft forms.")

    delete_field(db=db, field=field)
    return {"message": "Field deleted successfully", "field_id": str(id)}


@router.patch("/forms/{id}/reorder-fields", response_model=FormResponse)
def reorder_fields_endpoint(
    id: uuid.UUID,
    payload: Union[FieldReorderRequest, List[dict]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorders fields within a form.
    Accepts either FieldReorderRequest wrapper {"items": [...]} or raw list of {"field_id", "display_order"}.
    Requires ownership (403) and draft status (409).
    """
    form = get_form_by_id(db, form_id=id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")

    # 1. Check ownership first
    if form.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reorder fields in this form.")

    # 2. Check draft status
    if form.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fields can only be reordered in draft forms.")

    # Handle flexible payload shape (wrapper dict vs raw list)
    if isinstance(payload, list):
        items = payload
    elif hasattr(payload, "items"):
        items = payload.items
    else:
        items = []

    reorder_fields(db=db, items=items)
    return get_form_by_id(db, form.id)
