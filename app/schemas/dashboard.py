from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid


class DashboardMetricKPIs(BaseModel):
    active_forms_count: int
    published_forms_count: int
    submissions_today_count: int
    avg_completion_rate: float
    active_rules_count: int


class RecentSubmissionItem(BaseModel):
    id: uuid.UUID
    reference_code: str
    form_id: uuid.UUID
    form_title: str
    respondent_identifier: Optional[str] = None
    time_taken_seconds: Optional[int] = None
    submitted_at: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class TopFormMetric(BaseModel):
    form_id: uuid.UUID
    title: str
    total_responses: int

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    kpis: DashboardMetricKPIs
    top_forms: List[TopFormMetric]
    recent_submissions: List[RecentSubmissionItem]

    model_config = ConfigDict(from_attributes=True)
