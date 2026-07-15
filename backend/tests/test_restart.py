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
