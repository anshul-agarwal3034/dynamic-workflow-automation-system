import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class FieldOption(Base):
    __tablename__ = "field_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    option_label = Column(String(255), nullable=False)
    option_value = Column(String(255), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)

    # Relationships
    field = relationship("Field", back_populates="options")
