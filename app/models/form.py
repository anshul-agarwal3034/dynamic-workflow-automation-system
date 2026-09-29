import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    share_slug = Column(String(100), nullable=True, unique=True, index=True)
    retention_days = Column(Integer, nullable=True, default=None)
    max_submissions = Column(Integer, nullable=True, default=None)
    closes_at = Column(DateTime(timezone=True), nullable=True, default=None)
    closed_message = Column(String(500), nullable=True, default="This form is no longer accepting new submissions.")

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    creator = relationship("User", back_populates="forms")
    versions = relationship("FormVersion", back_populates="form", cascade="all, delete-orphan", passive_deletes=True, order_by="desc(FormVersion.version_number)")
