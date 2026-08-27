import uuid
from typing import List
from sqlalchemy.orm import Session, joinedload
from app.models.field import Field
from app.models.field_option import FieldOption
from app.schemas.field import FieldCreate, FieldReorderItem


def get_field_by_id(db: Session, field_id: uuid.UUID) -> Field | None:
    """
    Fetches a Field by UUID, loading options and form_version -> form relationship.
    """
    return db.query(Field).filter(Field.id == field_id).options(
        joinedload(Field.options),
        joinedload(Field.form_version)
    ).first()


def add_field_to_version(db: Session, version_id: uuid.UUID, field_data: FieldCreate) -> Field:
    """
    Creates a new Field attached to the given form_version_id.
    Optionally creates nested FieldOption rows if options are provided.
    """
    db_field = Field(
        form_version_id=version_id,
        label=field_data.label.strip(),
        field_type=field_data.field_type.strip(),
        placeholder=field_data.placeholder.strip() if field_data.placeholder else None,
        is_required=field_data.is_required or False,
        display_order=field_data.display_order or 0,
        validation_config=field_data.validation_config
    )
    db.add(db_field)
    db.flush()

    if field_data.options:
        for opt in field_data.options:
            db_opt = FieldOption(
                field_id=db_field.id,
                option_label=opt.option_label.strip(),
                option_value=opt.option_value.strip(),
                display_order=opt.display_order or 0
            )
            db.add(db_opt)

    db.commit()
    db.refresh(db_field)
    return db_field


def delete_field(db: Session, field: Field) -> None:
    """
    Deletes a Field row. Relying on ON DELETE CASCADE for field_options in DB schema.
    """
    db.delete(field)
    db.commit()


def reorder_fields(db: Session, items: List[FieldReorderItem]) -> None:
    """
    Updates display_order for each field in the provided list.
    """
    for item in items:
        db.query(Field).filter(Field.id == item.field_id).update(
            {"display_order": item.display_order},
            synchronize_session=False
        )
    db.commit()
