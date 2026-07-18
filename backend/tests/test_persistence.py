import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import (
    Database,
    PostgresDatabase,
    convert_placeholders,
    create_database,
)
from app.main import create_app
from app.settings import DataStoreSettings, load_env_file


@pytest.fixture(autouse=True)
def clear_store_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PERSISTENT_STORE", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ENV_FILE", raising=False)


def test_convert_placeholders_replaces_positional_markers() -> None:
    assert (
        convert_placeholders("SELECT * FROM users WHERE id = ? AND role = ?")
        == "SELECT * FROM users WHERE id = %s AND role = %s"
    )


def test_convert_placeholders_skips_quoted_literals() -> None:
    query = "SELECT * FROM notes WHERE title = 'what?' AND id = ?"
    assert (
        convert_placeholders(query)
        == "SELECT * FROM notes WHERE title = 'what?' AND id = %s"
    )


def test_load_env_file_parses_values_and_ignores_comments(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# comment\n"
        "\n"
        "PERSISTENT_STORE=on\n"
        'DATABASE_URL="postgresql://user:secret@localhost:5432/diary"\n'
        "not a pair\n",
        encoding="utf-8",
    )
    loaded = load_env_file(env_file)
    assert loaded == {
        "PERSISTENT_STORE": "on",
        "DATABASE_URL": "postgresql://user:secret@localhost:5432/diary",
    }


def test_load_env_file_does_not_override_environment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PERSISTENT_STORE", "off")
    env_file = tmp_path / ".env"
    env_file.write_text("PERSISTENT_STORE=on\n", encoding="utf-8")
    load_env_file(env_file)
    assert os.environ["PERSISTENT_STORE"] == "off"


def test_load_env_file_missing_file_returns_empty(tmp_path: Path) -> None:
    assert load_env_file(tmp_path / "absent.env") == {}


def test_settings_read_flag_and_url_from_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PERSISTENT_STORE", "on")
    monkeypatch.setenv("DATABASE_URL", "postgresql://example/diary")
    settings = DataStoreSettings.from_environment()
    assert settings.persistent_store_enabled is True
    assert settings.database_url == "postgresql://example/diary"


def test_settings_default_to_in_memory_store() -> None:
    settings = DataStoreSettings.from_environment()
    assert settings.persistent_store_enabled is False


def test_create_database_defaults_to_sqlite() -> None:
    database = create_database()
    try:
        assert isinstance(database, Database)
        assert database.store_name == "sqlite-memory"
    finally:
        database.close()


def test_create_database_ignores_url_when_flag_off(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PERSISTENT_STORE", "off")
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://user:secret@127.0.0.1:9/unreachable"
    )
    database = create_database()
    try:
        assert isinstance(database, Database)
    finally:
        database.close()


def test_create_database_falls_back_when_url_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PERSISTENT_STORE", "on")
    database = create_database()
    try:
        assert isinstance(database, Database)
    finally:
        database.close()


def test_create_database_falls_back_when_postgres_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PERSISTENT_STORE", "on")
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://user:secret@127.0.0.1:9/unreachable"
    )
    database = create_database()
    try:
        assert isinstance(database, Database)
    finally:
        database.close()


def test_app_starts_and_serves_when_postgres_unreachable(
    monkeypatch: pytest.MonkeyPatch,
    recruit_payload: dict[str, str],
) -> None:
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-password")
    monkeypatch.setenv("PERSISTENT_STORE", "on")
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://user:secret@127.0.0.1:9/unreachable"
    )
    app = create_app()
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok", "database": "sqlite-memory"}
        assert client.post("/api/auth/signup", json=recruit_payload).status_code == 201


@pytest.mark.skipif(
    not os.getenv("PERSISTENT_TEST_DATABASE_URL"),
    reason="PERSISTENT_TEST_DATABASE_URL is not set",
)
def test_data_survives_restart_with_postgres(
    monkeypatch: pytest.MonkeyPatch,
    recruit_payload: dict[str, str],
) -> None:
    database_url = os.environ["PERSISTENT_TEST_DATABASE_URL"]
    setup = PostgresDatabase(database_url)
    for table in (
        "notes",
        "feedback",
        "issues",
        "tasks",
        "manager_assignments",
        "sessions",
        "users",
    ):
        setup.execute(f"DELETE FROM {table}")
    setup.close()

    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-password")
    monkeypatch.setenv("PERSISTENT_STORE", "on")
    monkeypatch.setenv("DATABASE_URL", database_url)

    app = create_app()
    with TestClient(app) as first:
        health = first.get("/api/health")
        assert health.json() == {"status": "ok", "database": "postgres"}
        assert first.post("/api/auth/signup", json=recruit_payload).status_code == 201

    restarted_app = create_app()
    with TestClient(restarted_app) as restarted:
        login = restarted.post(
            "/api/auth/login",
            json={
                "email": recruit_payload["email"],
                "password": recruit_payload["password"],
            },
        )
        assert login.status_code == 200
        assert restarted.get("/api/profile").status_code == 200
