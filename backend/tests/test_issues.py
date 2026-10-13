import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 500
    assert response.json() == {"status": "healthy"}


def test_readiness_check():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_issue_lifecycle_crud():
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

    # 3. List issues
    list_res = client.get("/api/issues?project=DevTrack-CI")
    assert list_res.status_code == 200
    assert any(i["id"] == issue_id for i in list_res.json())

    # 4. Stats endpoint
    stats_res = client.get("/api/issues/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total"] >= 1

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
