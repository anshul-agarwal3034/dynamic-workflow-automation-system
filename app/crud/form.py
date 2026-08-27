import uuid
from datetime import datetime, timezone
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
