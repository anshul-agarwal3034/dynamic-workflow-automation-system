import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.conditional_rule import ConditionalRule
from app.models.submission import Submission
from app.models.response_value import ResponseValue
from app.schemas.dashboard import (
    DashboardMetricKPIs,
    RecentSubmissionItem,
    TopFormMetric,
    DashboardSummaryResponse,
)

router = APIRouter()


def extract_respondent_identifier(submission: Submission) -> str:
    """
    Extracts an email or name from response values or response_data JSONB.
    Falls back gracefully to 'Anonymous Respondent'.
    """
    name = None
    email = None

    if submission.response_values:
        for rv in submission.response_values:
            lbl = (rv.field.label or "").lower() if rv.field else ""
            ft = (rv.field.field_type or "").lower() if rv.field else ""
            val = str(rv.value).strip() if rv.value is not None else ""
            if not val:
                continue
            if ft == "email" or "email" in lbl:
                if not email and "@" in val:
                    email = val
            elif "name" in lbl and not any(w in lbl for w in ("business", "company", "form", "organization")):
                if not name:
                    name = val

    # Fallback to response_data JSONB
    if (not name or not email) and submission.response_data and isinstance(submission.response_data, dict):
        for k, v in submission.response_data.items():
            if not v:
                continue
            k_lower = str(k).lower()
            v_str = str(v).strip()
            if ("email" in k_lower or "@" in v_str) and not email and "@" in v_str:
                email = v_str
            elif "name" in k_lower and not name and not any(w in k_lower for w in ("business", "company", "form", "organization")):
                name = v_str

    if name and email:
        return f"{name} • {email}"
    elif email:
        return email
    elif name:
        return name
    return "Anonymous Respondent"


@router.get("/summary", response_model=DashboardSummaryResponse, status_code=status.HTTP_200_OK)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live aggregated KPIs, top forms by responses, and recent submissions
    scoped strictly to forms owned by current_user.
    """
    # 1. User's forms
    forms = (
        db.query(Form)
        .options(joinedload(Form.versions))
        .filter(Form.created_by == current_user.id)
        .order_by(Form.created_at.desc())
        .all()
    )
    active_forms_count = len(forms)
    published_forms_count = sum(
        1 for f in forms
        if f.status == "published" or any(v.is_active for v in f.versions)
    )

    # 2. Active workflow rules across user's forms
    active_rules_count = (
        db.query(ConditionalRule)
        .join(Field, ConditionalRule.trigger_field_id == Field.id)
        .join(FormVersion, Field.form_version_id == FormVersion.id)
        .join(Form, FormVersion.form_id == Form.id)
        .filter(Form.created_by == current_user.id)
        .distinct()
        .count()
    )

    # 3. Submissions & completion metrics
    start_of_today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    user_submissions = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .join(Form, FormVersion.form_id == Form.id)
        .filter(Form.created_by == current_user.id)
        .all()
    )

    submissions_today_count = sum(
        1 for s in user_submissions
        if s.submitted_at and s.submitted_at >= start_of_today and s.status == "completed"
    )

    total_started = len(user_submissions)
    total_completed = sum(1 for s in user_submissions if s.status == "completed")
    avg_completion_rate = (
        round((total_completed / total_started) * 100, 1)
        if total_started > 0
        else 0.0
    )

    # 4. Top forms by total responses
    form_counts = dict(
        db.query(Form.id, func.count(Submission.id))
        .join(FormVersion, FormVersion.form_id == Form.id)
        .join(Submission, Submission.form_version_id == FormVersion.id)
        .filter(Form.created_by == current_user.id, Submission.status == "completed")
        .group_by(Form.id)
        .all()
    )

    top_forms = [
        TopFormMetric(
            form_id=f.id,
            title=f.title,
            total_responses=form_counts.get(f.id, 0)
        )
        for f in forms
    ]
    top_forms.sort(key=lambda x: (x.total_responses, x.title), reverse=True)
    top_forms = top_forms[:5]

    # 5. Recent submissions (latest 10)
    recent_sub_rows = (
        db.query(Submission, Form.id.label("form_id"), Form.title.label("form_title"))
        .options(
            joinedload(Submission.response_values).joinedload(ResponseValue.field)
        )
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .join(Form, FormVersion.form_id == Form.id)
        .filter(Form.created_by == current_user.id)
        .order_by(
            func.coalesce(Submission.submitted_at, Submission.started_at).desc()
        )
        .limit(10)
        .all()
    )

    recent_submissions = []
    for sub, form_id, form_title in recent_sub_rows:
        raw_status = (sub.status or "completed").replace("_", " ").title()
        ref = sub.response_id or f"SUB-{str(sub.id)[:8].upper()}"
        recent_submissions.append(
            RecentSubmissionItem(
                id=sub.id,
                reference_code=ref,
                form_id=form_id,
                form_title=form_title,
                respondent_identifier=extract_respondent_identifier(sub),
                time_taken_seconds=sub.completion_time_seconds,
                submitted_at=sub.submitted_at or sub.started_at,
                status=raw_status
            )
        )

    return DashboardSummaryResponse(
        kpis=DashboardMetricKPIs(
            active_forms_count=active_forms_count,
            published_forms_count=published_forms_count,
            submissions_today_count=submissions_today_count,
            avg_completion_rate=avg_completion_rate,
            active_rules_count=active_rules_count,
        ),
        top_forms=top_forms,
        recent_submissions=recent_submissions
    )
