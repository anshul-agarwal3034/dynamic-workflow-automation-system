import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token, hash_password
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate, FieldOptionCreate


def test_conditional_rules_crud_and_validation():
    db = SessionLocal()
    try:
        # 1. Logs in / authenticates a test user
        user = db.query(User).first()
        if not user:
            user = User(
                email="test_rules_user@example.com",
                password_hash=hash_password("Password123!"),
                full_name="Rule Test User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}
        client = TestClient(app)

        print("\n=== STEP 1: Creating Test Form with Dropdown and Number Fields ===")
        # 2. Creates a test form with two fields: "Experience" (Dropdown) and "Years of Experience" (Number)
        form = create_form_with_version(
            db=db,
            title="Conditional Rules Test Form",
            description="Testing conditional rules CRUD and validation",
            user_id=user.id
        )
        version = form.versions[0]

        field_experience = add_field_to_version(
            db=db,
            version_id=version.id,
            field_data=FieldCreate(
                label="Experience",
                field_type="dropdown",
                options=[
                    FieldOptionCreate(option_label="Yes", option_value="Yes", display_order=1),
                    FieldOptionCreate(option_label="No", option_value="No", display_order=2)
                ]
            )
        )

        field_years = add_field_to_version(
            db=db,
            version_id=version.id,
            field_data=FieldCreate(
                label="Years of Experience",
                field_type="number"
            )
        )
        print(f"Created Form ID: {form.id}")
        print(f"Created Experience Field ID: {field_experience.id}")
        print(f"Created Years Field ID: {field_years.id}")

        print("\n=== STEP 2: POST /forms/{form_id}/rules (Experience equals 'Yes' -> show Years of Experience) ===")
        # 3. Calls POST /forms/{form_id}/rules to create a rule (Experience equals "Yes" -> show Years of Experience)
        rule_payload = {
            "trigger_field_id": str(field_experience.id),
            "target_field_id": str(field_years.id),
            "operator": "equals",
            "comparison_value": "Yes",
            "action": "show"
        }
        res_post = client.post(f"/forms/{form.id}/rules", headers=headers, json=rule_payload)
        print(f"POST /forms/{form.id}/rules -> Status {res_post.status_code}")
        assert res_post.status_code == 201, f"Expected 201, got {res_post.status_code}: {res_post.text}"
        rule_data = res_post.json()
        rule_id = rule_data["id"]
        assert rule_data["trigger_field_id"] == str(field_experience.id)
        assert rule_data["target_field_id"] == str(field_years.id)
        assert rule_data["operator"] == "equals"
        assert rule_data["comparison_value"] == "Yes"
        assert rule_data["action"] == "show"
        print(f"Created Rule ID: {rule_id}")

        print("\n=== STEP 3: Self-referencing Rule Rejection Validation ===")
        # 4. Verifies self-referencing rule rejection (returns 422 or 400 when trigger equals target)
        self_ref_payload = {
            "trigger_field_id": str(field_experience.id),
            "target_field_id": str(field_experience.id),
            "operator": "equals",
            "comparison_value": "Yes",
            "action": "show"
        }
        res_self_ref = client.post(f"/forms/{form.id}/rules", headers=headers, json=self_ref_payload)
        print(f"POST /forms/{form.id}/rules (self-referencing) -> Status {res_self_ref.status_code}")
        assert res_self_ref.status_code in [400, 422], f"Expected 400 or 422, got {res_self_ref.status_code}"

        print("\n=== STEP 4: GET /forms/{form_id}/rules ===")
        # 5. Calls GET /forms/{form_id}/rules and asserts the rule is returned
        res_get = client.get(f"/forms/{form.id}/rules", headers=headers)
        print(f"GET /forms/{form.id}/rules -> Status {res_get.status_code}")
        assert res_get.status_code == 200, f"Expected 200, got {res_get.status_code}: {res_get.text}"
        rules_list = res_get.json()
        assert any(r["id"] == rule_id for r in rules_list), "Created rule not found in GET /forms/{id}/rules"
        print(f"Retrieved {len(rules_list)} rules successfully")

        print("\n=== STEP 5: PUT /rules/{rule_id} (Update operator to not_equals) ===")
        # 6. Calls PUT /rules/{rule_id} to update the operator to not_equals and asserts update
        update_payload = {
            "operator": "not_equals"
        }
        res_put = client.put(f"/rules/{rule_id}", headers=headers, json=update_payload)
        print(f"PUT /rules/{rule_id} -> Status {res_put.status_code}")
        assert res_put.status_code == 200, f"Expected 200, got {res_put.status_code}: {res_put.text}"
        updated_rule = res_put.json()
        assert updated_rule["operator"] == "not_equals"
        print(f"Updated Rule Operator: {updated_rule['operator']}")

        print("\n=== STEP 6: DELETE /rules/{rule_id} ===")
        # 7. Calls DELETE /rules/{rule_id} and asserts HTTP 200 and successful removal
        res_delete = client.delete(f"/rules/{rule_id}", headers=headers)
        print(f"DELETE /rules/{rule_id} -> Status {res_delete.status_code}")
        assert res_delete.status_code == 200, f"Expected 200, got {res_delete.status_code}: {res_delete.text}"
        assert res_delete.json().get("message") == "Rule deleted successfully"

        # Verify rule is no longer in list
        res_get_after = client.get(f"/forms/{form.id}/rules", headers=headers)
        assert res_get_after.status_code == 200
        assert not any(r["id"] == rule_id for r in res_get_after.json())
        print("Confirmed rule was successfully removed from form rules list")

        print("\nALL CONDITIONAL RULE TESTS PASSED PERFECTLY!")

    finally:
        db.close()


if __name__ == "__main__":
    test_conditional_rules_crud_and_validation()
