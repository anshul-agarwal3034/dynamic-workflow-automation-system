import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Field(Base):
    __tablename__ = "fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    label = Column(String(500), nullable=False)
    field_type = Column(String(50), nullable=False)
    placeholder = Column(String(255), nullable=True)
    is_required = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)
    validation_config = Column(JSONB, nullable=True)

    form_version = relationship("FormVersion", back_populates="fields")
    options = relationship("FieldOption", back_populates="field", cascade="all, delete-orphan", passive_deletes=True)

    triggers_rules = relationship(
        "ConditionalRule",
        foreign_keys="ConditionalRule.trigger_field_id",
        back_populates="trigger_field",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    targeted_by_rules = relationship(
        "ConditionalRule",
        foreign_keys="ConditionalRule.target_field_id",
        back_populates="target_field",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    response_values = relationship("ResponseValue", back_populates="field", cascade="all, delete-orphan", passive_deletes=True)
