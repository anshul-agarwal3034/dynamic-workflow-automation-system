import json
import uuid
from datetime import datetime, timezone, timedelta
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
from app.models.response_value import ResponseValue
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate
from app.core.security import create_access_token


def test_response_pagination_and_filtering():
    db = SessionLocal()
    client = TestClient(app)
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"

        # Auth headers
        token = create_access_token(user_id=str(user.id))
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 1. Setup a published form with Department and Comments fields
        form = create_form_with_version(
            db=db,
            title="Pagination & Filter Test Form",
            description="Testing server-side response queries",
            user_id=user.id
        )
        created_form_ids.append(form.id)
        version = form.versions[0]

        # Field: Department (dropdown)
        f_dept = add_field_to_version(db, version.id, FieldCreate(
            label="Department",
            field_type="dropdown",
            is_required=True
        ))
        opt_it = FieldOption(field_id=f_dept.id, option_label="IT", option_value="IT")
        opt_hr = FieldOption(field_id=f_dept.id, option_label="HR", option_value="HR")
        opt_sales = FieldOption(field_id=f_dept.id, option_label="Sales", option_value="Sales")
        db.add_all([opt_it, opt_hr, opt_sales])

        # Field: Notes (text)
        f_notes = add_field_to_version(db, version.id, FieldCreate(
            label="Notes",
            field_type="text",
            is_required=False
        ))
        db.commit()

        # Publish form
        slug = f"test-pag-{uuid.uuid4().hex[:6]}"
        form.status = "published"
        form.share_slug = slug
        version.is_active = True
        version.published_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(form)

        now = datetime.now(timezone.utc)

        # 2. Seed 25 completed submissions with varied departments:
        # 10 IT, 8 HR, 7 Sales
        # Distribute submitted_at times over the past 25 hours
        depts = ["IT"] * 10 + ["HR"] * 8 + ["Sales"] * 7
        for idx, dept in enumerate(depts):
            sub_time = now - timedelta(hours=25 - idx)
            sub = Submission(
                response_id=f"RESP-TEST{idx:04d}",
                form_version_id=version.id,
                status="completed",
                started_at=sub_time - timedelta(minutes=5),
                submitted_at=sub_time,
                completion_time_seconds=300,
                response_data={}
            )
            db.add(sub)
            db.flush()

            rv_dept = ResponseValue(submission_id=sub.id, field_id=f_dept.id, value=dept)
            rv_notes = ResponseValue(submission_id=sub.id, field_id=f_notes.id, value=f"Staff note #{idx} for {dept}")
            db.add_all([rv_dept, rv_notes])

        # Add 3 in-progress submissions
        for idx in range(3):
            sub_prog = Submission(
                response_id=f"RESP-PROG{idx:04d}",
                form_version_id=version.id,
                status="in_progress",
                started_at=now - timedelta(minutes=10),
                submitted_at=None,
                completion_time_seconds=None,
                response_data={}
            )
            db.add(sub_prog)

        db.commit()

        # Test Case 1: page=1, page_size=10 on completed
        res_p1 = client.get(
            f"/forms/{form.id}/responses?page=1&page_size=10&status=completed",
            headers=auth_headers
        )
        assert res_p1.status_code == 200, res_p1.text
        data_p1 = res_p1.json()
        assert data_p1["page"] == 1
        assert data_p1["page_size"] == 10
        assert data_p1["total_count"] == 25
        assert data_p1["total_pages"] == 3
        assert len(data_p1["items"]) == 10
        # Verify answers preview exists
        first_item = data_p1["items"][0]
        assert "answers" in first_item
        assert "answers_map" in first_item
        assert "Department" in first_item["answers_map"]
        assert first_item["status"] == "completed"

        # Test Case 2: page=3, page_size=10 on completed -> returns 5 items
        res_p3 = client.get(
            f"/forms/{form.id}/responses?page=3&page_size=10&status=completed",
            headers=auth_headers
        )
        assert res_p3.status_code == 200
        data_p3 = res_p3.json()
        assert len(data_p3["items"]) == 5
        assert data_p3["page"] == 3

        # Test Case 3: Search filter for "IT"
        res_search_it = client.get(
            f"/forms/{form.id}/responses?search=IT&status=completed",
            headers=auth_headers
        )
        assert res_search_it.status_code == 200
        data_search_it = res_search_it.json()
        assert data_search_it["total_count"] == 10
        for item in data_search_it["items"]:
            assert item["answers_map"]["Department"] == "IT"

        # Test Case 4: Search filter on response_id
        res_search_code = client.get(
            f"/forms/{form.id}/responses?search=TEST0005",
            headers=auth_headers
        )
        assert res_search_code.status_code == 200
        data_code = res_search_code.json()
        assert data_code["total_count"] == 1
        assert data_code["items"][0]["response_id"] == "RESP-TEST0005"

        # Test Case 5: Status filter - "in_progress"
        res_in_progress = client.get(
            f"/forms/{form.id}/responses?status=in_progress",
            headers=auth_headers
        )
        assert res_in_progress.status_code == 200
        data_prog = res_in_progress.json()
        assert data_prog["total_count"] == 3
        for item in data_prog["items"]:
            assert item["status"] == "in_progress"

        # Test Case 6: Date range filter
        # Filter submissions from the last 10 hours
        cutoff = (now - timedelta(hours=10)).isoformat()
        res_date = client.get(
            f"/forms/{form.id}/responses?from_date={cutoff}&status=completed",
            headers=auth_headers
        )
        assert res_date.status_code == 200
        data_date = res_date.json()
        # Should have approximately 10 submissions
        assert data_date["total_count"] == 10

        # Test Case 7: Field filters JSON string ({"Department": "HR"})
        ff_json = json.dumps({"Department": "HR"})
        res_ff = client.get(
            f"/forms/{form.id}/responses?field_filters={ff_json}&status=completed",
            headers=auth_headers
        )
        assert res_ff.status_code == 200
        data_ff = res_ff.json()
        assert data_ff["total_count"] == 8
        for item in data_ff["items"]:
            assert item["answers_map"]["Department"] == "HR"

        # Test Case 8: Ownership check - unauthorized user gets 403
        unauth_user = User(
            email=f"other-{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hash",
            full_name="Other User",
            is_active=True
        )

        db.add(unauth_user)
        db.commit()
        db.refresh(unauth_user)

        other_token = create_access_token(user_id=str(unauth_user.id))
        res_unauth = client.get(
            f"/forms/{form.id}/responses",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert res_unauth.status_code == 403

        # Clean up unauth user
        db.delete(unauth_user)
        db.commit()

        print("\nAll server-side pagination, search, status, and filter tests passed successfully!")

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
