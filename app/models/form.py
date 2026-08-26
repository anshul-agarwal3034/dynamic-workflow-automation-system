import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Status values ('draft', 'published', 'archived') are handled at the application level.
    status = Column(String(20), nullable=False, default="draft")

    # RESTRICT prevents deleting a user if forms created by that user exist in the system.
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
    # NOTE: onupdate=func.now() is a SQLAlchemy ORM-level behavior, NOT a database trigger.
    # It only updates the timestamp when SQLAlchemy issues the UPDATE through a modified ORM object in a session.
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    creator = relationship("User", back_populates="forms")
    versions = relationship("FormVersion", back_populates="form")
