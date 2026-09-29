import csv
import io
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
from app.models.audit_log import AuditLog
from app.crud.form import create_form_with_version
from app.crud.field import add_field_to_version
from app.schemas.field import FieldCreate
from app.core.security import create_access_token


def test_export_bulk_management_and_retention():
    db = SessionLocal()
    client = TestClient(app)
    created_form_ids = []

    try:
        user = db.query(User).first()
        assert user is not None, "A user must exist in the database for tests"

        # Auth headers
        token = create_access_token(user_id=str(user.id))
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 1. Setup a published form with Text, Dropdown, and Checkbox fields
        form = create_form_with_version(
            db=db,
            title="Export & Retention Test Form",
            description="Testing CSV/JSON export, bulk deletion, and retention policy",
            user_id=user.id
        )
        created_form_ids.append(form.id)
        version = form.versions[0]

        # Field 1: Full Name (text)
        f_name = add_field_to_version(db, version.id, FieldCreate(
            label="Full Name",
            field_type="text",
            is_required=True
        ))

        # Field 2: Role (dropdown)
        f_role = add_field_to_version(db, version.id, FieldCreate(
            label="Role",
            field_type="dropdown",
            is_required=True
        ))
        opt_dev = FieldOption(field_id=f_role.id, option_label="Developer", option_value="Developer")
        opt_des = FieldOption(field_id=f_role.id, option_label="Designer", option_value="Designer")
        db.add_all([opt_dev, opt_des])

        # Field 3: Skills (checkbox)
        f_skills = add_field_to_version(db, version.id, FieldCreate(
            label="Skills",
            field_type="checkbox",
            is_required=False
        ))
        opt_py = FieldOption(field_id=f_skills.id, option_label="Python", option_value="Python")
        opt_sql = FieldOption(field_id=f_skills.id, option_label="SQL", option_value="SQL")
        opt_figma = FieldOption(field_id=f_skills.id, option_label="Figma", option_value="Figma")
        db.add_all([opt_py, opt_sql, opt_figma])

        # Publish version
        version.is_active = True
        version.published_at = datetime.now(timezone.utc)
        form.status = "published"
        db.commit()

        # 2. Seed 5 completed submissions with staggered dates
        now = datetime.now(timezone.utc)
        sub_specs = [
            {"days_ago": 15, "name": "Alice Sharma", "role": "Developer", "skills": ["Python", "SQL"], "dur": 120},
            {"days_ago": 12, "name": "Bob Verma", "role": "Designer", "skills": ["Figma"], "dur": 90},
            {"days_ago": 8, "name": "Charlie Roy", "role": "Developer", "skills": ["Python"], "dur": 150},
            {"days_ago": 3, "name": "David Gupta", "role": "Developer", "skills": ["SQL"], "dur": 60},
            {"days_ago": 0, "name": "Eva Nair", "role": "Designer", "skills": ["Figma", "SQL"], "dur": 110},
        ]

        seeded_subs = []
        for i, spec in enumerate(sub_specs):
            sub_time = now - timedelta(days=spec["days_ago"], hours=i + 1)
            start_time = sub_time - timedelta(seconds=spec["dur"])

            sub = Submission(
                response_id=f"RESP-EXP-{i+1:04d}",
                form_version_id=version.id,
                started_at=start_time,
                submitted_at=sub_time,
                status="completed",
                completion_time_seconds=spec["dur"],
                response_data={"index": i + 1}
            )
            db.add(sub)
            db.flush()

            rv_name = ResponseValue(submission_id=sub.id, field_id=f_name.id, value=spec["name"])
            rv_role = ResponseValue(submission_id=sub.id, field_id=f_role.id, value=spec["role"])
            rv_skills = ResponseValue(submission_id=sub.id, field_id=f_skills.id, value=spec["skills"])
            db.add_all([rv_name, rv_role, rv_skills])

            seeded_subs.append(sub)

        db.commit()
        assert len(seeded_subs) == 5

        # -------------------------------------------------------------
        # TEST 1: CSV Export
        # -------------------------------------------------------------
        res_csv = client.get(f"/forms/{form.id}/export/csv", headers=auth_headers)
        assert res_csv.status_code == 200, f"CSV export failed: {res_csv.text}"
        assert "text/csv" in res_csv.headers["content-type"]
        assert f"responses_{form.id}.csv" in res_csv.headers["content-disposition"]

        csv_content = res_csv.content.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        assert len(rows) == 6, f"Expected 1 header + 5 rows, got {len(rows)}"

        headers = rows[0]
        assert "Response ID" in headers
        assert "Submission Date" in headers
        assert "Status" in headers
        assert "Duration" in headers
        assert "Full Name" in headers
        assert "Role" in headers
        assert "Skills" in headers

        # Verify joined list data
        alice_row = next((r for r in rows[1:] if "Alice Sharma" in r), None)
        assert alice_row is not None
        assert "Python; SQL" in alice_row or "SQL; Python" in alice_row

        # -------------------------------------------------------------
        # TEST 2: JSON Export
        # -------------------------------------------------------------
        res_json = client.get(f"/forms/{form.id}/export/json", headers=auth_headers)
        assert res_json.status_code == 200, f"JSON export failed: {res_json.text}"
        json_data = res_json.json()
        assert isinstance(json_data, list)
        assert len(json_data) == 5

        first_item = json_data[0]
        assert "response_id" in first_item
        assert "submitted_at" in first_item
        assert "status" in first_item
        assert "duration_seconds" in first_item
        assert "answers" in first_item
        assert "Full Name" in first_item["answers"]
        assert "Role" in first_item["answers"]
        assert "Skills" in first_item["answers"]

        # -------------------------------------------------------------
        # TEST 3: Individual Response Detail Endpoint (GET /responses/{id})
        # -------------------------------------------------------------
        target_sub = seeded_subs[0]
        res_single = client.get(f"/responses/{target_sub.id}", headers=auth_headers)
        assert res_single.status_code == 200, f"Get response detail failed: {res_single.text}"
        single_data = res_single.json()
        assert single_data["id"] == str(target_sub.id)
        assert single_data["response_id"] == target_sub.response_id
        assert single_data["status"] == "completed"
        assert len(single_data["answers"]) == 3
        ans_labels = [a["field_label"] for a in single_data["answers"]]
        assert "Full Name" in ans_labels
        assert "Role" in ans_labels
        assert "Skills" in ans_labels

        # -------------------------------------------------------------
        # TEST 4: Bulk Delete Endpoint (POST /forms/{id}/responses/bulk-delete)
        # -------------------------------------------------------------
        # Delete David (sub 3) and Eva (sub 4)
        del_ids = [str(seeded_subs[3].id), str(seeded_subs[4].id)]
        res_bulk_del = client.post(
            f"/forms/{form.id}/responses/bulk-delete",
            json={"response_ids": del_ids},
            headers=auth_headers
        )
        assert res_bulk_del.status_code == 200, f"Bulk delete failed: {res_bulk_del.text}"
        bulk_del_data = res_bulk_del.json()
        assert bulk_del_data["success"] is True
        assert bulk_del_data["deleted_count"] == 2

        # Check database: 3 submissions should remain
        remaining_subs = (
            db.query(Submission)
            .join(FormVersion, Submission.form_version_id == FormVersion.id)
            .filter(FormVersion.form_id == form.id)
            .all()
        )
        assert len(remaining_subs) == 3

        # Check Audit Log for bulk delete
        audit_del = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "bulk_delete_responses",
                AuditLog.resource_id == str(form.id)
            )
            .order_by(AuditLog.created_at.desc())
            .first()
        )
        assert audit_del is not None
        assert audit_del.user_id == user.id
        assert audit_del.details["deleted_count"] == 2

        # -------------------------------------------------------------
        # TEST 5: Retention Policy & Auto-Purge (PUT /forms/{id}/retention)
        # -------------------------------------------------------------
        # Currently 3 submissions remain:
        # - Alice: 15 days ago (older than 10 days -> should purge)
        # - Bob: 12 days ago (older than 10 days -> should purge)
        # - Charlie: 8 days ago (newer than 10 days -> should survive)
        res_retention = client.put(
            f"/forms/{form.id}/retention",
            json={"retention_days": 10},
            headers=auth_headers
        )
        assert res_retention.status_code == 200, f"Set retention failed: {res_retention.text}"
        retention_data = res_retention.json()
        assert retention_data["success"] is True
        assert retention_data["retention_days"] == 10
        assert retention_data["purged_count"] == 2, f"Expected 2 purged, got {retention_data['purged_count']}"

        # Verify only Charlie remains in DB
        after_purge_subs = (
            db.query(Submission)
            .join(FormVersion, Submission.form_version_id == FormVersion.id)
            .filter(FormVersion.form_id == form.id)
            .all()
        )
        assert len(after_purge_subs) == 1
        assert after_purge_subs[0].id == seeded_subs[2].id  # Charlie Roy

        # Check Audit Log for retention policy update and purge
        audit_retention = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "update_retention",
                AuditLog.resource_id == str(form.id)
            )
            .first()
        )
        assert audit_retention is not None
        assert audit_retention.details["retention_days"] == 10

        audit_purge = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "purge_expired_responses",
                AuditLog.resource_id == str(form.id)
            )
            .first()
        )
        assert audit_purge is not None
        assert audit_purge.details["purged_count"] == 2

    finally:
        from sqlalchemy import text
        for fid in created_form_ids:
            try:
                db.execute(text("DELETE FROM audit_logs WHERE resource_id = :fid"), {"fid": str(fid)})
                db.execute(text("""
                    DELETE FROM response_values WHERE submission_id IN (
                        SELECT s.id FROM submissions s
                        JOIN form_versions v ON s.form_version_id = v.id
                        WHERE v.form_id = :fid
                    )
                """), {"fid": str(fid)})
                db.execute(text("""
                    DELETE FROM submissions WHERE form_version_id IN (
                        SELECT id FROM form_versions WHERE form_id = :fid
                    )
                """), {"fid": str(fid)})
                db.execute(text("""
                    DELETE FROM field_options WHERE field_id IN (
                        SELECT f.id FROM fields f
                        JOIN form_versions v ON f.form_version_id = v.id
                        WHERE v.form_id = :fid
                    )
                """), {"fid": str(fid)})
                db.execute(text("""
                    DELETE FROM fields WHERE form_version_id IN (
                        SELECT id FROM form_versions WHERE form_id = :fid
                    )
                """), {"fid": str(fid)})
                db.execute(text("DELETE FROM form_versions WHERE form_id = :fid"), {"fid": str(fid)})
                db.execute(text("DELETE FROM forms WHERE id = :fid"), {"fid": str(fid)})
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Cleanup notice for form {fid}: {e}")
        db.close()
