import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-password")
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def recruit_payload() -> dict[str, str]:
    return {
        "email": "recruit@example.com",
        "password": "recruit-password",
        "name": "New Recruit",
        "department": "Engineering",
        "start_date": "2026-07-15",
    }


@pytest.fixture(autouse=True)
def clear_bootstrap_environment() -> Iterator[None]:
    previous_email = os.environ.pop("BOOTSTRAP_ADMIN_EMAIL", None)
    previous_password = os.environ.pop("BOOTSTRAP_ADMIN_PASSWORD", None)
    yield
    if previous_email is not None:
        os.environ["BOOTSTRAP_ADMIN_EMAIL"] = previous_email
    if previous_password is not None:
        os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = previous_password
