import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate

def test_publish_flow():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No user found in DB")
            return

        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}
        client = TestClient(app)

        print("\n=== Testing API POST /forms/{id}/publish ===")

        # 1. Create a draft form with at least one field
        form = create_form_with_version(db, title="Publish Flow Test Form", description="Testing publish notification flow", user_id=user.id)
        version = form.versions[0]
        field = add_field_to_version(db, version_id=version.id, field_data=FieldCreate(
            label="Name Question",
            field_type="text",
            is_required=True
        ))
        print(f"Created Draft Form ID: {form.id}, initial status: {form.status}")

        # 2. Publish form via API endpoint
        pub_res = client.post(f"/forms/{form.id}/publish", headers=headers)
        print(f"POST /forms/{form.id}/publish -> Status {pub_res.status_code}")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        print(f"Updated Form status: {pub_data['status']}")
        assert pub_data['status'] == 'published'

        # 3. Generate share link via API endpoint
        link_res = client.post(f"/forms/{form.id}/generate-link", headers=headers)
        print(f"POST /forms/{form.id}/generate-link -> Status {link_res.status_code}, Data: {link_res.json()}")
        assert link_res.status_code == 200
        link_data = link_res.json()
        assert 'share_url' in link_data and 'share_slug' in link_data

        print("\nPUBLISH FLOW TEST PASSED PERFECTLY!")

    except Exception as e:
        print(f"PUBLISH FLOW TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_publish_flow()
