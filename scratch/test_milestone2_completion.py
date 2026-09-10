import io
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.conditional_rule import ConditionalRule
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.models.uploaded_file import UploadedFile
from app.core.security import create_access_token
from app.services.conditional_engine import evaluate_form_rules
# validation import removed

client = TestClient(app)

def test_milestone2_completion():
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:8]
    form_id = None
    user = None
    other_user = None

    try:
        # 1. Create test user
        user = User(
            email=f"m2_tester_{unique_suffix}@example.com",
            password_hash="test_hashed_password",
            full_name="Milestone 2 Tester",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id)
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Another user for permission checks
        other_user = User(
            email=f"other_{unique_suffix}@example.com",
            password_hash="test_hashed_password",
            full_name="Other User",
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        other_token = create_access_token(other_user.id)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 2. Test PUT /fields/{field_id} validation_config persistence
        form_res = client.post(
            "/forms",
            json={"title": f"M2 Form {unique_suffix}", "description": "Testing validation_config"},
            headers=auth_headers
        )
        assert form_res.status_code == 201, form_res.text
        form_data = form_res.json()
        form_id = form_data["id"]

        # Add a text field
        field_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "Full Name",
                "field_type": "text",
                "is_required": True,
                "validation_config": {"min_length": 3, "max_length": 20}
            },
            headers=auth_headers
        )
        assert field_res.status_code == 201, field_res.text
        field_id = field_res.json()["id"]

        # Update field with modified validation_config
        update_res = client.put(
            f"/fields/{field_id}",
            json={
                "label": "Full Legal Name",
                "validation_config": {"min_length": 5, "max_length": 30}
            },
            headers=auth_headers
        )
        assert update_res.status_code == 200, update_res.text
        updated_field = update_res.json()
        assert updated_field["validation_config"]["min_length"] == 5
        assert updated_field["validation_config"]["max_length"] == 30

        # Verify persisted in database
        db_field = db.query(Field).filter(Field.id == uuid.UUID(field_id)).first()
        assert db_field.validation_config == {"min_length": 5, "max_length": 30}

        # 3. Test show_and_require composite action in conditional engine
        trigger_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "Employment Status",
                "field_type": "dropdown",
                "options": [{"option_label": "Employed", "option_value": "Employed"}, {"option_label": "Unemployed", "option_value": "Unemployed"}, {"option_label": "Student", "option_value": "Student"}]
            },
            headers=auth_headers
        )
        trigger_id = trigger_res.json()["id"]

        target_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "Company Name",
                "field_type": "text",
                "is_required": False
            },
            headers=auth_headers
        )
        target_id = target_res.json()["id"]

        # Add rule with action="show_and_require"
        rule_res = client.post(
            f"/forms/{form_id}/rules",
            json={
                "trigger_field_id": trigger_id,
                "operator": "equals",
                "comparison_value": "Employed",
                "action": "show_and_require",
                "target_field_id": target_id
            },
            headers=auth_headers
        )
        assert rule_res.status_code == 201, rule_res.text
        rule_data = rule_res.json()
        assert rule_data["action"] == "show_and_require"

        # Case A: Trigger is NOT 'Employed' -> target is hidden and not required
        state_unemployed = evaluate_form_rules(
            rules=[db.query(ConditionalRule).filter(ConditionalRule.id == uuid.UUID(rule_data["id"])).first()],
            submitted_data={trigger_id: "Unemployed"},
            fields=[{"id": field_id}, {"id": trigger_id}, {"id": target_id}]
        )
        assert uuid.UUID(target_id) not in state_unemployed.visible_fields
        assert uuid.UUID(target_id) not in state_unemployed.required_fields

        # Case B: Trigger IS 'Employed' -> target is both visible AND required!
        state_employed = evaluate_form_rules(
            rules=[db.query(ConditionalRule).filter(ConditionalRule.id == uuid.UUID(rule_data["id"])).first()],
            submitted_data={trigger_id: "Employed"},
            fields=[{"id": field_id}, {"id": trigger_id}, {"id": target_id}]
        )
        assert uuid.UUID(target_id) in state_employed.visible_fields
        assert uuid.UUID(target_id) in state_employed.required_fields

        # 4. Test File Upload and Content-Disposition inline for PDF/Images, attachment for others
        pdf_bytes = b"%PDF-1.4 test pdf file contents"
        upload_pdf_res = client.post(
            "/upload",
            files={"file": ("sample_doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )
        assert upload_pdf_res.status_code == 201, upload_pdf_res.text
        pdf_file_id = upload_pdf_res.json()["id"]

        get_pdf_res = client.get(f"/files/{pdf_file_id}")
        assert get_pdf_res.status_code == 200
        assert "inline" in get_pdf_res.headers.get("content-disposition", "")

        img_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        upload_img_res = client.post(
            "/upload",
            files={"file": ("photo.png", io.BytesIO(img_bytes), "image/png")}
        )
        assert upload_img_res.status_code == 201, upload_img_res.text
        img_file_id = upload_img_res.json()["id"]

        get_img_res = client.get(f"/files/{img_file_id}")
        assert get_img_res.status_code == 200
        assert "inline" in get_img_res.headers.get("content-disposition", "")

        txt_bytes = b"Hello world text document"
        upload_txt_res = client.post(
            "/upload",
            files={"file": ("report.docx", io.BytesIO(txt_bytes), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        assert upload_txt_res.status_code == 201
        txt_file_id = upload_txt_res.json()["id"]

        get_txt_res = client.get(f"/files/{txt_file_id}")
        assert get_txt_res.status_code == 200
        assert "attachment" in get_txt_res.headers.get("content-disposition", "")
        assert 'filename="report.docx"' in get_txt_res.headers.get("content-disposition", "")

        # 5. Test Live Submissions API: GET /forms/{form_id}/submissions
        pub_res = client.post(f"/forms/{form_id}/publish", headers=auth_headers)
        assert pub_res.status_code == 200, pub_res.text
        link_res = client.post(f"/forms/{form_id}/generate-link", headers=auth_headers); slug = link_res.json()["share_slug"]

        submit_res = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    field_id: "Alexander Hamilton",
                    trigger_id: "Employed",
                    target_id: "Treasury Corp"
                }
            }
        )
        assert submit_res.status_code in (200, 201), submit_res.text
        submission_payload = submit_res.json()
        assert "response_id" in submission_payload

        # Unauthenticated request -> 401
        unauth_res = client.get(f"/forms/{form_id}/submissions")
        assert unauth_res.status_code == 401

        # Unauthorized request by another user -> 403
        forbidden_res = client.get(f"/forms/{form_id}/submissions", headers=other_headers)
        assert forbidden_res.status_code == 403

        # Authorized request by form creator -> 200
        subs_res = client.get(f"/forms/{form_id}/submissions", headers=auth_headers)
        assert subs_res.status_code == 200, subs_res.text
        subs_data = subs_res.json()
        assert len(subs_data) == 1

        sub_item = subs_data[0]
        assert sub_item["response_id"] == submission_payload["response_id"]
        assert "submitted_at" in sub_item
        assert len(sub_item["answers"]) >= 3

        answers_by_label = {a["field_label"]: a for a in sub_item["answers"]}
        assert answers_by_label["Full Legal Name"]["value"] == "Alexander Hamilton"
        assert answers_by_label["Employment Status"]["value"] == "Employed"
        assert answers_by_label["Company Name"]["value"] == "Treasury Corp"

    finally:
        try:
            db.rollback()
            if form_id:
                client.delete(f"/forms/{form_id}", headers=auth_headers)
            db.query(UploadedFile).filter(UploadedFile.original_name.in_(["sample_doc.pdf", "photo.png", "report.docx"])).delete()
            if user:
                db.query(User).filter(User.id == user.id).delete()
            if other_user:
                db.query(User).filter(User.id == other_user.id).delete()
            db.commit()
        except Exception as e:
            print('Cleanup warning:', e)
        finally:
            db.close()
