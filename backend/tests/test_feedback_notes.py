import pytest
from fastapi.testclient import TestClient


FEEDBACK_PAYLOAD = {
    "date": "2026-07-15",
    "subject": "Helpful onboarding support",
    "type": "Positive",
    "details": "The team explained the deployment process clearly.",
}

NOTE_PAYLOAD = {
    "date": "2026-07-15",
    "title": "Deployment notes",
    "content": "Review the release checklist before the next deployment.",
    "tags": ["Release", " Team "],
}

INVALID_DIARY_DATE_INPUTS = [
    0,
    1784073600,
    "2026-07-15T00:00:00",
    "2026-7-15",
    "2026/07/15",
    " 2026-07-15",
    "2026-07-15 ",
    "",
    None,
    "2026-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
]


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


def resource_payload(resource: str) -> dict[str, object]:
    return dict(FEEDBACK_PAYLOAD if resource == "feedback" else NOTE_PAYLOAD)


def create_entry(
    client: TestClient,
    resource: str,
    token: str,
    owner_id: int,
    suffix: str,
) -> dict[str, object]:
    payload = resource_payload(resource)
    payload["owner_id"] = owner_id
    if resource == "feedback":
        payload["subject"] = f"{payload['subject']} {suffix}"
    else:
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


def assert_validation_error(response: object, field: str) -> None:
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"] == "Request validation failed"
    assert field in error["fields"]


@pytest.mark.parametrize("resource", ["feedback", "notes"])
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
    patch = {"type": "Concern"} if resource == "feedback" else {"tags": ["Updated"]}

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
        expected = ["updated"] if resource == "notes" else "Concern"
        assert updated.json()[next(iter(patch))] == expected

        deleted = client.delete(
            f"/api/{resource}/{created['id']}",
            headers=auth_headers(token),
        )
        assert deleted.status_code == 204
        assert (
            client.app.state.database.fetchone(
                f"SELECT id FROM {resource} WHERE id = ?",
                (created["id"],),
            )
            is None
        )


@pytest.mark.parametrize("resource", ["feedback", "notes"])
def test_request_authorization_denies_all_operations_without_leak_or_mutation(
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
    other_seed = create_entry(
        client,
        resource,
        str(fixtures["admin"]),
        int(fixtures["other_recruit"]["id"]),
        "other-protected",
    )
    denied_actors = [
        (
            "other-recruit",
            str(fixtures["other_recruit_token"]),
            owner_id,
            int(seed["id"]),
        ),
        (
            "unassigned-manager",
            str(fixtures["unassigned_manager_token"]),
            owner_id,
            int(seed["id"]),
        ),
        (
            "assigned-manager-other",
            str(fixtures["assigned_manager_token"]),
            int(fixtures["other_recruit"]["id"]),
            int(other_seed["id"]),
        ),
        (
            "assigned-manager-unknown",
            str(fixtures["assigned_manager_token"]),
            99999,
            99999,
        ),
        ("admin-unknown", str(fixtures["admin"]), 99999, 99999),
    ]
    patch_payload = (
        {"subject": "Tampered subject"}
        if resource == "feedback"
        else {"title": "Tampered title"}
    )

    for actor_name, token, target_id, item_id in denied_actors:
        snapshot_id = (
            item_id
            if item_id in {int(seed["id"]), int(other_seed["id"])}
            else int(seed["id"])
        )
        before = client.app.state.database.fetchone(
            f"SELECT * FROM {resource} WHERE id = ?",
            (snapshot_id,),
        )
        assert before is not None

        assert_access_denied(
            client.get(
                f"/api/{resource}",
                headers=auth_headers(token),
                params={"owner_id": target_id},
            )
        )

        assert_access_denied(
            client.get(
                f"/api/{resource}/{item_id}",
                headers=auth_headers(token),
            )
        )

        denied_create = resource_payload(resource)
        denied_create["owner_id"] = target_id
        if resource == "feedback":
            denied_create["subject"] = f"Denied {actor_name}"
        else:
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
            (snapshot_id,),
        )
        assert after is not None
        assert dict(after) == dict(before)


@pytest.mark.parametrize("resource", ["feedback", "notes"])
def test_assignment_replacement_and_removal_update_diary_scope_immediately(
    client: TestClient,
    resource: str,
) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    create_entry(
        client,
        resource,
        str(fixtures["recruit_token"]),
        owner_id,
        "assignment",
    )
    assigned_headers = auth_headers(str(fixtures["assigned_manager_token"]))
    replacement_headers = auth_headers(str(fixtures["unassigned_manager_token"]))
    admin_headers = auth_headers(str(fixtures["admin"]))

    assert (
        client.get(
            f"/api/{resource}",
            headers=assigned_headers,
            params={"owner_id": owner_id},
        ).status_code
        == 200
    )

    replaced = client.put(
        f"/api/admin/recruits/{owner_id}/manager",
        headers=admin_headers,
        json={"manager_id": fixtures["unassigned_manager"]["id"]},
    )
    assert replaced.status_code == 200
    assert_access_denied(
        client.get(
            f"/api/{resource}",
            headers=assigned_headers,
            params={"owner_id": owner_id},
        )
    )
    assert (
        client.get(
            f"/api/{resource}",
            headers=replacement_headers,
            params={"owner_id": owner_id},
        ).status_code
        == 200
    )

    removed = client.delete(
        f"/api/admin/recruits/{owner_id}/manager",
        headers=admin_headers,
    )
    assert removed.status_code == 204
    assert_access_denied(
        client.get(
            f"/api/{resource}",
            headers=replacement_headers,
            params={"owner_id": owner_id},
        )
    )


