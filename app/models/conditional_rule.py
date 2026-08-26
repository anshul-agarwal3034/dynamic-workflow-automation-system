import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ConditionalRule(Base):
    __tablename__ = "conditional_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_field_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False
    )
    target_field_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False
    )
    # Application-level allowed operators: equals, not_equals, contains, greater_than, is_empty
    operator = Column(String(20), nullable=False)

    # comparison_value is nullable because operators like 'is_empty' do not require a comparison value.
    comparison_value = Column(String(255), nullable=True)

    # Application-level allowed actions: show, hide, require
    action = Column(String(20), nullable=False)

    # This table has TWO foreign keys pointing to the "fields" table (trigger_field_id and target_field_id).
    # Explicit foreign_keys=[...] is required on both relationship declarations so SQLAlchemy knows
    # which foreign key column corresponds to which relationship, preventing AmbiguousForeignKeysError.
    trigger_field = relationship(
        "Field",
        foreign_keys=[trigger_field_id],
        back_populates="triggers_rules"
    )
    target_field = relationship(
        "Field",
        foreign_keys=[target_field_id],
        back_populates="targeted_by_rules"
    )
