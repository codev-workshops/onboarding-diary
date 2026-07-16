import logging
import re

from fastapi.testclient import TestClient


def login_admin(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "bootstrap-password"},
    )
    assert response.status_code == 200


def test_error_envelopes_cover_validation_auth_not_found_and_conflict(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    unauthenticated = client.get("/api/profile")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json() == {
        "error": {
            "code": "authentication_required",
            "message": "Authentication required",
        }
    }

    invalid = client.post(
        "/api/auth/signup",
        json={**recruit_payload, "email": "not-an-email"},
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"
    assert "email" in invalid.json()["error"]["fields"]

    created = client.post("/api/auth/signup", json=recruit_payload)
    assert created.status_code == 201
    duplicate = client.post("/api/auth/signup", json=recruit_payload)
    assert duplicate.status_code == 409
    assert duplicate.json() == {
        "error": {
            "code": "email_conflict",
            "message": "An account with this email already exists",
            "fields": {"email": "Email is already in use"},
        }
    }

    recruit_login = client.post(
        "/api/auth/login",
        json={
            "email": recruit_payload["email"],
            "password": recruit_payload["password"],
        },
    )
    assert recruit_login.status_code == 200
    forbidden = client.get("/api/admin/users")
    assert forbidden.status_code == 403
    assert forbidden.json() == {
        "error": {"code": "access_denied", "message": "Access denied"}
    }

    login_admin(client)
    missing = client.get("/api/admin/users/999999")
    assert missing.status_code == 404
    assert missing.json() == {
        "error": {"code": "not_found", "message": "User not found"}
    }


def test_request_logs_are_structured_and_exclude_sensitive_values(
    client: TestClient,
    recruit_payload: dict[str, str],
    caplog,
) -> None:
    password = "never-log-this-password"
    title = "never-log-this-diary-title"
    details = "never-log-this-diary-content"
    payload = {
        **recruit_payload,
        "email": "request-log-recruit@example.com",
        "password": password,
    }

    with caplog.at_level(logging.INFO, logger="onboarding_diary.requests"):
        assert client.post("/api/auth/signup", json=payload).status_code == 201
        login = client.post(
            "/api/auth/login",
            json={"email": payload["email"], "password": password},
        )
        assert login.status_code == 200
        session_id = login.cookies["session_id"]
        created = client.post(
            "/api/tasks",
            json={
                "date": "2026-07-16",
                "title": title,
                "description": details,
                "category": "Training",
                "status": "Not Started",
                "priority": "Medium",
            },
        )

    assert created.status_code == 201
    assert re.fullmatch(r"[0-9a-f]{32}", created.headers["x-request-id"])
    request_logs = "\n".join(
        record.getMessage()
        for record in caplog.records
        if record.name == "onboarding_diary.requests"
    )
    for record in caplog.records:
        if record.name == "onboarding_diary.requests":
            assert re.fullmatch(
                r"request method=[A-Z]+ route=/\S* status=\d{3} "
                r"request_id=[0-9a-f]{32}",
                record.getMessage(),
            )
    assert (
        "request method=POST route=/api/auth/login status=200 request_id="
        in request_logs
    )
    assert "request method=POST route=/api/tasks status=201 request_id=" in request_logs
    assert password not in request_logs
    assert session_id not in request_logs
    assert payload["email"] not in request_logs
    assert title not in request_logs
    assert details not in request_logs
