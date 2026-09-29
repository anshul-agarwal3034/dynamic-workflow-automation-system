import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(String(30), unique=True, nullable=True, index=True)

    form_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now()
    )
    submitted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )
    status = Column(
        String(50),
        nullable=False,
        default='completed',
        server_default='completed'
    )
    completion_time_seconds = Column(Integer, nullable=True)
    response_data = Column(JSONB, nullable=True, default=dict)

    form_version = relationship("FormVersion", back_populates="submissions")
    response_values = relationship("ResponseValue", back_populates="submission", cascade="all, delete-orphan", passive_deletes=True)

