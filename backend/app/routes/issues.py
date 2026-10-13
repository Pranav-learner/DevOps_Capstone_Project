from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, case
from app.database import get_db
from app.models import Issue, IssueStatus, IssuePriority
from app.schemas import IssueCreate, IssueUpdate, IssueResponse, IssueStats

router = APIRouter(prefix="/api/issues", tags=["Issues"])

ALLOWED_SORT_FIELDS = {
    "created_at": Issue.created_at,
    "updated_at": Issue.updated_at,
    "due_date": Issue.due_date,
    "title": Issue.title,
    "id": Issue.id,
    "priority": "priority",
}

STATUS_MAP = {
    "BACKLOG": IssueStatus.BACKLOG,
    "TODO": IssueStatus.TODO,
    "IN_PROGRESS": IssueStatus.IN_PROGRESS,
    "INPROGRESS": IssueStatus.IN_PROGRESS,
    "IN_REVIEW": IssueStatus.IN_REVIEW,
    "INREVIEW": IssueStatus.IN_REVIEW,
    "REVIEW": IssueStatus.IN_REVIEW,
    "DONE": IssueStatus.DONE,
}

PRIORITY_MAP = {
    "LOW": IssuePriority.LOW,
    "MEDIUM": IssuePriority.MEDIUM,
    "HIGH": IssuePriority.HIGH,
    "CRITICAL": IssuePriority.CRITICAL,
}


