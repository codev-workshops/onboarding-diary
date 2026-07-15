import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.authorization import authorize_recruit_scope, authorize_report_scope
from app.main import ApiError


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


def admin_token(client: TestClient) -> str:
    return login_token(client, "admin@example.com", "bootstrap-password")


def create_user(
    client: TestClient,
    token: str,
    email: str,
    role: str,
    password: str = "created-password",
) -> dict[str, object]:
    response = client.post(
        "/api/admin/users",
        headers=auth_headers(token),
        json={
            "email": email,
            "password": password,
            "name": f"{role} User",
            "role": role,
            "department": "Engineering",
            "start_date": "2026-07-15",
        },
    )
    assert response.status_code == 201
    return response.json()


def signup_recruit(
    client: TestClient,
    email: str,
    password: str = "recruit-password",
) -> dict[str, object]:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "password": password,
            "name": "Public Recruit",
            "department": "Engineering",
            "start_date": "2026-07-15",
        },
    )
    assert response.status_code == 201
    return response.json()


def row_for(client: TestClient, user_id: int) -> sqlite3.Row:
    row = client.app.state.database.fetchone(
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    )
    assert row is not None
    return row


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/api/admin/users", None),
        ("POST", "/api/admin/users", {}),
        ("GET", "/api/admin/users/1", None),
        ("PATCH", "/api/admin/users/1", {}),
        ("DELETE", "/api/admin/users/1", None),
        ("PUT", "/api/admin/recruits/2/manager", {"manager_id": 3}),
        ("DELETE", "/api/admin/recruits/2/manager", None),
    ],
)
def test_admin_endpoints_require_authentication_and_admin_role_without_mutation(
    client: TestClient,
    method: str,
    path: str,
    body: dict[str, object] | None,
) -> None:
    before = client.app.state.database.fetchone("SELECT COUNT(*) AS count FROM users")
    unauthenticated = client.request(method, path, json=body)
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "authentication_required"

    signup_recruit(client, "denied@example.com")
    recruit = login_token(client, "denied@example.com", "recruit-password")
    denied = client.request(method, path, headers=auth_headers(recruit), json=body)
    assert denied.status_code == 403
    assert denied.json() == {
        "error": {"code": "access_denied", "message": "Access denied"}
    }
    after = client.app.state.database.fetchone("SELECT COUNT(*) AS count FROM users")
    assert before is not None
    assert after is not None
    assert after["count"] == before["count"] + 1


