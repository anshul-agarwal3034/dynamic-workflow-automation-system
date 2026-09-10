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
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate


def test_submissions_end_to_end():
    db = SessionLocal()
    client = TestClient(app)
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"

        # 1. Setup a published form with fields and conditional logic
        form = create_form_with_version(
            db=db,
            title="E2E Submission Test Form",
            description="Testing Form Submissions",
            user_id=user.id
        )
        created_form_ids.append(form.id)
        version = form.versions[0]

        # Field A: "Feedback Type" (dropdown: "Bug", "Feature")
        f_type = add_field_to_version(db, version.id, FieldCreate(
            label="Feedback Type",
            field_type="dropdown",
            is_required=True
        ))
        opt_bug = FieldOption(field_id=f_type.id, option_label="Bug Report", option_value="Bug")
        opt_feat = FieldOption(field_id=f_type.id, option_label="Feature Request", option_value="Feature")
        db.add_all([opt_bug, opt_feat])
        db.commit()

        # Field B: "Bug Steps" (text, min_length=5, hidden unless Feedback Type == "Bug")
        f_steps = add_field_to_version(db, version.id, FieldCreate(
            label="Bug Steps",
            field_type="text",
            is_required=False,
            validation_config={"min_length": 5}
        ))

        # Field C: "User Email" (email, required)
        f_email = add_field_to_version(db, version.id, FieldCreate(
            label="User Email",
            field_type="email",
            is_required=True
        ))

        # Conditional Rule: IF Feedback Type == "Bug" THEN SHOW Bug Steps
        rule = ConditionalRule(
            trigger_field_id=f_type.id,
            target_field_id=f_steps.id,
            operator="equals",
            comparison_value="Bug",
            action="show"
        )
        db.add(rule)

        # Publish the form and assign a share slug
        slug = f"test-submit-{uuid.uuid4().hex[:6]}"
        form.status = "published"
        form.share_slug = slug
        version.published_at = form.created_at
        db.commit()

        # Refresh form
        db.refresh(form)

        # Test Case 1: 404 for invalid slug
        res_404 = client.post("/public/forms/nonexistent-slug-xyz/submit", json={"responses": {}})
        assert res_404.status_code == 404
        assert "not found" in res_404.json()["detail"].lower()

        # Test Case 2: 422 when required field (User Email) is missing
        res_req_missing = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Feature"
                }
            }
        )
        assert res_req_missing.status_code == 422
        errors = res_req_missing.json()["detail"]["errors"]
        assert any("User Email" in err or "email" in err.lower() for err in errors.values())

        # Test Case 3: 422 when validation rule fails (invalid email format)
        res_bad_email = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Feature",
                    str(f_email.id): "invalid-email-address"
                }
            }
        )
        assert res_bad_email.status_code == 422
        errors = res_bad_email.json()["detail"]["errors"]
        assert any("valid email address" in err for err in errors.values())

        # Test Case 4: 422 when conditional rule violated (submitting data for hidden field)
        # Feedback Type is "Feature", so "Bug Steps" is hidden!
        res_hidden_val = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Feature",
                    str(f_steps.id): "Step 1, step 2...",
                    str(f_email.id): "test@example.com"
                }
            }
        )
        assert res_hidden_val.status_code == 422
        errors = res_hidden_val.json()["detail"]["errors"]
        assert any("hidden by conditional logic" in err for err in errors.values())

        # Test Case 5: 422 when visible field fails min_length validation
        # Feedback Type is "Bug", so "Bug Steps" is visible, but min_length is 5!
        res_too_short = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Bug",
                    str(f_steps.id): "abc",
                    str(f_email.id): "test@example.com"
                }
            }
        )
        assert res_too_short.status_code == 422
        errors = res_too_short.json()["detail"]["errors"]
        assert any("at least 5 characters" in err for err in errors.values())

        # Test Case 6: 200 for Valid Submission (Feature Request, Bug Steps empty)
        res_valid = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Feature",
                    str(f_email.id): "tester@example.com"
                },
                "completion_time_seconds": 45
            }
        )
        assert res_valid.status_code == 200
        data_valid = res_valid.json()
        assert data_valid["message"] == "Form submitted successfully"
        assert "response_id" in data_valid
        assert data_valid["response_id"].startswith("RESP-")
        assert len(data_valid["response_id"]) == 13  # 'RESP-' + 8 hex characters
        assert "submitted_at" in data_valid

        saved_resp_id = data_valid["response_id"]

        # Test Case 7: Verify DB state for valid submission
        db_sub = db.query(Submission).filter(Submission.response_id == saved_resp_id).first()
        assert db_sub is not None
        assert db_sub.form_version_id == version.id
        assert db_sub.completion_time_seconds == 45

        # Check response_values stored
        values = db.query(ResponseValue).filter(ResponseValue.submission_id == db_sub.id).all()
        assert len(values) == 2
        values_dict = {str(v.field_id): v.value for v in values}
        assert values_dict[str(f_type.id)] == "Feature"
        assert values_dict[str(f_email.id)] == "tester@example.com"
        assert str(f_steps.id) not in values_dict  # Hidden field was not saved

        # Test Case 8: Valid submission with Bug (visible steps)
        res_valid_bug = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Bug",
                    str(f_steps.id): "Crash on clicking submit",
                    str(f_email.id): "dev@example.com"
                },
                "completion_time_seconds": 30
            }
        )
        assert res_valid_bug.status_code == 200
        bug_resp_id = res_valid_bug.json()["response_id"]

        db_bug_sub = db.query(Submission).filter(Submission.response_id == bug_resp_id).first()
        assert db_bug_sub is not None
        bug_values = db.query(ResponseValue).filter(ResponseValue.submission_id == db_bug_sub.id).all()
        assert len(bug_values) == 3
        bug_val_dict = {str(v.field_id): v.value for v in bug_values}
        assert bug_val_dict[str(f_steps.id)] == "Crash on clicking submit"

        # Test Case 9: Archived form rejection (410)
        form.status = "archived"
        db.commit()

        res_archived = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "responses": {
                    str(f_type.id): "Bug",
                    str(f_steps.id): "Crash on clicking submit",
                    str(f_email.id): "dev@example.com"
                }
            }
        )
        assert res_archived.status_code == 410
        assert "archived" in res_archived.json()["detail"].lower()

        print("\nAll submission tests passed successfully!")

    finally:
        # Clean up test forms
        for fid in created_form_ids:
            try:
                f = db.query(Form).filter(Form.id == fid).first()
                if f:
                    db.delete(f)
                    db.commit()
            except Exception:
                pass
        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
