from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class FileUploadResponse(BaseModel):
    id: UUID
    original_name: str
    stored_name: str
    file_size: int
    mime_type: Optional[str] = None
    download_url: str

    model_config = ConfigDict(from_attributes=True)
