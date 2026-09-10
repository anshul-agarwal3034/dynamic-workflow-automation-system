from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class SubmissionCreate(BaseModel):
    responses: Dict[str, Any] = Field(..., description="Map of field identifier (ID or label) to submitted value")
    completion_time_seconds: Optional[int] = Field(None, description="Time taken to complete the form in seconds")


class SubmissionResponse(BaseModel):
    message: str = "Form submitted successfully"
    response_id: str
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
