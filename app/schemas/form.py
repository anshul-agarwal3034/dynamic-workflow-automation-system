import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.field import FieldResponse
from app.schemas.conditional_rule import ConditionalRuleResponse


class FormCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class FormVersionResponse(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    version_number: int
    is_active: bool
    published_at: Optional[datetime] = None
    fields: List[FieldResponse] = []

    model_config = ConfigDict(from_attributes=True)


class FormVersionSummaryResponse(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    version_number: int
    is_active: bool
    published_at: Optional[datetime] = None
    field_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FormResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: str
    share_slug: Optional[str] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    versions: List[FormVersionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ShareLinkResponse(BaseModel):
    share_slug: str
    share_url: str


class PublicFormResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: str
    version_number: int
    published_at: Optional[datetime] = None
    fields: List[FieldResponse] = []
    rules: List[ConditionalRuleResponse] = []

    model_config = ConfigDict(from_attributes=True)

