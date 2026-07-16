import pytest
from fastapi.testclient import TestClient


TASK_PAYLOAD = {
    "date": "2026-07-15",
    "title": "Complete security training",
    "description": "Finish the assigned module",
    "category": "Training",
    "status": "Not Started",
    "priority": "High",
}

ISSUE_PAYLOAD = {
    "date": "2026-07-15",
    "title": "VPN access blocked",
    "description": "The VPN client rejects the assigned account",
    "severity": "High",
    "status": "Open",
    "resolution_notes": "",
}


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
    admin = login_token(client, "admin@example.com", "bootstrap-password")
    recruit = create_user(client, admin, "recruit@example.com", "Recruit")
    other_recruit = create_user(client, admin, "other@example.com", "Recruit")
    assigned_manager = create_user(
        client, admin, "assigned-manager@example.com", "Manager"
    )
    unassigned_manager = create_user(
        client, admin, "unassigned-manager@example.com", "Manager"
    )
    assigned = client.put(
        f"/api/admin/recruits/{recruit['id']}/manager",
        headers=auth_headers(admin),
        json={"manager_id": assigned_manager["id"]},
    )
    assert assigned.status_code == 200
    return {
        "admin": admin,
        "recruit": recruit,
        "recruit_token": login_token(client, "recruit@example.com", "created-password"),
        "other_recruit": other_recruit,
        "other_recruit_token": login_token(
            client, "other@example.com", "created-password"
        ),
        "assigned_manager": assigned_manager,
        "assigned_manager_token": login_token(
            client, "assigned-manager@example.com", "created-password"
        ),
        "unassigned_manager": unassigned_manager,
        "unassigned_manager_token": login_token(
            client, "unassigned-manager@example.com", "created-password"
        ),
    }


