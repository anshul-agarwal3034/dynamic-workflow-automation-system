import os
import re
import uuid
from typing import Set
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.uploaded_file import UploadedFile
from app.schemas.uploaded_file import FileUploadResponse

router = APIRouter()

ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5 MB
UPLOAD_DIR: str = os.path.abspath("uploads")


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a file to the local storage, enforces extension whitelist and size limit (max 5 MB),
    and records its metadata in the database.
    """
    orig_filename = os.path.basename(file.filename or "uploaded_file")
    _, ext = os.path.splitext(orig_filename)

    if not ext or ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read file content to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file cannot be empty."
        )

    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Sanitize filename and create unique stored name
    safe_clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", orig_filename)
    stored_name = f"{uuid.uuid4().hex}_{safe_clean}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(content)

    # Save database record
    uploaded_record = UploadedFile(
        original_name=orig_filename,
        stored_name=stored_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type
    )
    db.add(uploaded_record)
    db.commit()
    db.refresh(uploaded_record)

    return FileUploadResponse(
        id=uploaded_record.id,
        original_name=uploaded_record.original_name,
        stored_name=uploaded_record.stored_name,
        file_size=uploaded_record.file_size,
        mime_type=uploaded_record.mime_type,
        download_url=f"/files/{uploaded_record.id}"
    )


@router.get("/files/{file_id}")
def get_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Retrieves and downloads an uploaded file by its unique database ID.
    Validates record and file existence on disk.
    """
    file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )

    if not os.path.exists(file_record.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File missing on disk."
        )

    mime = (file_record.mime_type or "").lower()
    if mime == "application/pdf" or mime.startswith("image/"):
        return FileResponse(
            path=file_record.file_path,
            filename=file_record.original_name,
            media_type=file_record.mime_type,
            content_disposition_type="inline"
        )

    return FileResponse(
        path=file_record.file_path,
        filename=file_record.original_name,
        media_type=file_record.mime_type,
        content_disposition_type="attachment"
    )
