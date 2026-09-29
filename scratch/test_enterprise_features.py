import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.api.deps import get_db
from app.models.user import User
from app.models.form import Form
from app.core.security import create_access_token

client = TestClient(app)


def test_unique_form_name_constraint():
    # Setup test user
    db: Session = next(get_db())
    user = db.query(User).filter(User.email == "test_unique_user@formpilotx.internal").first()
    if not user:
        from app.core.security import hash_password
        user = User(
            full_name="Unique Tester",
            email="test_unique_user@formpilotx.internal",
            password_hash=hash_password("Secret123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # Clean existing forms for this user
    existing_forms = db.query(Form).filter(Form.created_by == user.id).all()
    for f in existing_forms:
        db.delete(f)
    db.commit()

    # 1. Create first form
    res1 = client.post("/forms", json={"title": "Client Onboarding Survey"}, headers=headers)
    assert res1.status_code == 201
    form1 = res1.json()

    # 2. Create duplicate form with exact same title -> 409
    res2 = client.post("/forms", json={"title": "Client Onboarding Survey"}, headers=headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]

    # 3. Create duplicate with case differences -> 409
    res3 = client.post("/forms", json={"title": "  client onboarding survey  "}, headers=headers)
    assert res3.status_code == 409
    assert "already exists" in res3.json()["detail"]

    # 4. Create second distinct form
    res4 = client.post("/forms", json={"title": "Product Feedback"}, headers=headers)
    assert res4.status_code == 201
    form2 = res4.json()

    # 5. Update form2 title to form1 title -> 409
    res5 = client.put(f"/forms/{form2['id']}", json={"title": "Client Onboarding Survey"}, headers=headers)
    assert res5.status_code == 409

    # 6. Update form2 keeping its own title -> 200
    res6 = client.put(f"/forms/{form2['id']}", json={"title": "Product Feedback"}, headers=headers)
    assert res6.status_code == 200


def test_form_auto_close_limits():
    db: Session = next(get_db())
    user = db.query(User).filter(User.email == "test_autoclose@formpilotx.internal").first()
    if not user:
        from app.core.security import hash_password
        user = User(
            full_name="AutoClose Tester",
            email="test_autoclose@formpilotx.internal",
            password_hash=hash_password("Secret123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # Create form with max_submissions=1 and publish it
    past_date = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    res = client.post(
        "/forms",
        json={
            "title": f"Timed Survey {datetime.now(timezone.utc).timestamp()}",
            "closes_at": past_date,
            "closed_message": "Submissions for this intake closed 2 hours ago."
        },
        headers=headers
    )
    assert res.status_code == 201
    form_data = res.json()

    version_id = form_data["versions"][0]["id"]
    field_res = client.post(
        f"/forms/{form_data['id']}/fields",
        json={"label": "Your Name", "field_type": "text", "is_required": False},
        headers=headers
    )
    assert field_res.status_code == 201

    # Publish form
    pub_res = client.post(f"/forms/{form_data['id']}/publish", headers=headers)
    assert pub_res.status_code == 200

    link_res = client.post(f"/forms/{form_data['id']}/generate-link", headers=headers)
    assert link_res.status_code == 200
    slug = link_res.json()["share_slug"]

    # Check public endpoint returns is_closed=True
    get_pub = client.get(f"/public/forms/{slug}")
    assert get_pub.status_code == 200
    pub_json = get_pub.json()
    assert pub_json["is_closed"] is True
    assert "Submissions for this intake closed" in pub_json["closed_message"]

    # Submit should be rejected with 403
    submit_res = client.post(
        f"/public/forms/{slug}/submit",
        json={"responses": {}}
    )
    assert submit_res.status_code == 403
    assert "Submissions for this intake closed" in submit_res.json()["detail"]
