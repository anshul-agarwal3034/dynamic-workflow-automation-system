import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field


def create_form_with_version(db: Session, title: str, description: str | None, user_id: uuid.UUID) -> Form:
    """
    Creates a Form row and its initial FormVersion (version_number=1, is_active=False, published_at=None)
    in a single atomic transaction.
    """
    db_form = Form(
        title=title.strip(),
        description=description.strip() if description else None,
        status="draft",
        created_by=user_id
    )
    db.add(db_form)
    db.flush()  # Generates db_form.id before creating FormVersion

    db_version = FormVersion(
        form_id=db_form.id,
        version_number=1,
        is_active=False,
        published_at=None
    )
    db.add(db_version)

    db.commit()
    db.refresh(db_form)
    return db_form


def get_form_by_id(db: Session, form_id: uuid.UUID) -> Form | None:
    """
    Fetches a Form by UUID, eager loading its versions and ordered fields.
    """
    return db.query(Form).filter(Form.id == form_id).options(
        joinedload(Form.versions).joinedload(FormVersion.fields).joinedload(Field.options)
    ).first()


def list_forms_by_user(
    db: Session,
    user_id: uuid.UUID,
    search: Optional[str] = None,
    status: Optional[str] = None
) -> List[Form]:
    """
    Lists forms created by the logged-in user with optional title search and status filtering.
    Eager loads versions and fields.
    """
    query = db.query(Form).filter(Form.created_by == user_id).options(
        joinedload(Form.versions).joinedload(FormVersion.fields).joinedload(Field.options)
    )

    if search:
        query = query.filter(Form.title.ilike(f"%{search.strip()}%"))

    if status:
        query = query.filter(Form.status == status.strip())

    return query.order_by(Form.created_at.desc()).all()


def update_form(db: Session, form: Form, title: str | None = None, description: str | None = None) -> Form:
    """
    Updates form title/description and updates updated_at.
    """
    if title is not None:
        form.title = title.strip()
    if description is not None:
        form.description = description.strip() if description else None

    form.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)
    return form


def archive_form(db: Session, form: Form) -> Form:
    """
    Sets form status to 'archived'.
    """
    form.status = "archived"
    form.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)
    return form


def unarchive_form(db: Session, form: Form) -> Form:
    """
    Restores an archived form. If any version was published, restores status to 'published';
    otherwise restores to 'draft'.
    """
    has_published_version = any(v.published_at is not None for v in form.versions)
    form.status = "published" if has_published_version else "draft"
    form.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)
    return form


def delete_form(db: Session, form: Form) -> None:
    """
    Deletes a Form row along with all dependent versions, fields, options, submissions, and responses cleanly in a single transaction.
    """
    from app.models.submission import Submission
    from app.models.response_value import ResponseValue
    from app.models.conditional_rule import ConditionalRule
    from app.models.field import Field
    from app.models.field_option import FieldOption
    from app.models.form_version import FormVersion

    try:
        version_ids = [v.id for v in form.versions]
        if version_ids:
            submissions = db.query(Submission).filter(Submission.form_version_id.in_(version_ids)).all()
            sub_ids = [s.id for s in submissions]
            if sub_ids:
                db.query(ResponseValue).filter(ResponseValue.submission_id.in_(sub_ids)).delete(synchronize_session=False)
                db.query(Submission).filter(Submission.id.in_(sub_ids)).delete(synchronize_session=False)

            db.query(ConditionalRule).filter(
                (ConditionalRule.trigger_field_id.in_(
                    db.query(Field.id).filter(Field.form_version_id.in_(version_ids))
                )) |
                (ConditionalRule.target_field_id.in_(
                    db.query(Field.id).filter(Field.form_version_id.in_(version_ids))
                ))
            ).delete(synchronize_session=False)

            field_ids = [f.id for f in db.query(Field.id).filter(Field.form_version_id.in_(version_ids)).all()]
            if field_ids:
                db.query(FieldOption).filter(FieldOption.field_id.in_(field_ids)).delete(synchronize_session=False)
                db.query(Field).filter(Field.id.in_(field_ids)).delete(synchronize_session=False)

            db.query(FormVersion).filter(FormVersion.id.in_(version_ids)).delete(synchronize_session=False)

        db.delete(form)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e


