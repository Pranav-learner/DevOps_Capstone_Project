import pytest


def test_root_endpoint(client):
    """Verify API root welcome and documentation discovery endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Welcome to DevTrack API"
    assert data["docs_url"] == "/docs"
    assert data["status"] == "healthy"


def test_health_check(client):
    """Verify Kubernetes liveness probe endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_readiness_check(client):
    """Verify Kubernetes readiness probe endpoint."""
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_issue_lifecycle_crud(client):
    """Verify full CRUD lifecycle: Create, Read, List, Update, Stats, and Delete."""
    # 1. Create issue
    create_payload = {
        "title": "CI Test Task",
        "description": "Created during automated pytest run",
        "status": "TODO",
        "priority": "HIGH",
        "project": "DevTrack-CI",
        "assignee": "DevBot",
    }
    create_res = client.post("/api/issues", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    issue_id = created["id"]
    assert created["title"] == "CI Test Task"
    assert created["status"] == "TODO"

    # 2. Read single issue
    get_res = client.get(f"/api/issues/{issue_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == issue_id

    # 3. List issues with project filter
    list_res = client.get("/api/issues?project=DevTrack-CI")
    assert list_res.status_code == 200
    assert any(i["id"] == issue_id for i in list_res.json())

    # 4. Stats endpoint
    stats_res = client.get("/api/issues/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total"] >= 1
    assert stats_res.json()["by_status"]["TODO"] >= 1

    # 5. Update issue
    update_res = client.put(f"/api/issues/{issue_id}", json={"status": "DONE"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "DONE"

    # 6. Delete issue
    delete_res = client.delete(f"/api/issues/{issue_id}")
    assert delete_res.status_code == 204

    # 7. Confirm 404 after deletion
    verify_deleted = client.get(f"/api/issues/{issue_id}")
    assert verify_deleted.status_code == 404


def test_issue_not_found(client):
    """Verify 404 returned for non-existent issue ID."""
    response = client.get("/api/issues/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_issue_create_validation_error(client):
    """Verify 422 Unprocessable Entity when required fields are missing."""
    invalid_payload = {"description": "Missing title"}
    response = client.post("/api/issues", json=invalid_payload)
    assert response.status_code == 422


def test_metrics_endpoint(client):
    """Verify Prometheus metrics endpoint exposes application telemetry."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    content = response.text
    assert "devtrack_http_requests_total" in content
    assert "devtrack_http_request_duration_seconds" in content
    assert "devtrack_app_info" in content
    assert "process_cpu_seconds_total" in content


def test_dashboard_stats_empty(client):
    """Verify dashboard statistics structure and zeroes when database has no issues."""
    response = client.get("/api/issues/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["open"] == 0
    assert data["in_progress"] == 0
    assert data["completed"] == 0
    assert data["overdue"] == 0
    assert "by_status" in data
    assert data["by_status"]["TODO"] == 0
    assert data["by_status"]["BACKLOG"] == 0
    assert data["by_status"]["IN_PROGRESS"] == 0
    assert data["by_status"]["IN_REVIEW"] == 0
    assert data["by_status"]["DONE"] == 0
    assert data["by_priority"]["LOW"] == 0
    assert data["by_priority"]["CRITICAL"] == 0
    assert data["recent_issues"] == []


def test_create_issue_with_due_date_and_labels(client):
    """Verify issue creation supporting due date, labels, and full workflow attributes."""
    payload = {
        "title": "Upgrade Security Scanner",
        "description": "Configure Trivy in CI pipeline",
        "status": "BACKLOG",
        "priority": "CRITICAL",
        "project": "DevTrack",
        "assignee": "Alex",
        "due_date": "2026-10-25T18:00:00Z",
        "labels": ["security", "devops", "ci"],
    }
    response = client.post("/api/issues", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Upgrade Security Scanner"
    assert data["status"] == "BACKLOG"
    assert data["priority"] == "CRITICAL"
    assert data["assignee"] == "Alex"
    assert "2026-10-25" in data["due_date"]
    assert data["labels"] == ["security", "devops", "ci"]


def test_update_workflow_fields(client):
    """Verify updating status, priority, assignee, due_date, and labels."""
    create_res = client.post(
        "/api/issues",
        json={"title": "Task for update", "status": "TODO", "priority": "LOW"},
    )
    issue_id = create_res.json()["id"]

    # Update to IN_PROGRESS, HIGH, assignee, due_date, labels
    update_res = client.put(
        f"/api/issues/{issue_id}",
        json={
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "assignee": "Sarah",
            "due_date": "2026-11-01T12:00:00Z",
            "labels": ["frontend", "urgent"],
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "IN_PROGRESS"
    assert updated["priority"] == "HIGH"
    assert updated["assignee"] == "Sarah"
    assert updated["labels"] == ["frontend", "urgent"]
    assert "2026-11-01" in updated["due_date"]


def test_dashboard_stats_and_overdue(client):
    """Verify dashboard metrics calculations, including open, completed, and overdue handling."""
    from datetime import datetime, timezone, timedelta

    past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    future = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()

    # 1. Past due but NOT completed (Overdue!)
    client.post(
        "/api/issues",
        json={
            "title": "Overdue Task",
            "status": "TODO",
            "priority": "HIGH",
            "due_date": past,
        },
    )
    # 2. Past due but COMPLETED (Done, so NOT overdue)
    client.post(
        "/api/issues",
        json={
            "title": "Completed Past Task",
            "status": "DONE",
            "priority": "MEDIUM",
            "due_date": past,
        },
    )
    # 3. Future due date (In Progress, NOT overdue)
    client.post(
        "/api/issues",
        json={
            "title": "Active Sprint Task",
            "status": "IN_PROGRESS",
            "priority": "LOW",
            "due_date": future,
        },
    )
    # 4. Backlog issue without due date
    client.post(
        "/api/issues",
        json={
            "title": "Backlog Idea",
            "status": "BACKLOG",
            "priority": "LOW",
        },
    )

    stats_res = client.get("/api/issues/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total"] == 4
    assert stats["open"] == 3  # TODO, IN_PROGRESS, BACKLOG
    assert stats["in_progress"] == 1
    assert stats["completed"] == 1  # DONE
    assert stats["overdue"] == 1  # Only the TODO with past due date
    assert stats["by_status"]["TODO"] == 1
    assert stats["by_status"]["DONE"] == 1
    assert stats["by_status"]["IN_PROGRESS"] == 1
    assert stats["by_status"]["BACKLOG"] == 1
    assert len(stats["recent_issues"]) == 4


def test_search_and_filters(client):
    """Verify searching by title/desc, and individual/combined filters."""
    from datetime import datetime, timezone, timedelta
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    client.post(
        "/api/issues",
        json={
            "title": "Kubernetes Ingress Setup",
            "description": "Configure ALB controller ingress",
            "status": "TODO",
            "priority": "CRITICAL",
            "assignee": "Alice",
            "due_date": past,
        },
    )
    client.post(
        "/api/issues",
        json={
            "title": "Frontend Responsive Design",
            "description": "Improve linear dark mode layout",
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "assignee": "Bob",
        },
    )
    client.post(
        "/api/issues",
        json={
            "title": "Database Indexing",
            "description": "Add btree index to issues table",
            "status": "DONE",
            "priority": "LOW",
            "assignee": "Alice",
        },
    )

    # Search title
    res_search = client.get("/api/issues?search=ingress")
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["title"] == "Kubernetes Ingress Setup"

    # Search description
    res_search_desc = client.get("/api/issues?search=linear")
    assert res_search_desc.status_code == 200
    assert len(res_search_desc.json()) == 1
    assert res_search_desc.json()[0]["title"] == "Frontend Responsive Design"

    # Status filter
    res_status = client.get("/api/issues?status=IN_PROGRESS")
    assert res_status.status_code == 200
    assert len(res_status.json()) == 1

    # Priority filter
    res_priority = client.get("/api/issues?priority=CRITICAL")
    assert res_priority.status_code == 200
    assert len(res_priority.json()) == 1

    # Assignee filter
    res_assignee = client.get("/api/issues?assignee=Alice")
    assert res_assignee.status_code == 200
    assert len(res_assignee.json()) == 2

    # Overdue filter
    res_overdue = client.get("/api/issues?overdue=true")
    assert res_overdue.status_code == 200
    assert len(res_overdue.json()) == 1
    assert res_overdue.json()[0]["title"] == "Kubernetes Ingress Setup"

    # Combined filters: Alice + CRITICAL
    res_combined = client.get("/api/issues?assignee=Alice&priority=CRITICAL")
    assert res_combined.status_code == 200
    assert len(res_combined.json()) == 1


def test_sorting_and_pagination(client):
    """Verify sorting (by title, priority, due_date) and pagination limits/offsets."""
    client.post("/api/issues", json={"title": "Alpha Task", "priority": "LOW"})
    client.post("/api/issues", json={"title": "Beta Task", "priority": "CRITICAL"})
    client.post("/api/issues", json={"title": "Gamma Task", "priority": "MEDIUM"})

    # Sort by title asc
    res_asc = client.get("/api/issues?sort_by=title&order=asc")
    assert res_asc.status_code == 200
    titles = [i["title"] for i in res_asc.json()]
    assert titles[:3] == ["Alpha Task", "Beta Task", "Gamma Task"]

    # Sort by priority desc (CRITICAL -> MEDIUM -> LOW)
    res_priority_desc = client.get("/api/issues?sort_by=priority&order=desc")
    assert res_priority_desc.status_code == 200
    priorities = [i["priority"] for i in res_priority_desc.json()]
    assert priorities[:3] == ["CRITICAL", "MEDIUM", "LOW"]

    # Pagination: limit=2, offset=1
    res_page = client.get("/api/issues?sort_by=title&order=asc&limit=2&offset=1")
    assert res_page.status_code == 200
    page_titles = [i["title"] for i in res_page.json()]
    assert page_titles == ["Beta Task", "Gamma Task"]


def test_invalid_filter_and_sort_handling(client):
    """Verify safe error responses (HTTP 400) for invalid filters or sort parameters."""
    res_bad_status = client.get("/api/issues?status=INVALID_STATUS")
    assert res_bad_status.status_code == 400
    assert "invalid status filter" in res_bad_status.json()["detail"].lower()

    res_bad_priority = client.get("/api/issues?priority=MEGA_HIGH")
    assert res_bad_priority.status_code == 400
    assert "invalid priority filter" in res_bad_priority.json()["detail"].lower()

    res_bad_sort = client.get("/api/issues?sort_by=non_existent_column")
    assert res_bad_sort.status_code == 400
    assert "invalid sort field" in res_bad_sort.json()["detail"].lower()

    res_bad_order = client.get("/api/issues?order=sideways")
    assert res_bad_order.status_code == 400
    assert "invalid order" in res_bad_order.json()["detail"].lower()


def test_update_and_delete_not_found(client):
    """Verify 404 returned when updating or deleting non-existent issue."""
    update_res = client.put("/api/issues/999999", json={"title": "Ghost"})
    assert update_res.status_code == 404

    delete_res = client.delete("/api/issues/999999")
    assert delete_res.status_code == 404


def test_unassigned_filter_and_due_date_sort(client):
    """Verify filtering for unassigned issues and sorting with nullable due dates."""
    from datetime import datetime, timezone, timedelta
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    client.post("/api/issues", json={"title": "Unassigned Issue 1", "assignee": None, "due_date": next_week})
    client.post("/api/issues", json={"title": "Assigned Issue", "assignee": "Charlie", "due_date": tomorrow})
    client.post("/api/issues", json={"title": "Unassigned Issue 2", "assignee": "", "due_date": None})

    # Filter unassigned
    res_unassigned = client.get("/api/issues?assignee=unassigned")
    assert res_unassigned.status_code == 200
    unassigned_titles = [i["title"] for i in res_unassigned.json()]
    assert "Unassigned Issue 1" in unassigned_titles
    assert "Unassigned Issue 2" in unassigned_titles
    assert "Assigned Issue" not in unassigned_titles

    # Sort due_date asc
    res_due_sort = client.get("/api/issues?sort_by=due_date&order=asc")
    assert res_due_sort.status_code == 200
    due_items = res_due_sort.json()
    assert len(due_items) >= 3
    # Items with due_date come first when asc with nulls_last
    assert due_items[0]["due_date"] is not None


