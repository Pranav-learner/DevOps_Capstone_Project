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
