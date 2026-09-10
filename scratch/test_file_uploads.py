import io
import os
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.uploaded_file import UploadedFile
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate


def test_file_upload_and_retrieval():
    client = TestClient(app)
    db = SessionLocal()
    created_file_records = []
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"

        # 1. Valid PDF upload -> 201 Created
        pdf_content = b"%PDF-1.4 dummy pdf binary content for testing FormPilotX file upload"
        pdf_file = io.BytesIO(pdf_content)

        res_upload = client.post(
            "/upload",
            files={"file": ("sample_document.pdf", pdf_file, "application/pdf")}
        )
        assert res_upload.status_code == 201
        upload_data = res_upload.json()
        assert "id" in upload_data
        assert upload_data["original_name"] == "sample_document.pdf"
        assert upload_data["file_size"] == len(pdf_content)
        assert upload_data["mime_type"] == "application/pdf"
        assert upload_data["download_url"] == f"/files/{upload_data['id']}"

        file_id = upload_data["id"]
        created_file_records.append(file_id)

        # Verify record in DB
        db_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        assert db_file is not None
        assert db_file.original_name == "sample_document.pdf"
        assert os.path.exists(db_file.file_path)

        # 2. Disallowed extension -> 400 Bad Request
        exe_file = io.BytesIO(b"MZ executable content")
        res_bad_ext = client.post(
            "/upload",
            files={"file": ("malicious.exe", exe_file, "application/x-msdownload")}
        )
        assert res_bad_ext.status_code == 400
        assert "not allowed" in res_bad_ext.json()["detail"].lower()

        # 3. Oversized file (> 5 MB) -> 413 Payload Too Large
        large_content = b"A" * (5 * 1024 * 1024 + 1024)  # 5 MB + 1 KB
        large_file = io.BytesIO(large_content)
        res_large = client.post(
            "/upload",
            files={"file": ("large_image.jpg", large_file, "image/jpeg")}
        )
        assert res_large.status_code == 413
        assert "exceeds maximum allowed size" in res_large.json()["detail"].lower()

        # 4. Valid file retrieval via GET /files/{id}
        res_get = client.get(f"/files/{file_id}")
        assert res_get.status_code == 200
        assert res_get.content == pdf_content
        assert "application/pdf" in res_get.headers.get("content-type", "")

        # 5. Non-existent file retrieval -> 404 Not Found
        random_uuid = str(uuid.uuid4())
        res_not_found = client.get(f"/files/{random_uuid}")
        assert res_not_found.status_code == 404

        # 6. Form submission with file field
        form = create_form_with_version(
            db=db,
            title="Resume Submission Form",
            description="Testing file submission",
            user_id=user.id
        )
        created_form_ids.append(form.id)
        version = form.versions[0]

        f_resume = add_field_to_version(db, version.id, FieldCreate(
            label="Resume File",
            field_type="file",
            is_required=True
        ))

        # Publish form
        slug = f"test-file-{uuid.uuid4().hex[:6]}"
        form.status = "published"
        form.share_slug = slug
        version.published_at = form.created_at
        db.commit()

        # Missing required file field -> 422
        res_sub_missing = client.post(
            f"/public/forms/{slug}/submit",
            json={"responses": {}}
        )
        assert res_sub_missing.status_code == 422

        # Valid submission with file ID
        res_sub_valid = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_resume.id): file_id
                },
                "completion_time_seconds": 20
            }
        )
        assert res_sub_valid.status_code == 200
        sub_data = res_sub_valid.json()
        assert "response_id" in sub_data

        # Verify persisted submission & response value
        saved_sub = db.query(Submission).filter(Submission.response_id == sub_data["response_id"]).first()
        assert saved_sub is not None

        resp_val = db.query(ResponseValue).filter(
            ResponseValue.submission_id == saved_sub.id,
            ResponseValue.field_id == f_resume.id
        ).first()
        assert resp_val is not None
        assert resp_val.value == file_id

        print("\nAll file upload and retrieval tests passed successfully!")

    finally:
        # Cleanup files on disk and DB
        for fid in created_file_records:
            try:
                rec = db.query(UploadedFile).filter(UploadedFile.id == fid).first()
                if rec:
                    if os.path.exists(rec.file_path):
                        os.remove(rec.file_path)
                    db.delete(rec)
                    db.commit()
            except Exception:
                pass

        for form_id in created_form_ids:
            try:
                f = db.query(Form).filter(Form.id == form_id).first()
                if f:
                    db.delete(f)
                    db.commit()
            except Exception:
                pass

        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
