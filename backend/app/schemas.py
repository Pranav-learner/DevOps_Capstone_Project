from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models import IssueStatus, IssuePriority

# 1. Base schema: Common attributes shared across requests and responses
class IssueBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Issue title")
    description: str | None = Field(default=None, description="Detailed description")
    status: IssueStatus = Field(default=IssueStatus.TODO, description="Current progress status")
    priority: IssuePriority = Field(default=IssuePriority.MEDIUM, description="Urgency level")
    project: str = Field(default="DevTrack", min_length=1, max_length=100, description="Project name")
    assignee: str | None = Field(default=None, max_length=100, description="Person responsible")


# The client sends title, description, etc. They CANNOT supply an id or timestamps.
class IssueCreate(IssueBase):
    pass
# 3. Schema for updating an issue (PUT /api/issues/{id})
# All fields are optional because a user might only want to change the status or priority.
class IssueUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: IssueStatus | None = None
    priority: IssuePriority | None = None
    project: str | None = Field(default=None, min_length=1, max_length=100)
    assignee: str | None = Field(default=None, max_length=100)
# 4. Schema for returning an issue to the client (GET /api/issues)
# Includes database-managed fields: id, created_at, updated_at
class IssueResponse(IssueBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Allows Pydantic to read directly from SQLAlchemy ORM instances
    model_config = ConfigDict(from_attributes=True)
# 5. Schema for Dashboard Statistics (GET /api/issues/stats)
class IssueStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    by_project: dict[str, int]