def create_entry(
    client: TestClient,
    resource: str,
    token: str,
    owner_id: int,
    suffix: str,
) -> dict[str, object]:
    payload = dict(TASK_PAYLOAD if resource == "tasks" else ISSUE_PAYLOAD)
    payload["owner_id"] = owner_id
    payload["title"] = f"{payload['title']} {suffix}"
    response = client.post(
        f"/api/{resource}",
        headers=auth_headers(token),
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def assert_access_denied(response: object) -> None:
    assert response.status_code == 403
    assert response.json() == {
        "error": {
            "code": "access_denied",
            "message": "Access denied",
        }
    }


@pytest.mark.parametrize("resource", ["tasks", "issues"])
def test_request_authorization_allows_complete_in_scope_role_matrix(
    client: TestClient,
    resource: str,
) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    actors = [
        ("recruit", str(fixtures["recruit_token"])),
        ("manager", str(fixtures["assigned_manager_token"])),
        ("admin", str(fixtures["admin"])),
    ]
    patch = {"status": "Completed"} if resource == "tasks" else {"severity": "Critical"}

    for actor_name, token in actors:
        created = create_entry(
            client,
            resource,
            token,
            owner_id,
            f"{actor_name}-create",
        )
        listed = client.get(
            f"/api/{resource}",
            headers=auth_headers(token),
            params={"owner_id": owner_id},
        )
        assert listed.status_code == 200
        assert created["id"] in [entry["id"] for entry in listed.json()]

        fetched = client.get(
            f"/api/{resource}/{created['id']}",
            headers=auth_headers(token),
        )
        assert fetched.status_code == 200
        assert fetched.json()["owner_id"] == owner_id

        updated = client.patch(
            f"/api/{resource}/{created['id']}",
            headers=auth_headers(token),
            json=patch,
        )
        assert updated.status_code == 200
        for field, value in patch.items():
            assert updated.json()[field] == value

        deleted = client.delete(
            f"/api/{resource}/{created['id']}",
            headers=auth_headers(token),
        )
        assert deleted.status_code == 204
        after = client.get(
            f"/api/{resource}",
            headers=auth_headers(token),
            params={"owner_id": owner_id},
        )
        assert created["id"] not in [entry["id"] for entry in after.json()]


@pytest.mark.parametrize("resource", ["tasks", "issues"])
def test_request_authorization_denies_every_operation_without_leak_or_mutation(
    client: TestClient,
    resource: str,
) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    seed = create_entry(
        client,
        resource,
        str(fixtures["recruit_token"]),
        owner_id,
        "protected",
    )
    denied_actors = [
        ("other-recruit", str(fixtures["other_recruit_token"]), owner_id),
        (
            "unassigned-manager",
            str(fixtures["unassigned_manager_token"]),
            owner_id,
        ),
        ("assigned-manager-unknown", str(fixtures["assigned_manager_token"]), 99999),
        ("admin-unknown", str(fixtures["admin"]), 99999),
    ]
    create_payload = dict(TASK_PAYLOAD if resource == "tasks" else ISSUE_PAYLOAD)
    patch_payload = {"title": "Tampered title"}

    for actor_name, token, target_id in denied_actors:
        before = client.app.state.database.fetchone(
            f"SELECT * FROM {resource} WHERE id = ?",
            (seed["id"],),
        )
        assert before is not None

        assert_access_denied(
            client.get(
                f"/api/{resource}",
                headers=auth_headers(token),
                params={"owner_id": target_id},
            )
        )

        item_id = int(seed["id"]) if target_id == owner_id else 99999
        assert_access_denied(
            client.get(
                f"/api/{resource}/{item_id}",
                headers=auth_headers(token),
            )
        )

        denied_create = dict(create_payload)
        denied_create["owner_id"] = target_id
        denied_create["title"] = f"Denied {actor_name}"
        assert_access_denied(
            client.post(
                f"/api/{resource}",
                headers=auth_headers(token),
                json=denied_create,
            )
        )

        assert_access_denied(
            client.patch(
                f"/api/{resource}/{item_id}",
                headers=auth_headers(token),
                json=patch_payload,
            )
        )
        assert_access_denied(
            client.delete(
                f"/api/{resource}/{item_id}",
                headers=auth_headers(token),
            )
        )

        after = client.app.state.database.fetchone(
            f"SELECT * FROM {resource} WHERE id = ?",
            (seed["id"],),
        )
        assert after is not None
        assert dict(after) == dict(before)


@pytest.mark.parametrize("resource", ["tasks", "issues"])
def test_diary_endpoints_require_authentication_and_selected_owner(
    client: TestClient,
    resource: str,
) -> None:
    payload = dict(TASK_PAYLOAD if resource == "tasks" else ISSUE_PAYLOAD)
    for method, path, body in [
        ("GET", f"/api/{resource}", None),
        ("POST", f"/api/{resource}", payload),
        ("GET", f"/api/{resource}/1", None),
        ("PATCH", f"/api/{resource}/1", {"title": "Updated"}),
        ("DELETE", f"/api/{resource}/1", None),
    ]:
        response = client.request(method, path, json=body)
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "authentication_required"

    fixtures = role_fixtures(client)
    for token in [
        str(fixtures["assigned_manager_token"]),
        str(fixtures["admin"]),
    ]:
        missing_list_owner = client.get(
            f"/api/{resource}",
            headers=auth_headers(token),
        )
        assert missing_list_owner.status_code == 422
        assert missing_list_owner.json()["error"]["fields"]["owner_id"] == (
            "Owner is required"
        )
        missing_create_owner = client.post(
            f"/api/{resource}",
            headers=auth_headers(token),
            json=payload,
        )
        assert missing_create_owner.status_code == 422
        assert missing_create_owner.json()["error"]["fields"]["owner_id"] == (
            "Owner is required"
        )

    recruit_list = client.get(
        f"/api/{resource}",
        headers=auth_headers(str(fixtures["recruit_token"])),
    )
    assert recruit_list.status_code == 200
    assert recruit_list.json() == []


def test_task_crud_validation_immutable_fields_and_and_combined_filters(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    token = str(fixtures["recruit_token"])
    owner_id = int(fixtures["recruit"]["id"])

    tasks = []
    for date, category, status, title in [
        ("2026-07-16", "Training", "Completed", "Newest matching"),
        ("2026-07-16", "Training", "Completed", "Newest tie"),
        ("2026-07-16", "Setup", "Completed", "Wrong category"),
        ("2026-07-15", "Training", "Not Started", "Older task"),
    ]:
        payload = {
            **TASK_PAYLOAD,
            "owner_id": owner_id,
            "date": date,
            "category": category,
            "status": status,
            "title": f"  {title}  ",
            "description": "  ",
        }
        response = client.post(
            "/api/tasks",
            headers=auth_headers(token),
            json=payload,
        )
        assert response.status_code == 201
        tasks.append(response.json())

    assert tasks[0]["title"] == "Newest matching"
    assert tasks[0]["description"] == ""
    filtered = client.get(
        "/api/tasks",
        headers=auth_headers(token),
        params={
            "owner_id": owner_id,
            "date": "2026-07-16",
            "category": "Training",
            "status": "Completed",
        },
    )
    assert filtered.status_code == 200
    assert [entry["title"] for entry in filtered.json()] == [
        "Newest tie",
        "Newest matching",
    ]
    invalid_filter = client.get(
        "/api/tasks",
        headers=auth_headers(token),
        params={"owner_id": owner_id, "date": "2026-02-30"},
    )
    assert invalid_filter.status_code == 422

    updated = client.patch(
        f"/api/tasks/{tasks[0]['id']}",
        headers=auth_headers(token),
        json={"priority": "Low"},
    )
    assert updated.status_code == 200
    assert updated.json()["priority"] == "Low"
    assert updated.json()["title"] == "Newest matching"

    for payload in [
        {"id": 999},
        {"owner_id": int(fixtures["other_recruit"]["id"])},
        {"unknown": "field"},
        {"category": "Unsupported"},
        {"title": "x" * 121},
        {"date": "2026-02-30"},
    ]:
        rejected = client.patch(
            f"/api/tasks/{tasks[0]['id']}",
            headers=auth_headers(token),
            json=payload,
        )
        assert rejected.status_code == 422

    invalid_create = client.post(
        "/api/tasks",
        headers=auth_headers(token),
        json={**TASK_PAYLOAD, "owner_id": owner_id, "unknown": "field"},
    )
    assert invalid_create.status_code == 422
    assert (
        len(
            client.get(
                "/api/tasks",
                headers=auth_headers(token),
                params={"owner_id": owner_id},
            ).json()
        )
        == 4
    )

    deleted = client.delete(
        f"/api/tasks/{tasks[0]['id']}",
        headers=auth_headers(token),
    )
    assert deleted.status_code == 204
    remaining = client.get(
        "/api/tasks",
        headers=auth_headers(token),
        params={"owner_id": owner_id},
    ).json()
    assert tasks[0]["id"] not in [entry["id"] for entry in remaining]


def test_issue_lifecycle_validation_immutable_fields_and_filters(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    token = str(fixtures["recruit_token"])
    owner_id = int(fixtures["recruit"]["id"])

    issues = []
    for severity, status, title, notes in [
        ("Critical", "Open", "Open critical", ""),
        ("Critical", "In Progress", "Active critical", ""),
        ("Critical", "In Progress", "Newest active critical", ""),
        ("High", "Resolved", "Resolved high", "Account reset"),
        ("Critical", "Closed", "Closed critical", "Certificate replaced"),
    ]:
        response = client.post(
            "/api/issues",
            headers=auth_headers(token),
            json={
                **ISSUE_PAYLOAD,
                "owner_id": owner_id,
                "severity": severity,
                "status": status,
                "title": title,
                "resolution_notes": notes,
            },
        )
        assert response.status_code == 201
        issues.append(response.json())

    filtered = client.get(
        "/api/issues",
        headers=auth_headers(token),
        params={
            "owner_id": owner_id,
            "status": "In Progress",
            "severity": "Critical",
        },
    )
    assert filtered.status_code == 200
    assert [entry["title"] for entry in filtered.json()] == [
        "Newest active critical",
        "Active critical",
    ]
    invalid_filter = client.get(
        "/api/issues",
        headers=auth_headers(token),
        params={"owner_id": owner_id, "severity": "Unsupported"},
    )
    assert invalid_filter.status_code == 422

    missing_notes_create = client.post(
        "/api/issues",
        headers=auth_headers(token),
        json={
            **ISSUE_PAYLOAD,
            "owner_id": owner_id,
            "status": "Resolved",
        },
    )
    assert missing_notes_create.status_code == 422
    assert missing_notes_create.json()["error"]["fields"] == {
        "resolution_notes": "Resolution notes are required"
    }

    before = client.get(
        f"/api/issues/{issues[0]['id']}",
        headers=auth_headers(token),
    ).json()
    missing_notes_patch = client.patch(
        f"/api/issues/{issues[0]['id']}",
        headers=auth_headers(token),
        json={"status": "Closed"},
    )
    assert missing_notes_patch.status_code == 422
    assert (
        client.get(
            f"/api/issues/{issues[0]['id']}",
            headers=auth_headers(token),
        ).json()
        == before
    )

    resolved = client.patch(
        f"/api/issues/{issues[0]['id']}",
        headers=auth_headers(token),
        json={
            "status": "Resolved",
            "resolution_notes": "Access was provisioned",
        },
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolution_notes"] == "Access was provisioned"

    for payload in [
        {"id": 999},
        {"owner_id": int(fixtures["other_recruit"]["id"])},
        {"unknown": "field"},
        {"severity": "Unsupported"},
        {"description": ""},
        {"resolution_notes": "x" * 2001},
    ]:
        rejected = client.patch(
            f"/api/issues/{issues[1]['id']}",
            headers=auth_headers(token),
            json=payload,
        )
        assert rejected.status_code == 422

    deleted = client.delete(
        f"/api/issues/{issues[1]['id']}",
        headers=auth_headers(token),
    )
    assert deleted.status_code == 204
    remaining = client.get(
        "/api/issues",
        headers=auth_headers(token),
        params={"owner_id": owner_id},
    ).json()
    assert issues[1]["id"] not in [entry["id"] for entry in remaining]


def test_user_deletion_cascades_tasks_and_issues(client: TestClient) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    create_entry(
        client,
        "tasks",
        str(fixtures["recruit_token"]),
        owner_id,
        "cascade",
    )
    create_entry(
        client,
        "issues",
        str(fixtures["recruit_token"]),
        owner_id,
        "cascade",
    )

    deleted = client.delete(
        f"/api/admin/users/{owner_id}",
        headers=auth_headers(str(fixtures["admin"])),
    )
    assert deleted.status_code == 204
    assert (
        client.app.state.database.fetchall(
            "SELECT * FROM tasks WHERE owner_id = ?", (owner_id,)
        )
        == []
    )
    assert (
        client.app.state.database.fetchall(
            "SELECT * FROM issues WHERE owner_id = ?", (owner_id,)
        )
        == []
    )


def test_diary_recruit_selection_is_role_scoped(client: TestClient) -> None:
    fixtures = role_fixtures(client)
    recruit = fixtures["recruit"]
    other = fixtures["other_recruit"]

    recruit_rows = client.get(
        "/api/diary/recruits",
        headers=auth_headers(str(fixtures["recruit_token"])),
    ).json()
    assert [row["id"] for row in recruit_rows] == [recruit["id"]]

    manager_rows = client.get(
        "/api/diary/recruits",
        headers=auth_headers(str(fixtures["assigned_manager_token"])),
    ).json()
    assert [row["id"] for row in manager_rows] == [recruit["id"]]

    unassigned_rows = client.get(
        "/api/diary/recruits",
        headers=auth_headers(str(fixtures["unassigned_manager_token"])),
    ).json()
    assert unassigned_rows == []

    admin_rows = client.get(
        "/api/diary/recruits",
        headers=auth_headers(str(fixtures["admin"])),
    ).json()
    assert sorted(row["id"] for row in admin_rows) == sorted(
        [recruit["id"], other["id"]]
    )