@pytest.mark.parametrize("resource", ["feedback", "notes"])
def test_diary_endpoints_require_authentication_and_selected_owner(
    client: TestClient,
    resource: str,
) -> None:
    payload = resource_payload(resource)
    for method, path, body in [
        ("GET", f"/api/{resource}", None),
        ("POST", f"/api/{resource}", payload),
        ("GET", f"/api/{resource}/1", None),
        ("PATCH", f"/api/{resource}/1", {"date": "2026-07-16"}),
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
        assert_validation_error(missing_list_owner, "owner_id")
        missing_create_owner = client.post(
            f"/api/{resource}",
            headers=auth_headers(token),
            json=payload,
        )
        assert_validation_error(missing_create_owner, "owner_id")

    recruit_list = client.get(
        f"/api/{resource}",
        headers=auth_headers(str(fixtures["recruit_token"])),
    )
    assert recruit_list.status_code == 200
    assert recruit_list.json() == []


def test_feedback_crud_validation_and_strict_dates_are_safe(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    token = str(fixtures["recruit_token"])
    owner_id = int(fixtures["recruit"]["id"])
    headers = auth_headers(token)
    created = client.post(
        "/api/feedback",
        headers=headers,
        json={
            **FEEDBACK_PAYLOAD,
            "owner_id": owner_id,
            "subject": "  Helpful feedback  ",
            "details": "  Clear onboarding plan  ",
        },
    )
    assert created.status_code == 201
    feedback = created.json()
    assert feedback["subject"] == "Helpful feedback"
    assert feedback["details"] == "Clear onboarding plan"

    partial = client.patch(
        f"/api/feedback/{feedback['id']}",
        headers=headers,
        json={"type": "Suggestion"},
    )
    assert partial.status_code == 200
    assert partial.json()["type"] == "Suggestion"
    assert partial.json()["subject"] == "Helpful feedback"

    invalid_creates = [
        ("subject", {**FEEDBACK_PAYLOAD, "subject": ""}),
        ("subject", {**FEEDBACK_PAYLOAD, "subject": "x" * 121}),
        ("details", {**FEEDBACK_PAYLOAD, "details": ""}),
        ("details", {**FEEDBACK_PAYLOAD, "details": "x" * 2001}),
        ("type", {**FEEDBACK_PAYLOAD, "type": "Praise"}),
        ("unknown", {**FEEDBACK_PAYLOAD, "unknown": "field"}),
    ]
    for field, payload in invalid_creates:
        before = client.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM feedback"
        )["count"]
        payload["owner_id"] = owner_id
        response = client.post("/api/feedback", headers=headers, json=payload)
        assert_validation_error(response, field)
        after = client.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM feedback"
        )["count"]
        assert after == before

    for value in INVALID_DIARY_DATE_INPUTS:
        assert_validation_error(
            client.post(
                "/api/feedback",
                headers=headers,
                json={**FEEDBACK_PAYLOAD, "owner_id": owner_id, "date": value},
            ),
            "date",
        )
        before = client.get(
            f"/api/feedback/{feedback['id']}",
            headers=headers,
        ).json()
        assert_validation_error(
            client.patch(
                f"/api/feedback/{feedback['id']}",
                headers=headers,
                json={"date": value},
            ),
            "date",
        )
        assert (
            client.get(
                f"/api/feedback/{feedback['id']}",
                headers=headers,
            ).json()
            == before
        )

    for field, payload in [
        ("id", {"id": 999}),
        ("owner_id", {"owner_id": fixtures["other_recruit"]["id"]}),
        ("unknown", {"unknown": "field"}),
        ("type", {"type": "Praise"}),
        ("subject", {"subject": None}),
        ("details", {"details": ""}),
    ]:
        before = client.get(
            f"/api/feedback/{feedback['id']}",
            headers=headers,
        ).json()
        assert_validation_error(
            client.patch(
                f"/api/feedback/{feedback['id']}",
                headers=headers,
                json=payload,
            ),
            field,
        )
        assert (
            client.get(
                f"/api/feedback/{feedback['id']}",
                headers=headers,
            ).json()
            == before
        )

    deleted = client.delete(
        f"/api/feedback/{feedback['id']}",
        headers=headers,
    )
    assert deleted.status_code == 204
    assert (
        client.app.state.database.fetchone(
            "SELECT id FROM feedback WHERE id = ?",
            (feedback["id"],),
        )
        is None
    )


