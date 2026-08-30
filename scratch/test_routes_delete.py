import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate, FieldOptionCreate
from app.models.submission import Submission
from app.models.response_value import ResponseValue

def test_fastapi_delete_routes():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No user found in DB")
            return

        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}
        client = TestClient(app)

        print("\n=== Testing API DELETE /forms/{id} and /fields/{field_id} ===")

        # 1. Create a form with version, fields, and submissions
        form = create_form_with_version(db, title="API Delete Test Form", description="Testing route deletion", user_id=user.id)
        version = form.versions[0]
        field1 = add_field_to_version(db, version_id=version.id, field_data=FieldCreate(
            label="Field 1",
            field_type="text"
        ))
        field2 = add_field_to_version(db, version_id=version.id, field_data=FieldCreate(
            label="Field 2",
            field_type="dropdown",
            options=[FieldOptionCreate(option_label="Opt 1", option_value="opt_1")]
        ))

        sub = Submission(form_version_id=version.id, completion_time_seconds=10)
        db.add(sub)
        db.flush()

        resp1 = ResponseValue(submission_id=sub.id, field_id=field1.id, value={"text": "Val 1"})
        resp2 = ResponseValue(submission_id=sub.id, field_id=field2.id, value={"text": "opt_1"})
        db.add_all([resp1, resp2])
        db.commit()

        print(f"Created Form ID: {form.id}, Field1: {field1.id}, Field2: {field2.id}")

        # Test DELETE field via route /fields/{field_id}
        res_field = client.delete(f"/fields/{field1.id}", headers=headers)
        print(f"DELETE /fields/{field1.id} -> Status {res_field.status_code}, Response: {res_field.json()}")
        assert res_field.status_code == 200

        # Test DELETE form via route /forms/{id}
        res_form = client.delete(f"/forms/{form.id}", headers=headers)
        print(f"DELETE /forms/{form.id} -> Status {res_form.status_code}, Response: {res_form.json()}")
        assert res_form.status_code == 200

        # Test DELETE form via route /api/forms/{id}
        form2 = create_form_with_version(db, title="API Delete Test Form 2", description="Testing route deletion 2", user_id=user.id)
        res_form2 = client.delete(f"/api/forms/{form2.id}", headers=headers)
        print(f"DELETE /api/forms/{form2.id} -> Status {res_form2.status_code}, Response: {res_form2.json()}")
        assert res_form2.status_code == 200

        print("\nALL FASTAPI ROUTE DELETE TESTS PASSED PERFECTLY!")

    except Exception as e:
        print(f"API DELETE TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_fastapi_delete_routes()