# 1. GET /api/issues: List issues with comprehensive filtering, search, sort, and pagination
@router.get("", response_model=list[IssueResponse])
def get_issues(
    project: str | None = None,
    status: str | None = None,
    status_filter: str | None = None,  # Backward compatibility
    priority: str | None = None,
    assignee: str | None = None,
    search: str | None = None,
    overdue: bool | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve issues with comprehensive filtering, searching, sorting, and pagination."""
    query = select(Issue)

    # 1. Project filter
    if project:
        query = query.where(Issue.project == project)

    # 2. Status filter
    effective_status = status or status_filter
    if effective_status:
        normalized_st = effective_status.strip().upper().replace(" ", "_").replace("-", "_")
        if normalized_st not in STATUS_MAP:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter '{effective_status}'. Valid statuses: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE",
            )
        target_status = STATUS_MAP[normalized_st]
        if target_status == IssueStatus.IN_REVIEW:
            query = query.where(or_(Issue.status == IssueStatus.IN_REVIEW, Issue.status == IssueStatus.REVIEW))
        else:
            query = query.where(Issue.status == target_status)

    # 3. Priority filter
    if priority:
        normalized_pr = priority.strip().upper()
        if normalized_pr not in PRIORITY_MAP:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority filter '{priority}'. Valid priorities: LOW, MEDIUM, HIGH, CRITICAL",
            )
        query = query.where(Issue.priority == PRIORITY_MAP[normalized_pr])

    # 4. Assignee filter
    if assignee is not None and assignee != "":
        clean_assignee = assignee.strip()
        if clean_assignee.lower() in ("unassigned", "__none__", "none"):
            query = query.where(or_(Issue.assignee.is_(None), Issue.assignee == ""))
        else:
            query = query.where(Issue.assignee == clean_assignee)

    # 5. Search in title and description
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(Issue.title.ilike(term), Issue.description.ilike(term)))

    # 6. Overdue filter
    now_utc = datetime.now(timezone.utc)
    if overdue is True:
        query = query.where(
            Issue.due_date.is_not(None),
            Issue.due_date < now_utc,
            Issue.status != IssueStatus.DONE,
        )
    elif overdue is False:
        query = query.where(
            or_(
                Issue.due_date.is_(None),
                Issue.due_date >= now_utc,
                Issue.status == IssueStatus.DONE,
            )
        )

    # 7. Sorting
    clean_sort = sort_by.strip().lower()
    if clean_sort not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort field '{sort_by}'. Allowed fields: created_at, updated_at, due_date, priority, title, id",
        )

    clean_order = order.strip().lower()
    if clean_order not in ("asc", "desc"):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid order: must be 'asc' or 'desc'",
        )

    if clean_sort == "priority":
        priority_order = case(
            {
                IssuePriority.LOW: 1,
                IssuePriority.MEDIUM: 2,
                IssuePriority.HIGH: 3,
                IssuePriority.CRITICAL: 4,
            },
            value=Issue.priority,
            else_=0,
        )
        sort_col = priority_order.desc() if clean_order == "desc" else priority_order.asc()
    elif clean_sort == "due_date":
        col = Issue.due_date
        sort_col = col.desc().nulls_last() if clean_order == "desc" else col.asc().nulls_last()
    else:
        col = ALLOWED_SORT_FIELDS[clean_sort]
        sort_col = col.desc() if clean_order == "desc" else col.asc()

    # Deterministic secondary ordering
    secondary_col = Issue.id.desc() if clean_order == "desc" else Issue.id.asc()
    query = query.order_by(sort_col, secondary_col)

    # 8. Pagination
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)

    issues = db.scalars(query).all()
    return issues


# 2. GET /api/issues/stats: Dashboard metrics
@router.get("/stats", response_model=IssueStats)
def get_issue_stats(project: str | None = None, db: Session = Depends(get_db)):
    """Return summary statistics and recent issues for the DevTrack dashboard."""
    query = select(Issue)
    if project and project != "ALL":
        query = query.where(Issue.project == project)
    issues = db.scalars(query).all()

    total = len(issues)
    now_utc = datetime.now(timezone.utc)

    # Standard status dictionary
    by_status = {
        IssueStatus.BACKLOG.value: 0,
        IssueStatus.TODO.value: 0,
        IssueStatus.IN_PROGRESS.value: 0,
        IssueStatus.IN_REVIEW.value: 0,
        IssueStatus.DONE.value: 0,
    }

    # Standard priority dictionary
    by_priority = {
        IssuePriority.LOW.value: 0,
        IssuePriority.MEDIUM.value: 0,
        IssuePriority.HIGH.value: 0,
        IssuePriority.CRITICAL.value: 0,
    }

    by_project: dict[str, int] = {}
    open_count = 0
    in_progress_count = 0
    completed_count = 0
    overdue_count = 0

    for issue in issues:
        st_val = issue.status.value if hasattr(issue.status, "value") else str(issue.status)
        pr_val = issue.priority.value if hasattr(issue.priority, "value") else str(issue.priority)

        # Normalize REVIEW to IN_REVIEW in stats display
        if st_val == "REVIEW":
            st_val = "IN_REVIEW"

        by_status[st_val] = by_status.get(st_val, 0) + 1
        by_priority[pr_val] = by_priority.get(pr_val, 0) + 1
        by_project[issue.project] = by_project.get(issue.project, 0) + 1

        is_done = st_val == IssueStatus.DONE.value
        if is_done:
            completed_count += 1
        else:
            open_count += 1

        if st_val == IssueStatus.IN_PROGRESS.value:
            in_progress_count += 1

        # Check overdue: due date has passed, and issue is not Done
        if issue.due_date is not None and not is_done:
            issue_due = issue.due_date
            if issue_due.tzinfo is None:
                issue_due = issue_due.replace(tzinfo=timezone.utc)
            if issue_due < now_utc:
                overdue_count += 1

    # Fetch 5 most recent issues (ordered by updated_at desc, id desc)
    recent_query = select(Issue)
    if project and project != "ALL":
        recent_query = recent_query.where(Issue.project == project)
    recent_query = recent_query.order_by(Issue.updated_at.desc(), Issue.id.desc()).limit(5)
    recent_issues = db.scalars(recent_query).all()

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress_count,
        "completed": completed_count,
        "overdue": overdue_count,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_project": by_project,
        "recent_issues": recent_issues,
    }


# 3. GET /api/issues/{id}: Fetch single issue
@router.get("/{id}", response_model=IssueResponse)
def get_issue(id: int, db: Session = Depends(get_db)):
    """Retrieve a single issue by its ID."""
    issue = db.scalar(select(Issue).where(Issue.id == id))
    if not issue:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {id} not found",
        )
    return issue


# 4. POST /api/issues: Create a new issue
@router.post("", response_model=IssueResponse, status_code=http_status.HTTP_201_CREATED)
def create_issue(issue_in: IssueCreate, db: Session = Depends(get_db)):
    """Create a new issue/task in DevTrack."""
    new_issue = Issue(
        title=issue_in.title,
        description=issue_in.description,
        status=issue_in.status,
        priority=issue_in.priority,
        project=issue_in.project,
        assignee=issue_in.assignee,
        due_date=issue_in.due_date,
        labels=issue_in.labels or [],
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
            status_code=http_status.HTTP_404_NOT_FOUND,
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
@router.delete("/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_issue(id: int, db: Session = Depends(get_db)):
    """Delete an issue by ID."""
    issue = db.scalar(select(Issue).where(Issue.id == id))
    if not issue:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {id} not found",
        )
    db.delete(issue)
    db.commit()
    return None
