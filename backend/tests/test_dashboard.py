import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def login_token(client: TestClient, email: str, password: str) -> str:
    client.cookies.clear()
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    token = response.cookies.get("session_id")
    assert token is not None
    client.cookies.clear()
    return token


def auth_headers(token: str) -> dict[str, str]:
    return {"Cookie": f"session_id={token}"}


def create_user(
    client: TestClient,
    admin_token: str,
    email: str,
    role: str,
) -> dict[str, object]:
    response = client.post(
        "/api/admin/users",
        headers=auth_headers(admin_token),
        json={
            "email": email,
            "password": "created-password",
            "name": email.split("@")[0].replace("-", " ").title(),
            "role": role,
            "department": "Engineering",
            "start_date": "2026-07-15",
        },
    )
    assert response.status_code == 201
    return response.json()


def role_fixtures(client: TestClient) -> dict[str, object]:
    admin_token = login_token(client, "admin@example.com", "bootstrap-password")
    recruit = create_user(
        client, admin_token, "dashboard-recruit@example.com", "Recruit"
    )
    other_recruit = create_user(
        client,
        admin_token,
        "dashboard-other@example.com",
        "Recruit",
    )
    assigned_manager = create_user(
        client,
        admin_token,
        "dashboard-assigned@example.com",
        "Manager",
    )
    create_user(
        client,
        admin_token,
        "dashboard-unassigned@example.com",
        "Manager",
    )
    assignment = client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(admin_token),
        json={"manager_id": assigned_manager["id"]},
    )
    assert assignment.status_code == 200
    return {
        "admin_token": admin_token,
        "recruit": recruit,
        "recruit_token": login_token(
            client,
            "dashboard-recruit@example.com",
            "created-password",
        ),
        "other_recruit": other_recruit,
        "other_recruit_token": login_token(
            client,
            "dashboard-other@example.com",
            "created-password",
        ),
        "assigned_manager_token": login_token(
            client,
            "dashboard-assigned@example.com",
            "created-password",
        ),
        "unassigned_manager_token": login_token(
            client,
            "dashboard-unassigned@example.com",
            "created-password",
        ),
    }


def assert_access_denied(response: object) -> None:
    assert response.status_code == 403
    assert response.json() == {
        "error": {
            "code": "access_denied",
            "message": "Access denied",
        }
    }


