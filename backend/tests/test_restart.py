import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_restart_resets_users_and_sessions_and_rebootstraps_admin(
    monkeypatch: pytest.MonkeyPatch,
    recruit_payload: dict[str, str],
) -> None:
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-password")
    app = create_app()

    with TestClient(app) as first:
        assert first.post("/api/auth/signup", json=recruit_payload).status_code == 201
        assert (
            first.post(
                "/api/auth/login",
                json={
                    "email": recruit_payload["email"],
                    "password": recruit_payload["password"],
                },
            ).status_code
            == 200
        )
        first_token = first.cookies.get("session_id")
        assert first_token is not None
        first.cookies.clear()
        assert (
            first.post(
                "/api/auth/login",
                json={
                    "email": "admin@example.com",
                    "password": "bootstrap-password",
                },
            ).status_code
            == 200
        )
        manager = first.post(
            "/api/admin/users",
            json={
                "email": "manager@example.com",
                "password": "manager-password",
                "name": "Restart Manager",
                "role": "Manager",
                "department": "Engineering",
                "start_date": "2026-07-15",
            },
        )
        assert manager.status_code == 201
        assignment = first.put(
            "/api/admin/recruits/2/manager",
            json={"manager_id": manager.json()["id"]},
        )
        assert assignment.status_code == 200
        assert (
            first.post(
                "/api/feedback",
                json={
                    "owner_id": 2,
                    "date": "2026-07-15",
                    "subject": "Restart feedback",
                    "type": "Positive",
                    "details": "This feedback should not survive a restart.",
                },
            ).status_code
            == 201
        )
        assert (
            first.post(
                "/api/notes",
                json={
                    "owner_id": 2,
                    "date": "2026-07-15",
                    "title": "Restart note",
                    "content": "This note should not survive a restart.",
                    "tags": ["restart"],
                },
            ).status_code
            == 201
        )
        assert (
            first.app.state.database.fetchone(
                "SELECT COUNT(*) AS count FROM manager_assignments"
            )["count"]
            == 1
        )

    with TestClient(app) as restarted:
        stale_session = restarted.get(
            "/api/profile",
            headers={"Cookie": f"session_id={first_token}"},
        )
        assert stale_session.status_code == 401
        recruit_login = restarted.post(
            "/api/auth/login",
            json={
                "email": recruit_payload["email"],
                "password": recruit_payload["password"],
            },
        )
        assert recruit_login.status_code == 401
        admin_login = restarted.post(
            "/api/auth/login",
            json={
                "email": "admin@example.com",
                "password": "bootstrap-password",
            },
        )
        assert admin_login.status_code == 200
        count = restarted.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM users"
        )
        assert count["count"] == 1
        assignments = restarted.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM manager_assignments"
        )
        assert assignments["count"] == 0
        feedback = restarted.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM feedback"
        )
        assert feedback["count"] == 0
        notes = restarted.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM notes"
        )
        assert notes["count"] == 0
