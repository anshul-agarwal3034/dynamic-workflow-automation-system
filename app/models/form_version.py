import uuid
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class FormVersion(Base):
    __tablename__ = "form_versions"

    __table_args__ = (
        UniqueConstraint("form_id", "version_number", name="uq_form_versions_form_id_version_number"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id = Column(
        UUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False
    )
    version_number = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    form = relationship("Form", back_populates="versions")
    fields = relationship("Field", back_populates="form_version")
    submissions = relationship("Submission", back_populates="form_version")