def test_notes_crud_tag_normalization_validation_and_strict_dates_are_safe(
    client: TestClient,
) -> None:
    fixtures = role_fixtures(client)
    token = str(fixtures["recruit_token"])
    owner_id = int(fixtures["recruit"]["id"])
    headers = auth_headers(token)
    created = client.post(
        "/api/notes",
        headers=headers,
        json={
            **NOTE_PAYLOAD,
            "owner_id": owner_id,
            "title": "  Release checklist  ",
            "content": "  Capture deployment follow-ups  ",
            "tags": [" Release ", "TEAM", "release", "Follow Up"],
        },
    )
    assert created.status_code == 201
    note = created.json()
    assert note["title"] == "Release checklist"
    assert note["content"] == "Capture deployment follow-ups"
    assert note["tags"] == ["release", "team", "follow up"]

    exact_ten = client.patch(
        f"/api/notes/{note['id']}",
        headers=headers,
        json={"tags": [f"Tag {index}" for index in range(10)]},
    )
    assert exact_ten.status_code == 200
    assert exact_ten.json()["tags"] == [f"tag {index}" for index in range(10)]
    assert exact_ten.json()["title"] == "Release checklist"

    invalid_creates = [
        ("title", {**NOTE_PAYLOAD, "title": ""}),
        ("title", {**NOTE_PAYLOAD, "title": "x" * 121}),
        ("content", {**NOTE_PAYLOAD, "content": ""}),
        ("content", {**NOTE_PAYLOAD, "content": "x" * 5001}),
        ("tags", {**NOTE_PAYLOAD, "tags": [f"tag-{index}" for index in range(11)]}),
        ("tags", {**NOTE_PAYLOAD, "tags": ["   "]}),
        ("tags", {**NOTE_PAYLOAD, "tags": ["x" * 31]}),
        ("tags", {**NOTE_PAYLOAD, "tags": ["valid", 7]}),
        ("tags", {**NOTE_PAYLOAD, "tags": "not-a-list"}),
        ("unknown", {**NOTE_PAYLOAD, "unknown": "field"}),
    ]
    for field, payload in invalid_creates:
        before = client.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM notes"
        )["count"]
        payload["owner_id"] = owner_id
        response = client.post("/api/notes", headers=headers, json=payload)
        assert_validation_error(response, field)
        after = client.app.state.database.fetchone(
            "SELECT COUNT(*) AS count FROM notes"
        )["count"]
        assert after == before

    for value in INVALID_DIARY_DATE_INPUTS:
        assert_validation_error(
            client.post(
                "/api/notes",
                headers=headers,
                json={**NOTE_PAYLOAD, "owner_id": owner_id, "date": value},
            ),
            "date",
        )
        before = client.get(f"/api/notes/{note['id']}", headers=headers).json()
        assert_validation_error(
            client.patch(
                f"/api/notes/{note['id']}",
                headers=headers,
                json={"date": value},
            ),
            "date",
        )
        assert (
            client.get(
                f"/api/notes/{note['id']}",
                headers=headers,
            ).json()
            == before
        )

    for field, payload in [
        ("id", {"id": 999}),
        ("owner_id", {"owner_id": fixtures["other_recruit"]["id"]}),
        ("unknown", {"unknown": "field"}),
        ("title", {"title": None}),
        ("content", {"content": ""}),
        ("tags", {"tags": None}),
        ("tags", {"tags": [f"tag-{index}" for index in range(11)]}),
    ]:
        before = client.get(f"/api/notes/{note['id']}", headers=headers).json()
        assert_validation_error(
            client.patch(
                f"/api/notes/{note['id']}",
                headers=headers,
                json=payload,
            ),
            field,
        )
        assert (
            client.get(
                f"/api/notes/{note['id']}",
                headers=headers,
            ).json()
            == before
        )

    deleted = client.delete(
        f"/api/notes/{note['id']}",
        headers=headers,
    )
    assert deleted.status_code == 204
    assert (
        client.app.state.database.fetchone(
            "SELECT id FROM notes WHERE id = ?",
            (note["id"],),
        )
        is None
    )


def test_user_deletion_cascades_feedback_and_notes(client: TestClient) -> None:
    fixtures = role_fixtures(client)
    owner_id = int(fixtures["recruit"]["id"])
    create_entry(
        client,
        "feedback",
        str(fixtures["recruit_token"]),
        owner_id,
        "cascade",
    )
    create_entry(
        client,
        "notes",
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
            "SELECT * FROM feedback WHERE owner_id = ?",
            (owner_id,),
        )
        == []
    )
    assert (
        client.app.state.database.fetchall(
            "SELECT * FROM notes WHERE owner_id = ?",
            (owner_id,),
        )
        == []
    )
