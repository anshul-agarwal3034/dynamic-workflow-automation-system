import uuid
from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    form_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    completion_time_seconds = Column(Integer, nullable=True)

    form_version = relationship("FormVersion", back_populates="submissions")
    response_values = relationship("ResponseValue", back_populates="submission", cascade="all, delete-orphan", passive_deletes=True)
