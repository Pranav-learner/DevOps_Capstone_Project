from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.database import get_db
from app.models import Issue, IssueStatus, IssuePriority
from app.schemas import IssueCreate, IssueUpdate, IssueResponse, IssueStats

router = APIRouter(prefix="/api/issues", tags=["Issues"])

# 1. GET /api/issues: List issues with optional filtering
@router.get("", response_model=list[IssueResponse])
def get_issues(
    project: str | None = None,
    status_filter: IssueStatus | None = None,
    db: Session = Depends(get_db),
):
    """Retrieve all issues, optionally filtered by project or status."""
    query = select(Issue).order_by(Issue.created_at.desc())
    if project:
        query = query.where(Issue.project == project)
    if status_filter:
        query = query.where(Issue.status == status_filter)
    issues = db.scalars(query).all()
    return issues


# 2. GET /api/issues/stats: Dashboard metrics
# NOTE: This must be defined BEFORE /{id} so FastAPI does not treat "stats" as an issue ID!
@router.get("/stats", response_model=IssueStats)
def get_issue_stats(db: Session = Depends(get_db)):
    """Return summary statistics for the DevTrack dashboard."""
    issues = db.scalars(select(Issue)).all()
    total = len(issues)
    by_status = {s.value: 0 for s in IssueStatus}
    by_priority = {p.value: 0 for p in IssuePriority}
    by_project: dict[str, int] = {}
    for issue in issues:
        # Count by status
        status_key = issue.status.value if hasattr(issue.status, "value") else str(issue.status)
        by_status[status_key] = by_status.get(status_key, 0) + 1
        # Count by priority
        priority_key = issue.priority.value if hasattr(issue.priority, "value") else str(issue.priority)
        by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
        # Count by project
        by_project[issue.project] = by_project.get(issue.project, 0) + 1
    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_project": by_project,
    }
# 3. GET /api/issues/{id}: Fetch single issue
@router.get("/{id}", response_model=IssueResponse)
def get_issue(id: int, db: Session = Depends(get_db)):
    """Retrieve a single issue by its ID."""
    issue = db.scalar(select(Issue).where(Issue.id == id))
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {id} not found",
        )
    return issue
# 4. POST /api/issues: Create a new issue
@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(issue_in: IssueCreate, db: Session = Depends(get_db)):
    """Create a new issue/task in DevTrack."""
    new_issue = Issue(
        title=issue_in.title,
        description=issue_in.description,
        status=issue_in.status,
        priority=issue_in.priority,
        project=issue_in.project,
        assignee=issue_in.assignee,
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    return new_issue
# 5. PUT /api/issues/{id}: Update an existing issue
@router.put("/{id}", response_model=IssueResponse)
def update_issue(id: int, issue_in: IssueUpdate, db: Session = Depends(get_db)):
    """Update fields of an existing issue."""
    issue = db.scalar(select(Issue).where(Issue.id == id))
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {id} not found",
        )
    # Update only fields that were explicitly sent
    update_data = issue_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(issue, field, value)
    db.commit()
    db.refresh(issue)
    return issue
# 6. DELETE /api/issues/{id}: Remove an issue
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(id: int, db: Session = Depends(get_db)):
    """Delete an issue by ID."""
    issue = db.scalar(select(Issue).where(Issue.id == id))
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {id} not found",
        )
    db.delete(issue)
    db.commit()
    return None
