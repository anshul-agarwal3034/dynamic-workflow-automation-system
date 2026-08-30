import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FieldOptionCreate(BaseModel):
    option_label: str
    option_value: str
    display_order: Optional[int] = 0


class FieldOptionResponse(BaseModel):
    id: uuid.UUID
    field_id: uuid.UUID
    option_label: str
    option_value: str
    display_order: int

    class Config:
        from_attributes = True


class FieldCreate(BaseModel):
    label: str
    field_type: str
    placeholder: Optional[str] = None
    is_required: Optional[bool] = False
    display_order: Optional[int] = 0
    validation_config: Optional[Dict[str, Any]] = None
    options: Optional[List[FieldOptionCreate]] = None


class FieldUpdate(BaseModel):
    label: Optional[str] = None
    placeholder: Optional[str] = None
    is_required: Optional[bool] = None
    display_order: Optional[int] = None
    options: Optional[List[FieldOptionCreate]] = None


class FieldResponse(BaseModel):
    id: uuid.UUID
    form_version_id: uuid.UUID
    label: str
    field_type: str
    placeholder: Optional[str] = None
    is_required: bool
    display_order: int
    validation_config: Optional[Dict[str, Any]] = None
    options: List[FieldOptionResponse] = []

    class Config:
        from_attributes = True


class FieldReorderItem(BaseModel):
    field_id: uuid.UUID
    display_order: int


class FieldReorderRequest(BaseModel):
    items: List[FieldReorderItem]
