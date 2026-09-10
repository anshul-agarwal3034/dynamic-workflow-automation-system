import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.conditional_rule import ConditionalRule
from app.core.security import create_access_token

client = TestClient(app)

def test_published_form_draft_cloning_and_rule_options_persistence():
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:8]
    form_id = None
    user = None

    try:
        # 1. Create user
        user = User(
            email=f"clonetest_{unique_suffix}@example.com",
            password_hash="test_pw",
            full_name="Clone Tester",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id)
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Create form
        form_res = client.post(
            "/forms",
            json={"title": f"Clone Test Form {unique_suffix}"},
            headers=auth_headers
        )
        assert form_res.status_code == 201, form_res.text
        form_id = form_res.json()["id"]

        # 3. Add Dropdown Field with FieldOptions
        dropdown_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "Role Selection",
                "field_type": "dropdown",
                "options": [
                    {"option_label": "Engineer", "option_value": "eng"},
                    {"option_label": "Designer", "option_value": "des"}
                ]
            },
            headers=auth_headers
        )
        assert dropdown_res.status_code == 201, dropdown_res.text
        dropdown_id = dropdown_res.json()["id"]

        # 4. Add Target Field
        target_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "GitHub Username",
                "field_type": "text",
                "is_required": False
            },
            headers=auth_headers
        )
        assert target_res.status_code == 201, target_res.text
        target_id = target_res.json()["id"]

        # 5. Add Conditional Rule
        rule_res = client.post(
            f"/forms/{form_id}/rules",
            json={
                "trigger_field_id": dropdown_id,
                "operator": "equals",
                "comparison_value": "eng",
                "action": "show",
                "target_field_id": target_id
            },
            headers=auth_headers
        )
        assert rule_res.status_code == 201, rule_res.text

        # 6. Publish the form
        pub_res = client.post(f"/forms/{form_id}/publish", headers=auth_headers)
        assert pub_res.status_code == 200, pub_res.text
        pub_data = pub_res.json()
        assert pub_data["status"] == "published"

        # 7. Add a new field to this published form -> Triggers ensure_draft_version
        # This was previously failing with NameError: name 'FieldOption' is not defined
        add_field_res = client.post(
            f"/forms/{form_id}/fields",
            json={
                "label": "Portfolio Link",
                "field_type": "text",
                "is_required": False
            },
            headers=auth_headers
        )
        assert add_field_res.status_code == 201, add_field_res.text
        new_field_data = add_field_res.json()
        assert new_field_data["label"] == "Portfolio Link"

        # 8. Verify database state for cloned draft version
        form_db = db.query(Form).filter(Form.id == uuid.UUID(form_id)).first()
        assert form_db.status == "draft"
        assert len(form_db.versions) == 2

        versions = sorted(form_db.versions, key=lambda v: v.version_number, reverse=True)
        draft_v2 = versions[0]
        published_v1 = versions[1]

        assert draft_v2.version_number == 2
        assert draft_v2.published_at is None
        assert published_v1.version_number == 1
        assert published_v1.published_at is not None

        # Check fields in draft v2: should have 3 fields (2 cloned + 1 newly added)
        draft_fields = {f.label: f for f in draft_v2.fields}
        assert "Role Selection" in draft_fields
        assert "GitHub Username" in draft_fields
        assert "Portfolio Link" in draft_fields

        # Check options in cloned dropdown
        cloned_dropdown = draft_fields["Role Selection"]
        assert len(cloned_dropdown.options) == 2
        opt_values = {o.option_value for o in cloned_dropdown.options}
        assert opt_values == {"eng", "des"}

        # Check cloned conditional rule in draft v2
        cloned_target = draft_fields["GitHub Username"]
        cloned_rules = db.query(ConditionalRule).filter(
            ConditionalRule.trigger_field_id == cloned_dropdown.id,
            ConditionalRule.target_field_id == cloned_target.id
        ).all()
        assert len(cloned_rules) == 1
        assert cloned_rules[0].operator == "equals"
        assert cloned_rules[0].comparison_value == "eng"
        assert cloned_rules[0].action == "show"

        # 9. Update field in draft v2 via PUT /fields/{id}
        put_res = client.put(
            f"/fields/{cloned_target.id}",
            json={"label": "GitHub Handle / Profile", "is_required": True},
            headers=auth_headers
        )
        assert put_res.status_code == 200, put_res.text
        assert put_res.json()["label"] == "GitHub Handle / Profile"

        print("\nAll draft cloning, FieldOption cloning, and ConditionalRule cloning tests passed!")

    finally:
        try:
            db.rollback()
            if form_id:
                client.delete(f"/forms/{form_id}", headers=auth_headers)
            if user:
                db.query(User).filter(User.id == user.id).delete()
            db.commit()
        except Exception as e:
            print("Cleanup exception:", e)
        finally:
            db.close()
