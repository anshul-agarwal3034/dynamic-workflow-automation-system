import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.submission import Submission
from app.models.audit_log import AuditLog
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate
from app.core.security import create_access_token


def test_bulk_forms_delete_endpoint():
    db = SessionLocal()
    client = TestClient(app)
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"
        user_id = user.id

        token = create_access_token(user_id=str(user_id))
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Create 3 test forms
        f1 = create_form_with_version(
            db=db,
            title="Bulk Test Form 1",
            description="Form 1 for bulk delete",
            user_id=user_id
        )
        created_form_ids.append(f1.id)
        v1 = f1.versions[0]
        fld1 = add_field_to_version(db, v1.id, FieldCreate(label="Question 1", field_type="text"))
        sub1 = Submission(form_version_id=v1.id, status="completed")
        db.add(sub1)

        f2 = create_form_with_version(
            db=db,
            title="Bulk Test Form 2",
            description="Form 2 for bulk delete",
            user_id=user_id
        )
        created_form_ids.append(f2.id)
        v2 = f2.versions[0]
        fld2 = add_field_to_version(db, v2.id, FieldCreate(label="Question 2", field_type="number"))
        sub2 = Submission(form_version_id=v2.id, status="completed")
        db.add(sub2)

        f3 = create_form_with_version(
            db=db,
            title="Bulk Test Form 3 (Keep)",
            description="Form 3 should NOT be deleted",
            user_id=user_id
        )
        created_form_ids.append(f3.id)
        db.commit()

        # Store IDs as raw UUIDs
        f1_id = f1.id
        f2_id = f2.id
        f3_id = f3.id
        v1_id = v1.id
        sub1_id = sub1.id

        # Call POST /forms/bulk-delete with f1 and f2
        delete_payload = {
            "form_ids": [str(f1_id), str(f2_id)]
        }
        res = client.post("/forms/bulk-delete", json=delete_payload, headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["success"] is True
        assert data["deleted_count"] == 2
        assert "Successfully deleted 2 forms" in data["message"]

        # Verify database state using a fresh session
        db.close()
        db = SessionLocal()

        f1_check = db.query(Form).filter(Form.id == f1_id).first()
        f2_check = db.query(Form).filter(Form.id == f2_id).first()
        f3_check = db.query(Form).filter(Form.id == f3_id).first()

        assert f1_check is None, "Form 1 should have been deleted"
        assert f2_check is None, "Form 2 should have been deleted"
        assert f3_check is not None, "Form 3 should remain intact"

        # Verify cascades: submissions and versions should be gone
        v1_check = db.query(FormVersion).filter(FormVersion.id == v1_id).first()
        assert v1_check is None, "Form 1 version should have cascaded"
        sub1_check = db.query(Submission).filter(Submission.id == sub1_id).first()
        assert sub1_check is None, "Form 1 submission should have cascaded"

        # Verify audit log entry
        audit = db.query(AuditLog).filter(
            AuditLog.user_id == user_id,
            AuditLog.action == "bulk_delete_forms",
            AuditLog.resource_type == "form"
        ).order_by(AuditLog.created_at.desc()).first()

        assert audit is not None, "Audit log entry should have been created"
        assert audit.details.get("deleted_count") == 2
        assert str(f1_id) in audit.details.get("form_ids")
        assert str(f2_id) in audit.details.get("form_ids")

        # Test empty or non-matching form IDs
        res_empty = client.post("/forms/bulk-delete", json={"form_ids": [str(uuid.uuid4())]}, headers=auth_headers)
        assert res_empty.status_code == 200
        assert res_empty.json()["deleted_count"] == 0

    finally:
        # Cleanup any remaining test forms
        for fid in created_form_ids:
            rem = db.query(Form).filter(Form.id == fid).first()
            if rem:
                # cascade delete
                v_ids = [v.id for v in db.query(FormVersion.id).filter(FormVersion.form_id == fid).all()]
                if v_ids:
                    db.query(Submission).filter(Submission.form_version_id.in_(v_ids)).delete(synchronize_session=False)
                    db.query(FormVersion).filter(FormVersion.form_id == fid).delete(synchronize_session=False)
                db.delete(rem)
        db.commit()
        db.close()