def publish_form(db: Session, form: Form) -> Form:
    """
    Publishes the active draft FormVersion.
    Requires at least 1 field in the draft version.
    Freezes active version (is_active=True, published_at=now), deactivates older versions,
    and updates form status to 'published'.
    """
    # Sort versions by version_number desc
    sorted_versions = sorted(form.versions, key=lambda v: v.version_number, reverse=True)
    if not sorted_versions:
        raise ValueError("Form version not found.")

    target_version = sorted_versions[0]
    if not target_version.fields:
        raise ValueError("Form must have at least one field before it can be published.")

    # Deactivate older versions
    for v in form.versions:
        v.is_active = False

    target_version.is_active = True
    target_version.published_at = datetime.now(timezone.utc)
    form.status = "published"
    form.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(form)
    return form


def ensure_draft_version(db: Session, form: Form) -> FormVersion:
    """
    Ensures an editable draft version exists. If the latest version is already published,
    spins up a new draft version (version_number + 1) cloned from the published version,
    sets form.status='draft', and returns the new draft version.
    """
    sorted_versions = sorted(form.versions, key=lambda v: v.version_number, reverse=True)
    if not sorted_versions:
        raise ValueError("Form version not found.")

    latest_version = sorted_versions[0]
    if latest_version.published_at is None:
        # Latest version is already a draft
        return latest_version

    # Latest version is published — create a new draft version cloned from latest
    new_version_number = latest_version.version_number + 1
    new_version = FormVersion(
        form_id=form.id,
        version_number=new_version_number,
        is_active=False,
        published_at=None
    )
    db.add(new_version)
    db.flush()

    # Clone fields and options
    for field in latest_version.fields:
        cloned_field = Field(
            form_version_id=new_version.id,
            label=field.label,
            field_type=field.field_type,
            placeholder=field.placeholder,
            is_required=field.is_required,
            display_order=field.display_order,
            validation_config=field.validation_config
        )
        db.add(cloned_field)
        db.flush()

        for opt in field.options:
            cloned_option = FieldOption(
                field_id=cloned_field.id,
                option_label=opt.option_label,
                option_value=opt.option_value,
                display_order=opt.display_order
            )
            db.add(cloned_option)

    form.status = "draft"
    form.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)
    return new_version


def get_form_versions(db: Session, form_id: uuid.UUID) -> List[FormVersion]:
    """
    Fetches all FormVersion records for a form ordered by version_number desc.
    """
    return db.query(FormVersion).filter(FormVersion.form_id == form_id).options(
        joinedload(FormVersion.fields).joinedload(Field.options)
    ).order_by(FormVersion.version_number.desc()).all()


def get_form_version_by_id(db: Session, version_id: uuid.UUID) -> FormVersion | None:
    """
    Fetches a specific FormVersion by ID with fields and options.
    """
    return db.query(FormVersion).filter(FormVersion.id == version_id).options(
        joinedload(FormVersion.fields).joinedload(Field.options)
    ).first()


import secrets

def generate_share_slug(db: Session, form: Form) -> str:
    """
    Generates a unique shareable slug for the form if it does not exist yet.
    """
    if form.share_slug:
        return form.share_slug

    slug = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10].lower()
    form.share_slug = slug
    db.commit()
    db.refresh(form)
    return form.share_slug


def get_form_by_share_slug(db: Session, slug: str) -> Form | None:
    """
    Fetches a Form by its share_slug with eager-loaded versions and fields.
    """
    return db.query(Form).filter(Form.share_slug == slug).options(
        joinedload(Form.versions).joinedload(FormVersion.fields).joinedload(Field.options)
    ).first()

