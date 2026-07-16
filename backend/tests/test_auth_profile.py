from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import LOGIN_FAILURE_LIMIT, LoginThrottle
from app.security import PBKDF2_ITERATIONS


def signup(
    client: TestClient,
    payload: dict[str, str],
) -> dict[str, object]:
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    return response.json()


def login(
    client: TestClient,
    email: str = "recruit@example.com",
    password: str = "recruit-password",
) -> object:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response


def test_signup_creates_recruit_and_never_stores_plaintext(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    profile = signup(client, recruit_payload)
    assert profile == {
        "id": 2,
        "email": "recruit@example.com",
        "name": "New Recruit",
        "role": "Recruit",
        "department": "Engineering",
        "start_date": "2026-07-15",
    }
    assert set(profile) == {
        "id",
        "email",
        "name",
        "role",
        "department",
        "start_date",
    }

    row = client.app.state.database.fetchone(
        "SELECT password_hash FROM users WHERE email = ?",
        ("recruit@example.com",),
    )
    assert row is not None
    assert recruit_payload["password"] not in row["password_hash"]
    assert row["password_hash"].startswith(f"pbkdf2_sha256${PBKDF2_ITERATIONS}$")


@pytest.mark.parametrize("length", [8, 128])
def test_signup_accepts_password_boundaries(
    client: TestClient,
    recruit_payload: dict[str, str],
    length: int,
) -> None:
    response = client.post(
        "/api/auth/signup",
        json={
            **recruit_payload,
            "email": f"boundary-{length}@example.com",
            "password": "x" * length,
        },
    )
    assert response.status_code == 201


def test_equal_passwords_receive_distinct_random_salts(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    signup(
        client,
        {**recruit_payload, "email": "second-recruit@example.com"},
    )
    rows = client.app.state.database.connection.execute(
        """
        SELECT password_hash
        FROM users
        WHERE email IN (?, ?)
        ORDER BY id
        """,
        ("recruit@example.com", "second-recruit@example.com"),
    ).fetchall()
    assert len(rows) == 2
    assert rows[0]["password_hash"] != rows[1]["password_hash"]


def test_signup_rejects_duplicate_email_and_privileged_fields(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    duplicate = {**recruit_payload, "email": " RECRUIT@example.com "}
    response = client.post("/api/auth/signup", json=duplicate)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_conflict"

    for field, value in (("role", "Admin"), ("manager_id", 1)):
        response = client.post(
            "/api/auth/signup",
            json={**recruit_payload, "email": f"{field}@example.com", field: value},
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        assert field in response.json()["error"]["fields"]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("email", "invalid"),
        ("password", "short"),
        ("password", "x" * 129),
        ("name", " "),
        ("name", "x" * 101),
        ("department", ""),
        ("department", "x" * 101),
        ("start_date", "2026-02-30"),
    ],
)
def test_signup_validation_does_not_store_invalid_data(
    client: TestClient,
    recruit_payload: dict[str, str],
    field: str,
    value: str,
) -> None:
    response = client.post(
        "/api/auth/signup",
        json={**recruit_payload, field: value},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    count = client.app.state.database.fetchone("SELECT COUNT(*) AS count FROM users")
    assert count["count"] == 1


def test_login_session_profile_and_logout(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    response = login(client)
    set_cookie = response.headers["set-cookie"].lower()
    assert "session_id=" in set_cookie
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "max-age=28800" in set_cookie
    assert "secure" not in set_cookie
    token = client.cookies.get("session_id")
    assert token is not None
    assert len(token) >= 32

    profile = client.get("/api/profile")
    assert profile.status_code == 200
    assert profile.json()["role"] == "Recruit"
    assert "password" not in profile.text
    assert "session" not in profile.text

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 204
    assert "max-age=0" in logout.headers["set-cookie"].lower()
    protected = client.get(
        "/api/profile",
        headers={"Cookie": f"session_id={token}"},
    )
    assert protected.status_code == 401
    assert protected.json()["error"]["code"] == "authentication_required"


def test_https_login_marks_cookie_secure(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    response = client.post(
        "https://testserver/api/auth/login",
        json={
            "email": recruit_payload["email"],
            "password": recruit_payload["password"],
        },
    )
    assert response.status_code == 200
    assert "secure" in response.headers["set-cookie"].lower()
    logout = client.post("https://testserver/api/auth/logout")
    delete_cookie = logout.headers["set-cookie"].lower()
    assert logout.status_code == 204
    assert "max-age=0" in delete_cookie
    assert "httponly" in delete_cookie
    assert "path=/" in delete_cookie
    assert "samesite=lax" in delete_cookie
    assert "secure" in delete_cookie


def test_invalid_credentials_use_same_generic_response(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    unknown = client.post(
        "/api/auth/login",
        json={"email": "unknown@example.com", "password": "wrong-password"},
    )
    wrong = client.post(
        "/api/auth/login",
        json={"email": recruit_payload["email"], "password": "wrong-password"},
    )
    assert unknown.status_code == wrong.status_code == 401
    assert (
        unknown.json()
        == wrong.json()
        == {
            "error": {
                "code": "invalid_credentials",
                "message": "Invalid email or password",
            }
        }
    )


def test_login_throttle_preserves_generic_failure_and_creates_no_session(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    expected = {
        "error": {
            "code": "invalid_credentials",
            "message": "Invalid email or password",
        }
    }
    for attempt in range(LOGIN_FAILURE_LIMIT):
        email = (
            recruit_payload["email"]
            if attempt % 2
            else f"unknown-{attempt}@example.com"
        )
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert response.status_code == 401
        assert response.json() == expected

    throttled = client.post(
        "/api/auth/login",
        json={
            "email": recruit_payload["email"],
            "password": recruit_payload["password"],
        },
    )
    assert throttled.status_code == 401
    assert throttled.json() == expected
    sessions = client.app.state.database.fetchone(
        "SELECT COUNT(*) AS count FROM sessions"
    )
    assert sessions["count"] == 0


def test_login_throttle_is_per_client_and_not_an_account_lockout() -> None:
    throttle = LoginThrottle(limit=2, window_seconds=60)
    throttle.record_failure("client-a")
    throttle.record_failure("client-a")
    assert throttle.is_limited("client-a")
    assert not throttle.is_limited("client-b")

    throttle.clear("client-a")
    assert not throttle.is_limited("client-a")


def test_missing_and_expired_sessions_are_rejected(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    missing = client.get("/api/profile")
    assert missing.status_code == 401

    signup(client, recruit_payload)
    login(client)
    token = client.cookies.get("session_id")
    client.app.state.database.execute(
        "UPDATE sessions SET expires_at = ? WHERE token = ?",
        ((datetime.now(UTC) - timedelta(seconds=1)).isoformat(), token),
    )
    expired = client.get("/api/profile")
    assert expired.status_code == 401
    row = client.app.state.database.fetchone(
        "SELECT token FROM sessions WHERE token = ?",
        (token,),
    )
    assert row is None


def test_profile_update_allows_only_self_editable_fields(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    login(client)
    response = client.patch(
        "/api/profile",
        json={
            "name": " Updated Recruit ",
            "email": "updated@example.com",
            "department": " Product ",
            "start_date": "2026-08-01",
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": 2,
        "email": "updated@example.com",
        "name": "Updated Recruit",
        "role": "Recruit",
        "department": "Product",
        "start_date": "2026-08-01",
    }

    for body in ({"role": "Admin"}, {"manager_id": 1}, {"id": 99}):
        rejected = client.patch("/api/profile", json=body)
        assert rejected.status_code == 422
    assert client.get("/api/profile").json()["role"] == "Recruit"


@pytest.mark.parametrize(
    "body",
    [
        {"email": "invalid"},
        {"email": None},
        {"name": ""},
        {"name": None},
        {"name": "x" * 101},
        {"department": " "},
        {"department": None},
        {"department": "x" * 101},
        {"start_date": "not-a-date"},
        {"start_date": None},
    ],
)
def test_profile_validation_preserves_existing_data(
    client: TestClient,
    recruit_payload: dict[str, str],
    body: dict[str, str | None],
) -> None:
    signup(client, recruit_payload)
    login(client)
    before = client.get("/api/profile").json()
    response = client.patch("/api/profile", json=body)
    assert response.status_code == 422
    assert client.get("/api/profile").json() == before


def test_profile_duplicate_email_returns_conflict_without_mutation(
    client: TestClient,
    recruit_payload: dict[str, str],
) -> None:
    signup(client, recruit_payload)
    login(client)
    response = client.patch("/api/profile", json={"email": "ADMIN@EXAMPLE.COM"})
    assert response.status_code == 409
    assert client.get("/api/profile").json()["email"] == recruit_payload["email"]
