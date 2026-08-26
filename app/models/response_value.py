import uuid
from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class ResponseValue(Base):
    __tablename__ = "response_values"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )


    field_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fields.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    value = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    submission = relationship("Submission", back_populates="response_values")
    field = relationship("Field", back_populates="response_values")
