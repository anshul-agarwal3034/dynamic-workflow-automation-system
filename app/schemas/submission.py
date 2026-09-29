import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class FormSessionStartResponse(BaseModel):
    session_id: uuid.UUID
    started_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionCreate(BaseModel):
    responses: Dict[str, Any] = Field(..., description="Map of field identifier (ID or label) to submitted value")
    completion_time_seconds: Optional[int] = Field(None, description="Time taken to complete the form in seconds")
    session_id: Optional[uuid.UUID] = Field(None, description="Active session ID from form start handshake")


class SubmissionResponse(BaseModel):
    message: str = "Form submitted successfully"
    response_id: str
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BulkDeleteRequest(BaseModel):
    response_ids: list[uuid.UUID] = Field(..., description="List of submission UUIDs to delete")


class BulkDeleteResponse(BaseModel):
    success: bool = True
    deleted_count: int


class RetentionUpdateRequest(BaseModel):
    retention_days: Optional[int] = Field(None, ge=0, description="Auto-purge threshold in days; None or 0 to disable")


class RetentionUpdateResponse(BaseModel):
    success: bool = True
    retention_days: Optional[int]
    purged_count: int = 0


