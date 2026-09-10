import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.core.security import create_access_token, hash_password
from app.crud.form import create_form_with_version, publish_form
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate, FieldOptionCreate
from app.services.conditional_engine import evaluate_form_rules, evaluate_condition


def test_conditional_evaluation_engine_and_public_api():
    db = SessionLocal()
    try:
        # Authenticate / get user
        user = db.query(User).first()
        if not user:
            user = User(
                email="eval_test_user@example.com",
                password_hash=hash_password("Password123!"),
                full_name="Eval Test User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(user.id)
        headers = {"Authorization": f"Bearer {token}"}
        client = TestClient(app)

        print("\n=== STEP 1: Creating Form with Experience & Years of Experience Fields ===")
        # 1. Creates a form with:
        #    - Field A: "Experience" (Dropdown: "Yes", "No")
        #    - Field B: "Years of Experience" (Number, marked optional initially)
        form = create_form_with_version(
            db=db,
            title="Job Application Form",
            description="Testing conditional logic evaluation on public form",
            user_id=user.id
        )
        version = form.versions[0]

        field_a = add_field_to_version(
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

        field_b = add_field_to_version(
            db=db,
            version_id=version.id,
            field_data=FieldCreate(
                label="Years of Experience",
                field_type="number",
                is_required=False
            )
        )
        print(f"Created Form ID: {form.id}")
        print(f"Field A (Experience) ID: {field_a.id}")
        print(f"Field B (Years of Experience) ID: {field_b.id}")

        print("\n=== STEP 2: Adding Conditional Rule (Experience equals 'Yes' -> show Years of Experience) ===")
        # 2. Adds rule: Experience equals "Yes" -> show Years of Experience.
        rule_payload = {
            "trigger_field_id": str(field_a.id),
            "target_field_id": str(field_b.id),
            "operator": "equals",
            "comparison_value": "Yes",
            "action": "show"
        }
        res_rule = client.post(f"/forms/{form.id}/rules", headers=headers, json=rule_payload)
        assert res_rule.status_code == 201, f"Expected 201, got {res_rule.status_code}: {res_rule.text}"
        created_rule = res_rule.json()
        print(f"Created Rule ID: {created_rule['id']}")

        print("\n=== STEP 3: Publishing the Form & Generating Share Link ===")
        # 3. Publishes the form and gets the shareable public slug.
        pub_res = client.post(f"/forms/{form.id}/publish", headers=headers)
        assert pub_res.status_code == 200, f"Expected 200, got {pub_res.status_code}"

        link_res = client.post(f"/forms/{form.id}/generate-link", headers=headers)
        assert link_res.status_code == 200
        slug = link_res.json()["share_slug"]
        print(f"Published Form Share Slug: {slug}")

        print("\n=== STEP 4: Requesting GET /public/forms/{slug} ===")
        # 4. Requests GET /public/forms/{slug} and asserts that rules contains the rule.
        public_res = client.get(f"/public/forms/{slug}")
        assert public_res.status_code == 200, f"Expected 200, got {public_res.status_code}: {public_res.text}"
        public_data = public_res.json()

        assert "rules" in public_data, "Public form response missing 'rules' field"
        rules = public_data["rules"]
        assert len(rules) >= 1, f"Expected at least 1 rule, got {len(rules)}"
        matched_rule = next((r for r in rules if r["id"] == created_rule["id"]), None)
        assert matched_rule is not None, "Created rule not found in public form response rules list"
        assert matched_rule["trigger_field_id"] == str(field_a.id)
        assert matched_rule["target_field_id"] == str(field_b.id)
        assert matched_rule["operator"] == "equals"
        assert matched_rule["comparison_value"] == "Yes"
        assert matched_rule["action"] == "show"
        print(f"Public API successfully returned {len(rules)} conditional rule(s)")

        print("\n=== STEP 5: Testing Evaluation Logic ===")
        # 5. Tests evaluation logic:
        #    - Evaluates submission {"experience": "No", "years_of_experience": "3"} -> Asserts rejection (hidden field has data).
        #    - Evaluates submission {"experience": "No"} -> Asserts valid.
        #    - Evaluates submission {"experience": "Yes", "years_of_experience": "4"} -> Asserts valid.

        # Case A: {"experience": "No", "years_of_experience": "3"}
        eval_rejection = evaluate_form_rules(
            rules,
            {"experience": "No", "years_of_experience": "3"},
            fields=public_data["fields"]
        )
        print(f"Case A (No, 3) -> is_valid: {eval_rejection.is_valid}, errors: {eval_rejection.errors}")
        assert not eval_rejection.is_valid, "Expected rejection when hidden field has data"
        assert len(eval_rejection.errors) > 0, "Expected errors list to contain error"
        assert str(field_b.id) not in eval_rejection.visible_fields, "Target field should be hidden when condition is not met"

        # Case B: {"experience": "No"}
        eval_valid_no = evaluate_form_rules(
            rules,
            {"experience": "No"},
            fields=public_data["fields"]
        )
        print(f"Case B (No) -> is_valid: {eval_valid_no.is_valid}, errors: {eval_valid_no.errors}")
        assert eval_valid_no.is_valid, f"Expected valid submission, got errors: {eval_valid_no.errors}"
        assert len(eval_valid_no.errors) == 0
        assert str(field_b.id) not in eval_valid_no.visible_fields

        # Case C: {"experience": "Yes", "years_of_experience": "4"}
        eval_valid_yes = evaluate_form_rules(
            rules,
            {"experience": "Yes", "years_of_experience": "4"},
            fields=public_data["fields"]
        )
        print(f"Case C (Yes, 4) -> is_valid: {eval_valid_yes.is_valid}, errors: {eval_valid_yes.errors}")
        assert eval_valid_yes.is_valid, f"Expected valid submission, got errors: {eval_valid_yes.errors}"
        assert len(eval_valid_yes.errors) == 0
        assert str(field_b.id) in eval_valid_yes.visible_fields, "Target field should be visible when condition is met"

        print("\n=== STEP 6: Testing All Operators in Condition Evaluator ===")
        # equals
        assert evaluate_condition("equals", "Yes", "yes") is True
        assert evaluate_condition("equals", "10", 10) is True
        assert evaluate_condition("equals", "No", "Yes") is False

        # not_equals
        assert evaluate_condition("not_equals", "No", "Yes") is True
        assert evaluate_condition("not_equals", "Yes", "Yes") is False

        # contains
        assert evaluate_condition("contains", "Hello World", "world") is True
        assert evaluate_condition("contains", ["Apple", "Banana"], "Apple") is True
        assert evaluate_condition("contains", ["Apple", "Banana"], "Orange") is False

        # greater_than
        assert evaluate_condition("greater_than", 10, 5) is True
        assert evaluate_condition("greater_than", "15.5", "10") is True
        assert evaluate_condition("greater_than", 5, 10) is False

        # is_empty
        assert evaluate_condition("is_empty", None, None) is True
        assert evaluate_condition("is_empty", "", None) is True
        assert evaluate_condition("is_empty", [], None) is True
        assert evaluate_condition("is_empty", "Data", None) is False

        print("\nALL CONDITIONAL EVALUATION TESTS PASSED PERFECTLY!")

    finally:
        db.close()


if __name__ == "__main__":
    test_conditional_evaluation_engine_and_public_api()
