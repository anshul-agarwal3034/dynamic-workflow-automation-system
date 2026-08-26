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
    operator = Column(String(20), nullable=False)

    comparison_value = Column(String(255), nullable=True)

    action = Column(String(20), nullable=False)

   
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