def test_dashboard_aggregates_scoped_counts_progress_open_issues_and_recent_order(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    database = client.app.state.database
    created_at = "2026-07-16T12:00:00+00:00"

    for identifier, status in [
        (101, "Not Started"),
        (102, "In Progress"),
        (103, "Completed"),
        (104, "Blocked"),
    ]:
        database.execute(
            """
            INSERT INTO tasks (
                id, owner_id, date, title, description, category, status,
                priority, created_at
            ) VALUES (?, ?, '2026-07-16', ?, '', 'Training', ?, 'High', ?)
            """,
            (identifier, owner_id, f"Task {identifier}", status, created_at),
        )

    for identifier, status in [
        (201, "Open"),
        (202, "In Progress"),
        (203, "Resolved"),
        (204, "Closed"),
    ]:
        database.execute(
            """
            INSERT INTO issues (
                id, owner_id, date, title, description, severity, status,
                resolution_notes, created_at
            ) VALUES (?, ?, '2026-07-16', ?, 'Issue details', 'Critical', ?, ?, ?)
            """,
            (
                identifier,
                owner_id,
                f"Issue {identifier}",
                status,
                "" if status in {"Open", "In Progress"} else "Done",
                created_at,
            ),
        )

    for identifier in [301, 302]:
        database.execute(
            """
            INSERT INTO feedback (
                id, owner_id, date, subject, type, details, created_at
            ) VALUES (?, ?, '2026-07-16', ?, 'Suggestion', 'Details', ?)
            """,
            (identifier, owner_id, f"Feedback {identifier}", created_at),
        )

    for identifier, tags in [
        (401, ["release"]),
        (402, ["line\nbreak", "comma,tag"]),
    ]:
        database.execute(
            """
            INSERT INTO notes (
                id, owner_id, date, title, content, tags, created_at
            ) VALUES (?, ?, '2026-07-16', ?, 'Content', ?, ?)
            """,
            (
                identifier,
                owner_id,
                f"Note {identifier}",
                json.dumps(tags, separators=(",", ":")),
                created_at,
            ),
        )

    response = client.get(
        "/api/dashboard",
        headers=auth_headers(str(fixtures["recruit_token"])),
    )
    assert response.status_code == 200
    dashboard = response.json()
    assert dashboard["recruit"] == {
        "id": owner_id,
        "name": fixtures["recruit"]["name"],
    }
    assert dashboard["counts"] == {
        "tasks": 4,
        "issues": 4,
        "feedback": 2,
        "notes": 2,
    }
    assert dashboard["task_progress_percent"] == 25
    assert dashboard["open_issue_count"] == 2
    assert [issue["id"] for issue in dashboard["open_issues"]] == [202, 201]
    assert [activity["id"] for activity in dashboard["recent_activity"]] == [
        402,
        401,
        302,
        301,
        204,
        203,
        202,
        201,
        104,
        103,
    ]
    assert dashboard["recent_activity"][0]["tags"] == [
        "line\nbreak",
        "comma,tag",
    ]


@pytest.mark.parametrize(
    ("completed", "total", "expected"),
    [
        (0, 0, 0),
        (0, 4, 0),
        (1, 8, 13),
        (1, 3, 33),
        (2, 3, 67),
        (4, 4, 100),
    ],
)
def test_dashboard_progress_rounds_to_nearest_whole_percent(
    client: TestClient,
    completed: int,
    total: int,
    expected: int,
) -> None:
    admin_token = login_token(client, "admin@example.com", "bootstrap-password")
    recruit = create_user(
        client,
        admin_token,
        f"progress-{completed}-{total}@example.com",
        "Recruit",
    )
    database = client.app.state.database
    for index in range(total):
        database.execute(
            """
            INSERT INTO tasks (
                owner_id, date, title, description, category, status,
                priority, created_at
            ) VALUES (?, '2026-07-16', ?, '', 'Training', ?, 'Medium', ?)
            """,
            (
                recruit["id"],
                f"Progress task {index}",
                "Completed" if index < completed else "Not Started",
                f"2026-07-16T12:00:{index:02d}+00:00",
            ),
        )

    response = client.get(
        "/api/dashboard",
        headers=auth_headers(admin_token),
        params={"owner_id": recruit["id"]},
    )
    assert response.status_code == 200
    assert response.json()["task_progress_percent"] == expected


def test_dashboard_request_scope_has_complete_role_matrix_and_no_existence_leak(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])

    for token in [
        fixtures["recruit_token"],
        fixtures["assigned_manager_token"],
        fixtures["admin_token"],
    ]:
        response = client.get(
            "/api/dashboard",
            headers=auth_headers(str(token)),
            params={"owner_id": owner_id},
        )
        assert response.status_code == 200
        assert response.json()["recruit"]["id"] == owner_id

    denied = [
        (
            fixtures["other_recruit_token"],
            owner_id,
        ),
        (
            fixtures["assigned_manager_token"],
            fixtures["other_recruit"]["id"],
        ),
        (
            fixtures["unassigned_manager_token"],
            owner_id,
        ),
        (
            fixtures["admin_token"],
            999999,
        ),
    ]
    for token, target_id in denied:
        response = client.get(
            "/api/dashboard",
            headers=auth_headers(str(token)),
            params={"owner_id": target_id},
        )
        assert_access_denied(response)
        assert "dashboard-recruit" not in response.text
        assert "dashboard-other" not in response.text

    unauthenticated = client.get("/api/dashboard", params={"owner_id": owner_id})
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    for token in [
        fixtures["assigned_manager_token"],
        fixtures["admin_token"],
    ]:
        missing_owner = client.get(
            "/api/dashboard",
            headers=auth_headers(str(token)),
        )
        assert missing_owner.status_code == 422
        assert missing_owner.json()["error"]["fields"] == {
            "owner_id": "Owner is required"
        }


