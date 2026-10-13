from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models import IssueStatus, IssuePriority


def _normalize_status(v):
    if isinstance(v, str):
        val = v.strip().upper().replace(" ", "_").replace("-", "_")
        if val in ("IN_PROGRESS", "INPROGRESS"):
            return IssueStatus.IN_PROGRESS
        if val in ("IN_REVIEW", "INREVIEW", "REVIEW"):
            return IssueStatus.IN_REVIEW
        if val in ("BACKLOG",):
            return IssueStatus.BACKLOG
        if val in ("TODO", "TO_DO"):
            return IssueStatus.TODO
        if val in ("DONE", "COMPLETED"):
            return IssueStatus.DONE
        try:
            return IssueStatus(val)
        except ValueError:
            return v
    return v


def _normalize_priority(v):
    if isinstance(v, str):
        val = v.strip().upper()
        try:
            return IssuePriority(val)
        except ValueError:
            return v
    return v


class IssueBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Issue title")
    description: str | None = Field(default=None, description="Detailed description")
    status: IssueStatus = Field(default=IssueStatus.TODO, description="Current progress status")
    priority: IssuePriority = Field(default=IssuePriority.MEDIUM, description="Urgency level")
    project: str = Field(default="DevTrack", min_length=1, max_length=100, description="Project name")
    assignee: str | None = Field(default=None, max_length=100, description="Person responsible")
    due_date: datetime | None = Field(default=None, description="Due date and time")
    labels: list[str] = Field(default_factory=list, description="List of issue labels")

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        return _normalize_status(v)

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v):
        return _normalize_priority(v)

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("labels", mode="before")
    @classmethod
    def validate_labels(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            return [label.strip() for label in v.split(",") if label.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []


class IssueCreate(IssueBase):
    pass


class IssueUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: IssueStatus | None = None
    priority: IssuePriority | None = None
    project: str | None = Field(default=None, min_length=1, max_length=100)
    assignee: str | None = Field(default=None, max_length=100)
    due_date: datetime | None = None
    labels: list[str] | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return None
        return _normalize_status(v)

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v):
        if v is None:
            return None
        return _normalize_priority(v)

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("labels", mode="before")
    @classmethod
    def validate_labels(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [label.strip() for label in v.split(",") if label.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []


class IssueResponse(IssueBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IssueStats(BaseModel):
    total: int
    open: int = 0
    in_progress: int = 0
    completed: int = 0
    overdue: int = 0
    by_status: dict[str, int]
    by_priority: dict[str, int]
    by_project: dict[str, int]
    recent_issues: list[IssueResponse] = Field(default_factory=list)
