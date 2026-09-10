import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.form import get_form_by_share_slug
from app.schemas.form import PublicFormResponse
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.models.conditional_rule import ConditionalRule
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.services.validation_engine import validate_submission_data
from app.services.conditional_engine import _normalize_key, evaluate_form_rules

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

    # Fetch active conditional rules for fields in this version
    active_field_ids = [f.id for f in active_version.fields]
    rules = []
    if active_field_ids:
        rules = db.query(ConditionalRule).filter(
            ConditionalRule.trigger_field_id.in_(active_field_ids),
            ConditionalRule.target_field_id.in_(active_field_ids)
        ).all()

    return PublicFormResponse(
        id=form.id,
        title=form.title,
        description=form.description,
        status=form.status,
        version_number=active_version.version_number,
        published_at=active_version.published_at,
        fields=sorted_fields,
        rules=rules
    )


@router.post("/public/forms/{slug}/submit", response_model=SubmissionResponse, status_code=status.HTTP_200_OK)
def submit_form(
    slug: str,
    payload: SubmissionCreate,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to submit responses to a published form.
    Validates submitted field values and conditional rules, rejecting submissions
    that violate constraints (422) or referencing unpublished/archived forms.
    Creates a new Submission record and corresponding ResponseValue records.
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

    if form.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form is not currently published."
        )

    # Find the active published version
    active_version = next((v for v in form.versions if v.is_active), None)
    if not active_version:
        published_versions = [v for v in form.versions if v.published_at is not None]
        if published_versions:
            active_version = sorted(published_versions, key=lambda v: v.version_number, reverse=True)[0]

    if not active_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published version of this form was not found."
        )

    fields = sorted(active_version.fields, key=lambda f: f.display_order)
    active_field_ids = [f.id for f in fields]
    rules = []
    if active_field_ids:
        rules = db.query(ConditionalRule).filter(
            ConditionalRule.trigger_field_id.in_(active_field_ids),
            ConditionalRule.target_field_id.in_(active_field_ids)
        ).all()

    # Validate submission data against field definitions & conditional rules
    val_result = validate_submission_data(fields, payload.responses, rules=rules)
    if not val_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"errors": val_result.errors, "message": "Validation failed"}
        )

    # Evaluate visible fields to ensure we only save visible responses
    eval_state = evaluate_form_rules(rules, payload.responses, fields=fields)
    visible_fids = {str(fid) for fid in eval_state.visible_fields}

    # Generate unique response_id: RESP-XXXXXXXX
    response_id = f"RESP-{uuid.uuid4().hex[:8].upper()}"

    submission = Submission(
        response_id=response_id,
        form_version_id=active_version.id,
        completion_time_seconds=payload.completion_time_seconds
    )
    db.add(submission)
    db.flush()

    # Save response values for answered, visible fields
    for f in fields:
        fid = str(f.id)
        if fid not in visible_fids:
            continue

        flabel = f.label
        norm_label = _normalize_key(flabel) if flabel else ""

        val = None
        has_val = False
        if fid in payload.responses:
            val = payload.responses[fid]
            has_val = True
        elif flabel and flabel in payload.responses:
            val = payload.responses[flabel]
            has_val = True
        elif norm_label and norm_label in payload.responses:
            val = payload.responses[norm_label]
            has_val = True

        if has_val and val is not None:
            resp_value = ResponseValue(
                submission_id=submission.id,
                field_id=f.id,
                value=val
            )
            db.add(resp_value)

    db.commit()
    db.refresh(submission)

    return SubmissionResponse(
        message="Form submitted successfully",
        response_id=submission.response_id,
        submitted_at=submission.submitted_at
    )

