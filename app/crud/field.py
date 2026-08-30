import uuid
from typing import List
from sqlalchemy.orm import Session, joinedload
from app.models.field import Field
from app.models.field_option import FieldOption
from app.schemas.field import FieldCreate, FieldUpdate, FieldReorderItem


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


def update_field_in_version(db: Session, field: Field, field_data: FieldUpdate) -> Field:
    """
    Updates an existing field's properties and replaces options if supplied.
    """
    if field_data.label is not None:
        field.label = field_data.label.strip()
    if field_data.placeholder is not None:
        field.placeholder = field_data.placeholder.strip() if field_data.placeholder else None
    if field_data.is_required is not None:
        field.is_required = field_data.is_required
    if field_data.display_order is not None:
        field.display_order = field_data.display_order

    if field_data.options is not None:
        # Delete existing options and insert new ones
        db.query(FieldOption).filter(FieldOption.field_id == field.id).delete(synchronize_session=False)
        db.flush()
        for idx, opt in enumerate(field_data.options):
            db_opt = FieldOption(
                field_id=field.id,
                option_label=opt.option_label.strip(),
                option_value=opt.option_value.strip(),
                display_order=opt.display_order or (idx + 1)
            )
            db.add(db_opt)

    db.commit()
    db.refresh(field)
    return field


def delete_field(db: Session, field: Field) -> None:
    """
    Deletes a Field row after cleanly removing dependent ResponseValue, ConditionalRule, and FieldOption records.
    """
    from app.models.response_value import ResponseValue
    from app.models.conditional_rule import ConditionalRule
    from app.models.field_option import FieldOption

    try:
        db.query(ResponseValue).filter(ResponseValue.field_id == field.id).delete(synchronize_session=False)
        db.query(ConditionalRule).filter(
            (ConditionalRule.trigger_field_id == field.id) | (ConditionalRule.target_field_id == field.id)
        ).delete(synchronize_session=False)
        db.query(FieldOption).filter(FieldOption.field_id == field.id).delete(synchronize_session=False)
        db.delete(field)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e


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
