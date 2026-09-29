import uuid
import time
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.submission import Submission
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate
from app.core.security import create_access_token


def test_analytics_engine_and_sessions():
    db = SessionLocal()
    client = TestClient(app)
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"

        # Auth headers for protected routes
        token = create_access_token(user_id=str(user.id))
        auth_headers = {"Authorization": f"Bearer {token}"}


        # 1. Setup a published form with dropdown and rating fields
        form = create_form_with_version(
            db=db,
            title="Analytics Test Form",
            description="Testing session tracking and analytics engine",
            user_id=user.id
        )
        created_form_ids.append(form.id)
        version = form.versions[0]

        # Field A: Gender (dropdown: "Male", "Female", "Other")
        f_gender = add_field_to_version(db, version.id, FieldCreate(
            label="Gender",
            field_type="dropdown",
            is_required=True
        ))
        opt_male = FieldOption(field_id=f_gender.id, option_label="Male", option_value="Male")
        opt_female = FieldOption(field_id=f_gender.id, option_label="Female", option_value="Female")
        opt_other = FieldOption(field_id=f_gender.id, option_label="Other", option_value="Other")
        db.add_all([opt_male, opt_female, opt_other])

        # Field B: Rating (rating: 1 to 5)
        f_rating = add_field_to_version(db, version.id, FieldCreate(
            label="Overall Satisfaction",
            field_type="rating",
            is_required=True
        ))
        db.commit()

        # Publish the form and assign a unique share slug
        slug = f"test-analytics-{uuid.uuid4().hex[:6]}"
        form.status = "published"
        form.share_slug = slug
        version.is_active = True
        version.published_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(form)

        # 2. Start 3 form sessions via /public/forms/{slug}/start
        res_start1 = client.post(f"/public/forms/{slug}/start")
        assert res_start1.status_code == 200, res_start1.text
        session1 = res_start1.json()
        assert "session_id" in session1
        assert "started_at" in session1

        res_start2 = client.post(f"/public/forms/{slug}/start")
        assert res_start2.status_code == 200
        session2 = res_start2.json()

        res_start3 = client.post(f"/public/forms/{slug}/start")
        assert res_start3.status_code == 200
        session3 = res_start3.json()

        # Brief sleep so duration > 0
        time.sleep(1.0)

        # 3. Submit 2 sessions with mock answers (e.g. Male vs Female). Leave session 3 in progress.
        res_sub1 = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "session_id": session1["session_id"],
                "responses": {
                    str(f_gender.id): "Male",
                    str(f_rating.id): 5
                }
            }
        )
        assert res_sub1.status_code == 200, res_sub1.text
        assert res_sub1.json()["response_id"].startswith("RESP-")

        res_sub2 = client.post(
            f"/public/forms/{slug}/submit",
            json={
                "session_id": session2["session_id"],
                "responses": {
                    str(f_gender.id): "Female",
                    str(f_rating.id): 4
                }
            }
        )
        assert res_sub2.status_code == 200, res_sub2.text

        # 4. Verify DB state of sessions
        sub1 = db.query(Submission).filter(Submission.id == session1["session_id"]).first()
        assert sub1.status == "completed"
        assert sub1.submitted_at is not None
        assert sub1.completion_time_seconds is not None and sub1.completion_time_seconds >= 1

        sub3 = db.query(Submission).filter(Submission.id == session3["session_id"]).first()
        assert sub3.status == "in_progress"
        assert sub3.submitted_at is None

        # 5. Assert GET /forms/{id}/analytics
        res_analytics = client.get(f"/forms/{form.id}/analytics", headers=auth_headers)
        assert res_analytics.status_code == 200, res_analytics.text
        analytics = res_analytics.json()

        assert analytics["total_started"] == 3
        assert analytics["total_completed"] == 2
        assert analytics["drop_off_count"] == 1
        assert analytics["completion_rate"] == 66.7
        assert analytics["average_duration_seconds"] >= 1.0
        assert "sec" in analytics["average_duration_display"]

        # Field distributions checks
        dists = {d["field_id"]: d for d in analytics["field_distributions"]}
        assert str(f_gender.id) in dists
        gender_dist = dists[str(f_gender.id)]
        assert gender_dist["label"] == "Gender"
        assert gender_dist["field_type"] == "dropdown"
        assert gender_dist["total_responses"] == 2

        gender_breakdown = {b["option"]: b for b in gender_dist["breakdown"]}
        assert gender_breakdown["Male"]["count"] == 1
        assert gender_breakdown["Male"]["percentage"] == 50.0
        assert gender_breakdown["Female"]["count"] == 1
        assert gender_breakdown["Female"]["percentage"] == 50.0
        assert gender_breakdown["Other"]["count"] == 0
        assert gender_breakdown["Other"]["percentage"] == 0.0

        # Rating distribution checks
        assert str(f_rating.id) in dists
        rating_dist = dists[str(f_rating.id)]
        assert rating_dist["label"] == "Overall Satisfaction"
        assert rating_dist["field_type"] == "rating"
        assert rating_dist["total_responses"] == 2

        rating_breakdown = {b["option"]: b for b in rating_dist["breakdown"]}
        assert rating_breakdown["5"]["count"] == 1
        assert rating_breakdown["5"]["percentage"] == 50.0
        assert rating_breakdown["4"]["count"] == 1
        assert rating_breakdown["4"]["percentage"] == 50.0
        assert rating_breakdown["1"]["count"] == 0

        # 6. Test version filter and date filter
        res_filtered_ver = client.get(f"/forms/{form.id}/analytics?version_id={version.id}", headers=auth_headers)
        assert res_filtered_ver.status_code == 200
        assert res_filtered_ver.json()["total_started"] == 3

        print("\nAll analytics engine and session tracking tests passed successfully!")

    finally:
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