def test_dashboard_empty_state_and_metrics_refresh_after_diary_crud(
    client: TestClient,
) -> None:
    admin_token = login_token(client, "admin@example.com", "bootstrap-password")
    recruit = create_user(
        client,
        admin_token,
        "dashboard-crud@example.com",
        "Recruit",
    )
    token = login_token(client, "dashboard-crud@example.com", "created-password")
    headers = auth_headers(token)

    empty = client.get("/api/dashboard", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["counts"] == {
        "tasks": 0,
        "issues": 0,
        "feedback": 0,
        "notes": 0,
    }
    assert empty.json()["task_progress_percent"] == 0
    assert empty.json()["open_issue_count"] == 0
    assert empty.json()["recent_activity"] == []

    task = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "owner_id": recruit["id"],
            "date": "2026-07-16",
            "title": "Dashboard task",
            "description": "",
            "category": "Training",
            "status": "Not Started",
            "priority": "High",
        },
    )
    issue = client.post(
        "/api/issues",
        headers=headers,
        json={
            "owner_id": recruit["id"],
            "date": "2026-07-16",
            "title": "Dashboard issue",
            "description": "Blocked access",
            "severity": "High",
            "status": "Open",
            "resolution_notes": "",
        },
    )
    feedback = client.post(
        "/api/feedback",
        headers=headers,
        json={
            "owner_id": recruit["id"],
            "date": "2026-07-16",
            "subject": "Dashboard feedback",
            "type": "Positive",
            "details": "Good progress",
        },
    )
    note = client.post(
        "/api/notes",
        headers=headers,
        json={
            "owner_id": recruit["id"],
            "date": "2026-07-16",
            "title": "Dashboard note",
            "content": "Follow up",
            "tags": ["dashboard"],
        },
    )
    for response in [task, issue, feedback, note]:
        assert response.status_code == 201

    populated = client.get("/api/dashboard", headers=headers).json()
    assert populated["counts"] == {
        "tasks": 1,
        "issues": 1,
        "feedback": 1,
        "notes": 1,
    }
    assert populated["task_progress_percent"] == 0
    assert populated["open_issue_count"] == 1
    assert len(populated["recent_activity"]) == 4

    assert (
        client.patch(
            f"/api/tasks/{task.json()['id']}",
            headers=headers,
            json={"status": "Completed"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/issues/{issue.json()['id']}",
            headers=headers,
            json={"status": "Resolved", "resolution_notes": "Access granted"},
        ).status_code
        == 200
    )
    assert (
        client.delete(
            f"/api/feedback/{feedback.json()['id']}",
            headers=headers,
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/api/notes/{note.json()['id']}",
            headers=headers,
        ).status_code
        == 204
    )

    refreshed = client.get("/api/dashboard", headers=headers).json()
    assert refreshed["counts"] == {
        "tasks": 1,
        "issues": 1,
        "feedback": 0,
        "notes": 0,
    }
    assert refreshed["task_progress_percent"] == 100
    assert refreshed["open_issue_count"] == 0
    assert [activity["kind"] for activity in refreshed["recent_activity"]] == [
        "issue",
        "task",
    ]


def test_dashboard_resets_after_application_restart(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-password")
    app = create_app()

    with TestClient(app) as first:
        recruit = first.post(
            "/api/auth/signup",
            json={
                "email": "dashboard-restart@example.com",
                "password": "restart-password",
                "name": "Dashboard Restart",
                "department": "Engineering",
                "start_date": "2026-07-15",
            },
        )
        assert recruit.status_code == 201
        token = login_token(
            first,
            "dashboard-restart@example.com",
            "restart-password",
        )
        headers = auth_headers(token)
        created = first.post(
            "/api/tasks",
            headers=headers,
            json={
                "owner_id": recruit.json()["id"],
                "date": "2026-07-16",
                "title": "Ephemeral task",
                "description": "",
                "category": "Setup",
                "status": "Completed",
                "priority": "Medium",
            },
        )
        assert created.status_code == 201
        assert (
            first.get("/api/dashboard", headers=headers).json()["counts"]["tasks"] == 1
        )

    with TestClient(app) as restarted:
        stale = restarted.get(
            "/api/dashboard",
            headers=auth_headers(token),
            params={"owner_id": recruit.json()["id"]},
        )
        assert stale.status_code == 401
        recreated = restarted.post(
            "/api/auth/signup",
            json={
                "email": "dashboard-restart@example.com",
                "password": "restart-password",
                "name": "Dashboard Restart",
                "department": "Engineering",
                "start_date": "2026-07-15",
            },
        )
        assert recreated.status_code == 201
        restarted_token = login_token(
            restarted,
            "dashboard-restart@example.com",
            "restart-password",
        )
        dashboard = restarted.get(
            "/api/dashboard",
            headers=auth_headers(restarted_token),
        )
        assert dashboard.status_code == 200
        assert dashboard.json()["counts"] == {
            "tasks": 0,
            "issues": 0,
            "feedback": 0,
            "notes": 0,
        }
