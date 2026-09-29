import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.api.deps import get_db
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.conditional_rule import ConditionalRule
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.core.security import hash_password, create_access_token


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


def create_test_user(db: Session, email_prefix: str) -> tuple[User, str]:
    unique_id = uuid.uuid4().hex[:6]
    email = f"{email_prefix}_{unique_id}@example.com"
    user = User(
        email=email,
        password_hash=hash_password("ValidPass123!"),
        full_name=f"User {unique_id}",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id))
    return user, token


def test_dashboard_summary_empty_state(client, db_session):
    """
    Brand new user with zero forms should receive clean 0 KPIs and empty lists.
    """
    user, token = create_test_user(db_session, "dash_empty")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/dashboard/summary", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    kpis = data["kpis"]
    assert kpis["active_forms_count"] == 0
    assert kpis["published_forms_count"] == 0
    assert kpis["submissions_today_count"] == 0
    assert kpis["avg_completion_rate"] == 0.0
    assert kpis["active_rules_count"] == 0

    assert data["top_forms"] == []
    assert data["recent_submissions"] == []


def test_dashboard_summary_populated_state(client, db_session):
    """
    User with published/draft forms, rules, and submissions receives exact calculations.
    """
    user, token = create_test_user(db_session, "dash_pop")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Form 1 (Published)
    form1 = Form(
        title="Customer Satisfaction Survey",
        created_by=user.id,
        status="published",
        share_slug=f"csat-{uuid.uuid4().hex[:6]}"
    )
    db_session.add(form1)
    db_session.commit()
    db_session.refresh(form1)

    ver1 = FormVersion(
        form_id=form1.id,
        version_number=1,
        is_active=True,
        published_at=datetime.now(timezone.utc)
    )
    db_session.add(ver1)
    db_session.commit()
    db_session.refresh(ver1)

    # Add fields to Form 1
    f_email = Field(
        form_version_id=ver1.id,
        label="Your Email",
        field_type="email",
        is_required=True,
        display_order=1
    )
    f_rating = Field(
        form_version_id=ver1.id,
        label="Service Rating",
        field_type="number",
        is_required=True,
        display_order=2
    )
    f_feedback = Field(
        form_version_id=ver1.id,
        label="Detailed Feedback",
        field_type="textarea",
        is_required=False,
        display_order=3
    )
    db_session.add_all([f_email, f_rating, f_feedback])
    db_session.commit()
    db_session.refresh(f_email)
    db_session.refresh(f_rating)
    db_session.refresh(f_feedback)

    # Add conditional rule: if rating < 3, show feedback
    rule1 = ConditionalRule(
        trigger_field_id=f_rating.id,
        target_field_id=f_feedback.id,
        operator="equals",
        comparison_value="1",
        action="show"
    )
    db_session.add(rule1)
    db_session.commit()

    # 2. Create Form 2 (Draft)
    form2 = Form(
        title="Internal Team Feedback",
        created_by=user.id,
        status="draft"
    )
    db_session.add(form2)
    db_session.commit()
    db_session.refresh(form2)

    ver2 = FormVersion(
        form_id=form2.id,
        version_number=1,
        is_active=False
    )
    db_session.add(ver2)
    db_session.commit()

    # 3. Create Submissions on Form 1
    # Submission A: completed today
    sub_a = Submission(
        form_version_id=ver1.id,
        response_id=f"RESP-A{uuid.uuid4().hex[:6].upper()}",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
        status="completed",
        completion_time_seconds=75,
        response_data={"your_email": "sarah.connor@cyberdyne.io"}
    )
    db_session.add(sub_a)
    db_session.commit()
    db_session.refresh(sub_a)

    rv_a = ResponseValue(
        submission_id=sub_a.id,
        field_id=f_email.id,
        value="sarah.connor@cyberdyne.io"
    )
    db_session.add(rv_a)

    # Submission B: completed today
    sub_b = Submission(
        form_version_id=ver1.id,
        response_id=f"RESP-B{uuid.uuid4().hex[:6].upper()}",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
        status="completed",
        completion_time_seconds=110,
        response_data={"your_email": "john.doe@matrix.com"}
    )
    db_session.add(sub_b)
    db_session.commit()
    db_session.refresh(sub_b)

    rv_b = ResponseValue(
        submission_id=sub_b.id,
        field_id=f_email.id,
        value="john.doe@matrix.com"
    )
    db_session.add(rv_b)

    # Submission C: in progress (abandoned/not completed)
    sub_c = Submission(
        form_version_id=ver1.id,
        response_id=f"RESP-C{uuid.uuid4().hex[:6].upper()}",
        started_at=datetime.now(timezone.utc),
        submitted_at=None,
        status="in_progress"
    )
    db_session.add(sub_c)
    db_session.commit()

    # Query Dashboard Summary
    res = client.get("/dashboard/summary", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    kpis = data["kpis"]
    assert kpis["active_forms_count"] == 2
    assert kpis["published_forms_count"] == 1
    assert kpis["submissions_today_count"] == 2
    # 2 completed out of 3 started: 2/3 = 66.7%
    assert kpis["avg_completion_rate"] == 66.7
    assert kpis["active_rules_count"] == 1

    # Top forms
    assert len(data["top_forms"]) == 2
    top1 = data["top_forms"][0]
    assert top1["title"] == "Customer Satisfaction Survey"
    assert top1["total_responses"] == 2

    top2 = data["top_forms"][1]
    assert top2["title"] == "Internal Team Feedback"
    assert top2["total_responses"] == 0

    # Recent submissions
    assert len(data["recent_submissions"]) == 3
    # Check that latest submission contains respondent info and duration
    sub_items = {s["reference_code"]: s for s in data["recent_submissions"]}
    assert sub_a.response_id in sub_items
    item_a = sub_items[sub_a.response_id]
    assert item_a["form_title"] == "Customer Satisfaction Survey"
    assert "sarah.connor@cyberdyne.io" in item_a["respondent_identifier"]
    assert item_a["time_taken_seconds"] == 75
    assert item_a["status"] == "Completed"


def test_dashboard_multi_tenant_isolation(client, db_session):
    """
    Metrics for User A should not leak to User B.
    """
    user_a, token_a = create_test_user(db_session, "user_iso_a")
    user_b, token_b = create_test_user(db_session, "user_iso_b")

    # Create form for User A
    form_a = Form(
        title="Secret User A Form",
        created_by=user_a.id,
        status="published"
    )
    db_session.add(form_a)
    db_session.commit()

    # User B queries dashboard
    res_b = client.get("/dashboard/summary", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["kpis"]["active_forms_count"] == 0
    assert data_b["top_forms"] == []
    assert data_b["recent_submissions"] == []


def test_dashboard_unauthenticated(client):
    """
    Requests without a valid bearer token must return 401 Unauthorized.
    """
    res = client.get("/dashboard/summary")
    assert res.status_code == 401
