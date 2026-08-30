from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.form import get_form_by_share_slug
from app.schemas.form import PublicFormResponse

router = APIRouter()


@router.get("/public/forms/{slug}", response_model=PublicFormResponse)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """
    Public endpoint to fetch a published form's schema for respondents.
    No authentication required.
    Returns 404 if slug is invalid or form not published.
    Returns 410 Gone if form has been archived.
    """
    form = get_form_by_share_slug(db=db, slug=slug.strip())
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found."
        )

    if form.status == "archived":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This form has been archived and is no longer accepting responses."
        )

    # Find the active published version (is_active=True or latest published version)
    active_version = next((v for v in form.versions if v.is_active), None)
    if not active_version:
        # Fallback to latest version if published
        published_versions = [v for v in form.versions if v.published_at is not None]
        if published_versions:
            active_version = sorted(published_versions, key=lambda v: v.version_number, reverse=True)[0]

    if not active_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published version of this form was not found."
        )

    # Sort fields by display_order
    sorted_fields = sorted(active_version.fields, key=lambda f: f.display_order)

    return PublicFormResponse(
        id=form.id,
        title=form.title,
        description=form.description,
        status=form.status,
        version_number=active_version.version_number,
        published_at=active_version.published_at,
        fields=sorted_fields
    )