def test_admin_user_crud_validation_and_safe_responses(client: TestClient) -> None:
    token = admin_token(client)
    manager = create_user(client, token, "manager@example.com", "Manager")
    recruit = create_user(client, token, "recruit@example.com", "Recruit")
    second_admin = create_user(client, token, "admin2@example.com", "Admin")

    listed = client.get("/api/admin/users", headers=auth_headers(token))
    assert listed.status_code == 200
    assert [user["id"] for user in listed.json()] == [1, 2, 3, 4]
    assert all("password" not in user for user in listed.json())
    assert listed.json()[2]["assigned_manager_id"] is None

    fetched = client.get(
        f"/api/admin/users/{manager['id']}",
        headers=auth_headers(token),
    )
    assert fetched.status_code == 200
    assert fetched.json()["role"] == "Manager"

    patched = client.patch(
        f"/api/admin/users/{recruit['id']}",
        headers=auth_headers(token),
        json={
            "name": " Updated Recruit ",
            "email": "updated-recruit@example.com",
            "department": " Product ",
            "start_date": "2026-08-01",
        },
    )
    assert patched.status_code == 200
    assert patched.json() == {
        "id": recruit["id"],
        "email": "updated-recruit@example.com",
        "name": "Updated Recruit",
        "role": "Recruit",
        "department": "Product",
        "start_date": "2026-08-01",
        "assigned_manager_id": None,
    }

    duplicate = client.post(
        "/api/admin/users",
        headers=auth_headers(token),
        json={
            "email": "MANAGER@example.com",
            "password": "created-password",
            "name": "Duplicate",
            "role": "Recruit",
            "department": "Engineering",
            "start_date": "2026-07-15",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_conflict"

    for body in (
        {"role": "Owner"},
        {"role": None},
        {"password": "not-admin-editable"},
        {"manager_id": manager["id"]},
        {"name": ""},
        {"start_date": "invalid"},
    ):
        response = client.patch(
            f"/api/admin/users/{second_admin['id']}",
            headers=auth_headers(token),
            json=body,
        )
        assert response.status_code == 422

    missing = client.get("/api/admin/users/9999", headers=auth_headers(token))
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"


def test_zero_or_one_assignment_replacement_and_role_scope_contract(
    client: TestClient,
) -> None:
    token = admin_token(client)
    manager_one = create_user(client, token, "manager1@example.com", "Manager")
    manager_two = create_user(client, token, "manager2@example.com", "Manager")
    recruit_one = create_user(client, token, "recruit1@example.com", "Recruit")
    recruit_two = create_user(client, token, "recruit2@example.com", "Recruit")

    assigned = client.put(
        f"/api/admin/recruits/{recruit_one['id']}/manager",
        headers=auth_headers(token),
        json={"manager_id": manager_one["id"]},
    )
    assert assigned.status_code == 200
    assert assigned.json()["assigned_manager_id"] == manager_one["id"]

    replaced = client.put(
        f"/api/admin/recruits/{recruit_one['id']}/manager",
        headers=auth_headers(token),
        json={"manager_id": manager_two["id"]},
    )
    assert replaced.status_code == 200
    assert replaced.json()["assigned_manager_id"] == manager_two["id"]
    links = client.app.state.database.fetchall(
        "SELECT recruit_id, manager_id FROM manager_assignments"
    )
    assert [tuple(link) for link in links] == [(recruit_one["id"], manager_two["id"])]

    database = client.app.state.database
    admin = row_for(client, 1)
    first_manager = row_for(client, int(manager_one["id"]))
    second_manager = row_for(client, int(manager_two["id"]))
    first_recruit = row_for(client, int(recruit_one["id"]))

    assert (
        authorize_recruit_scope(
            database,
            first_recruit,
            int(recruit_one["id"]),
            ApiError,
        )["id"]
        == recruit_one["id"]
    )
    assert (
        authorize_recruit_scope(
            database,
            second_manager,
            int(recruit_one["id"]),
            ApiError,
        )["id"]
        == recruit_one["id"]
    )
    assert (
        authorize_report_scope(
            database,
            admin,
            int(recruit_two["id"]),
            ApiError,
        )["id"]
        == recruit_two["id"]
    )

    denied_cases = [
        (first_recruit, int(recruit_two["id"])),
        (first_manager, int(recruit_one["id"])),
        (second_manager, int(recruit_two["id"])),
        (second_manager, 9999),
    ]
    for actor, target_id in denied_cases:
        with pytest.raises(ApiError) as caught:
            authorize_recruit_scope(database, actor, target_id, ApiError)
        assert caught.value.status_code == 403
        assert caught.value.code == "access_denied"
        assert caught.value.message == "Access denied"

    with pytest.raises(ApiError) as missing:
        authorize_report_scope(database, admin, 9999, ApiError)
    assert missing.value.status_code == 404

    removed = client.delete(
        f"/api/admin/recruits/{recruit_one['id']}/manager",
        headers=auth_headers(token),
    )
    assert removed.status_code == 204
    assert client.app.state.database.fetchall("SELECT * FROM manager_assignments") == []


def test_assignment_rejects_invalid_roles_and_missing_users(
    client: TestClient,
) -> None:
    token = admin_token(client)
    manager = create_user(client, token, "manager@example.com", "Manager")
    recruit = create_user(client, token, "recruit@example.com", "Recruit")
    other_recruit = create_user(client, token, "other@example.com", "Recruit")

    for recruit_id, manager_id, expected in (
        (manager["id"], manager["id"], "recruit_id"),
        (recruit["id"], other_recruit["id"], "manager_id"),
    ):
        response = client.put(
            f"/api/admin/recruits/{recruit_id}/manager",
            headers=auth_headers(token),
            json={"manager_id": manager_id},
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "invalid_assignment"
        assert expected in response.json()["error"]["fields"]

    missing_recruit = client.put(
        "/api/admin/recruits/9999/manager",
        headers=auth_headers(token),
        json={"manager_id": manager["id"]},
    )
    assert missing_recruit.status_code == 404
    missing_manager = client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(token),
        json={"manager_id": 9999},
    )
    assert missing_manager.status_code == 404


def test_role_changes_invalidate_sessions_and_invalid_assignments(
    client: TestClient,
) -> None:
    token = admin_token(client)
    manager = create_user(client, token, "manager@example.com", "Manager")
    recruit = create_user(client, token, "recruit@example.com", "Recruit")
    client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(token),
        json={"manager_id": manager["id"]},
    )
    manager_session = login_token(client, "manager@example.com", "created-password")
    recruit_session = login_token(client, "recruit@example.com", "created-password")

    changed_manager = client.patch(
        f"/api/admin/users/{manager['id']}",
        headers=auth_headers(token),
        json={"role": "Recruit"},
    )
    assert changed_manager.status_code == 200
    assert changed_manager.json()["role"] == "Recruit"
    assert (
        client.get("/api/profile", headers=auth_headers(manager_session)).status_code
        == 401
    )
    assert client.app.state.database.fetchall("SELECT * FROM manager_assignments") == []

    changed_recruit = client.patch(
        f"/api/admin/users/{recruit['id']}",
        headers=auth_headers(token),
        json={"role": "Manager"},
    )
    assert changed_recruit.status_code == 200
    assert changed_recruit.json()["role"] == "Manager"
    assert (
        client.get("/api/profile", headers=auth_headers(recruit_session)).status_code
        == 401
    )


def test_user_deletion_cascades_sessions_assignments_and_owned_relationships(
    client: TestClient,
) -> None:
    token = admin_token(client)
    manager = create_user(client, token, "manager@example.com", "Manager")
    recruit = create_user(client, token, "recruit@example.com", "Recruit")
    client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(token),
        json={"manager_id": manager["id"]},
    )
    manager_session = login_token(client, "manager@example.com", "created-password")
    recruit_session = login_token(client, "recruit@example.com", "created-password")
    database = client.app.state.database
    database.execute(
        """
        CREATE TABLE future_owned_records (
            id INTEGER PRIMARY KEY,
            owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    database.execute(
        "INSERT INTO future_owned_records (owner_id) VALUES (?)",
        (recruit["id"],),
    )

    deleted_manager = client.delete(
        f"/api/admin/users/{manager['id']}",
        headers=auth_headers(token),
    )
    assert deleted_manager.status_code == 204
    assert (
        client.get(
            "/api/profile",
            headers=auth_headers(manager_session),
        ).status_code
        == 401
    )
    assert database.fetchall("SELECT * FROM manager_assignments") == []

    deleted_recruit = client.delete(
        f"/api/admin/users/{recruit['id']}",
        headers=auth_headers(token),
    )
    assert deleted_recruit.status_code == 204
    assert (
        client.get(
            "/api/profile",
            headers=auth_headers(recruit_session),
        ).status_code
        == 401
    )
    assert database.fetchall("SELECT * FROM future_owned_records") == []


def test_admin_self_last_admin_and_role_change_conflicts(
    client: TestClient,
) -> None:
    bootstrap = admin_token(client)
    self_delete = client.delete("/api/admin/users/1", headers=auth_headers(bootstrap))
    assert self_delete.status_code == 409
    assert self_delete.json()["error"]["code"] == "invalid_state"

    self_role = client.patch(
        "/api/admin/users/1",
        headers=auth_headers(bootstrap),
        json={"role": "Manager"},
    )
    assert self_role.status_code == 409

    second = create_user(client, bootstrap, "admin2@example.com", "Admin")
    second_token = login_token(client, "admin2@example.com", "created-password")
    demote_bootstrap = client.patch(
        "/api/admin/users/1",
        headers=auth_headers(second_token),
        json={"role": "Recruit"},
    )
    assert demote_bootstrap.status_code == 200
    assert (
        client.get("/api/profile", headers=auth_headers(bootstrap)).status_code == 401
    )

    last_admin_self_delete = client.delete(
        f"/api/admin/users/{second['id']}",
        headers=auth_headers(second_token),
    )
    assert last_admin_self_delete.status_code == 409
    last_admin_self_role = client.patch(
        f"/api/admin/users/{second['id']}",
        headers=auth_headers(second_token),
        json={"role": "Recruit"},
    )
    assert last_admin_self_role.status_code == 409
