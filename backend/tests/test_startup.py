import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.security import PBKDF2_ITERATIONS


def test_startup_requires_bootstrap_configuration() -> None:
    with pytest.raises(
        RuntimeError,
        match="BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required",
    ):
        with TestClient(create_app()):
            pass


def test_startup_rejects_invalid_bootstrap_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "not-an-email")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "short")
    with pytest.raises(RuntimeError, match="Invalid bootstrap Admin configuration"):
        with TestClient(create_app()):
            pass


def test_startup_bootstraps_one_admin_with_hashed_credentials(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "ADMIN@example.com", "password": "bootstrap-password"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "email": "admin@example.com",
        "name": "Bootstrap Admin",
        "role": "Admin",
        "department": "Administration",
        "start_date": response.json()["start_date"],
    }

    rows = client.app.state.database.connection.execute(
        "SELECT email, password_hash FROM users"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["email"] == "admin@example.com"
    assert "bootstrap-password" not in rows[0]["password_hash"]
    assert rows[0]["password_hash"].startswith(f"pbkdf2_sha256${PBKDF2_ITERATIONS}$")


def test_health_reports_in_memory_sqlite(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "sqlite-memory"}
