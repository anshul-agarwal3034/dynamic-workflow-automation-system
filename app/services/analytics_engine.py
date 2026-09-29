import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.field import Field
from app.models.submission import Submission
from app.models.response_value import ResponseValue


def format_duration_display(seconds: Optional[float]) -> str:
    """
    Formats raw duration in seconds into a human-readable display string.
    Examples:
      - 260 -> "4 mins 20 secs"
      - 18 -> "18 secs"
      - 120 -> "2 mins"
      - 65 -> "1 min 5 secs"
      - 0 -> "0 secs"
    """
    if seconds is None or seconds <= 0:
        return "0 secs"

    sec = int(round(seconds))
    mins = sec // 60
    rem_sec = sec % 60

    if mins > 0 and rem_sec > 0:
        m_label = "min" if mins == 1 else "mins"
        s_label = "sec" if rem_sec == 1 else "secs"
        return f"{mins} {m_label} {rem_sec} {s_label}"
    elif mins > 0:
        m_label = "min" if mins == 1 else "mins"
        return f"{mins} {m_label}"
    else:
        s_label = "sec" if rem_sec == 1 else "secs"
        return f"{rem_sec} {s_label}"


def calculate_form_analytics(
    db: Session,
    form_id: uuid.UUID,
    version_id: Optional[uuid.UUID] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Calculates summary KPIs and categorical/choice field value distributions
    for a given form, optionally filtered by version and date range.
    """
    # 1. Verify form exists
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return {}

    # 2. Build base submission query joined with FormVersion
    sub_query = (
        db.query(Submission)
        .join(FormVersion, Submission.form_version_id == FormVersion.id)
        .filter(FormVersion.form_id == form_id)
    )

    if version_id:
        sub_query = sub_query.filter(FormVersion.id == version_id)

    date_col = func.coalesce(Submission.started_at, Submission.submitted_at)
    if from_date:
        sub_query = sub_query.filter(date_col >= from_date)
    if to_date:
        sub_query = sub_query.filter(date_col <= to_date)

    submissions = sub_query.all()

    # 3. Compute KPI summary metrics
    total_started = len(submissions)
    completed_submissions = [s for s in submissions if s.status == "completed"]
    total_completed = len(completed_submissions)
    drop_off_count = max(0, total_started - total_completed)

    completion_rate = (
        round((total_completed / total_started) * 100, 1)
        if total_started > 0
        else 0.0
    )

    durations = [
        s.completion_time_seconds
        for s in completed_submissions
        if s.completion_time_seconds is not None and s.completion_time_seconds >= 0
    ]

    if durations:
        avg_seconds = round(sum(durations) / len(durations), 1)
    else:
        avg_seconds = 0.0

    avg_duration_display = format_duration_display(avg_seconds)

    # 4. Resolve target version to determine field schema for distribution breakdown
    target_version = None
    if version_id:
        target_version = (
            db.query(FormVersion)
            .filter(FormVersion.id == version_id, FormVersion.form_id == form_id)
            .first()
        )
    if not target_version:
        # Fallback to active version or latest published version or first version
        target_version = next((v for v in form.versions if v.is_active), None)
        if not target_version:
            pub_versions = [v for v in form.versions if v.published_at is not None]
            if pub_versions:
                target_version = sorted(pub_versions, key=lambda v: v.version_number, reverse=True)[0]
            elif form.versions:
                target_version = form.versions[0]

    # 5. Field-Wise Value Distributions
    field_distributions = []
    completed_sub_ids = [s.id for s in completed_submissions]

    if target_version and completed_sub_ids:
        # Categorical / choice field types to aggregate
        choice_types = {"dropdown", "radio", "checkbox", "rating", "select"}
        target_fields = [
            f for f in sorted(target_version.fields, key=lambda x: x.display_order)
            if f.field_type and f.field_type.lower() in choice_types
        ]

        if target_fields:
            field_ids = [f.id for f in target_fields]
            # Fetch all response_values for these fields in completed submissions
            rv_records = (
                db.query(ResponseValue)
                .filter(
                    ResponseValue.submission_id.in_(completed_sub_ids),
                    ResponseValue.field_id.in_(field_ids)
                )
                .all()
            )

            # Group response values by field_id
            rv_by_field: Dict[uuid.UUID, List[Any]] = {fid: [] for fid in field_ids}
            for rv in rv_records:
                rv_by_field[rv.field_id].append(rv.value)

            for f in target_fields:
                ftype = f.field_type.lower()
                values_list = rv_by_field.get(f.id, [])

                # Option definitions
                # Map option identifier / label to canonical label
                canonical_options: List[str] = []
                opt_map: Dict[str, str] = {}

                if ftype == "rating":
                    # Standard 1 to 5 rating stars
                    canonical_options = ["1", "2", "3", "4", "5"]
                    for opt in canonical_options:
                        opt_map[opt] = opt
                        opt_map[f"{opt} Star"] = opt
                        opt_map[f"{opt} Stars"] = opt
                elif f.options:
                    for o in f.options:
                        label = o.option_label or str(o.option_value)
                        val = str(o.option_value)
                        canonical_options.append(label)
                        opt_map[val] = label
                        opt_map[label] = label
                        opt_map[val.strip().lower()] = label
                        opt_map[label.strip().lower()] = label

                counts: Dict[str, int] = {opt: 0 for opt in canonical_options}
                total_answered = 0

                for val in values_list:
                    if val is None or val == "":
                        continue

                    # If checkbox or multi-select, val may be a list
                    items = val if isinstance(val, list) else [val]
                    for item in items:
                        if item is None or item == "":
                            continue
                        str_item = str(item).strip()
                        matched_label = (
                            opt_map.get(str_item)
                            or opt_map.get(str_item.lower())
                            or str_item
                        )

                        if matched_label not in counts:
                            counts[matched_label] = 0
                            canonical_options.append(matched_label)

                        counts[matched_label] += 1
                        total_answered += 1

                # Calculate percentages for each option
                breakdown = []
                for opt in canonical_options:
                    cnt = counts.get(opt, 0)
                    pct = (
                        round((cnt / total_answered) * 100, 1)
                        if total_answered > 0
                        else 0.0
                    )
                    breakdown.append({
                        "option": opt,
                        "count": cnt,
                        "percentage": pct
                    })

                field_distributions.append({
                    "field_id": str(f.id),
                    "label": f.label,
                    "field_type": f.field_type,
                    "total_responses": total_answered,
                    "breakdown": breakdown
                })

    return {
        "form_id": str(form.id),
        "form_title": form.title,
        "version_id": str(target_version.id) if target_version else None,
        "version_number": target_version.version_number if target_version else 1,
        "total_started": total_started,
        "total_completed": total_completed,
        "completion_rate": completion_rate,
        "drop_off_count": drop_off_count,
        "average_duration_seconds": avg_seconds,
        "average_duration_display": avg_duration_display,
        "field_distributions": field_distributions
    }
