from datetime import date
from unittest import mock

import pytest

from app.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import DiaryEntry, User
from tests.conftest import DEFAULT_PASSWORD, csrf_token_from, login


def _admin_routes(app):
    """Every (method, url) served by the admin blueprint, so new routes are covered too."""
    routes = []
    for rule in app.url_map.iter_rules():
        if not rule.endpoint.startswith("admin."):
            continue
        url = rule.rule.replace("<int:user_id>", "1")
        for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
            routes.append((method, url))
    return routes


def _create_form(**overrides):
    data = {
        "name": "New Person",
        "email": "new@example.com",
        "role": ROLE_MANAGER,
        "password": DEFAULT_PASSWORD,
        "confirm_password": DEFAULT_PASSWORD,
        "start_date": "",
    }
    data.update(overrides)
    return data


def _create_user(email, role, manager=None):
    """Create a user in the current app's DB (``make_user`` is bound to ``app``, not
    ``csrf_app``)."""
    user = User(name=email.split("@")[0], email=email, role=role, manager=manager)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


# --- role gating --------------------------------------------------------------------------


def test_admin_blueprint_has_expected_routes(app):
    assert set(_admin_routes(app)) == {
        ("GET", "/admin/"),
        ("GET", "/admin/users/new"),
        ("POST", "/admin/users/new"),
        ("POST", "/admin/users/1/manager"),
        ("POST", "/admin/users/1/start-date"),
    }


@pytest.mark.parametrize("client_fixture", ["recruit_client", "manager_client"])
def test_non_admins_get_403_on_every_admin_route(request, app, client_fixture, other_recruit):
    client = request.getfixturevalue(client_fixture)
    manager_id = User.query.filter_by(role=ROLE_MANAGER).first().id
    before = [(u.id, u.manager_id, u.start_date) for u in User.query.order_by(User.id)]
    for method, url in _admin_routes(app):
        data = {"manager_id": str(manager_id), "start_date": "2030-01-01", **_create_form()}
        resp = client.open(url, method=method, data=data)
        assert resp.status_code == 403, (method, url)
    db.session.expire_all()
    assert [(u.id, u.manager_id, u.start_date) for u in User.query.order_by(User.id)] == before
    assert User.query.filter_by(email="new@example.com").count() == 0


def test_anonymous_redirected_to_login_on_every_admin_route(app, client):
    for method, url in _admin_routes(app):
        resp = client.open(url, method=method)
        assert resp.status_code == 302, (method, url)
        assert resp.headers["Location"].startswith("/auth/login?next=")


def test_admin_nav_link_only_for_admin(admin_client, recruit_client):
    assert b'href="/admin/"' in admin_client.get("/").data
    assert b'href="/admin/"' not in recruit_client.get("/").data


# --- listing ------------------------------------------------------------------------------


def test_index_lists_users_without_diary_content(admin_client, recruit, manager, admin):
    db.session.add(
        DiaryEntry(user=recruit, title="TOP-SECRET-TITLE", body="TOP-SECRET-BODY", mood="great")
    )
    db.session.commit()
    resp = admin_client.get("/admin/")
    assert resp.status_code == 200
    for user in (recruit, manager, admin):
        assert user.email.encode() in resp.data
    assert b"TOP-SECRET" not in resp.data
    assert b"/entries" not in resp.data


def test_index_paginates(admin_client, make_user):
    for _ in range(12):
        make_user(ROLE_RECRUIT)
    page1 = admin_client.get("/admin/")
    page2 = admin_client.get("/admin/?page=2")
    assert b"Page 1 of 2" in page1.data
    assert b"Page 2 of 2" in page2.data


# --- creating users -----------------------------------------------------------------------


def test_create_page_renders_with_fixed_role_choices(admin_client):
    resp = admin_client.get("/admin/users/new")
    assert resp.status_code == 200
    assert b'value="manager"' in resp.data
    assert b'value="recruit"' in resp.data
    assert b'value="admin"' not in resp.data


def test_create_manager(admin_client):
    with mock.patch("app.hooks.on_user_registered") as hook:
        resp = admin_client.post(
            "/admin/users/new",
            data=_create_form(email="  Boss@Example.COM ", start_date="2026-03-02"),
        )
    assert resp.status_code == 302
    user = User.query.filter_by(email="boss@example.com").one()
    assert user.role == ROLE_MANAGER
    assert user.start_date == date(2026, 3, 2)
    assert user.check_password(DEFAULT_PASSWORD)
    hook.assert_called_once_with(user)


def test_create_manager_start_date_optional(admin_client):
    assert admin_client.post("/admin/users/new", data=_create_form()).status_code == 302
    assert User.query.filter_by(email="new@example.com").one().start_date is None


def test_create_recruit_runs_hook_before_commit(admin_client):
    seen = {}

    def spy(user):
        seen["pending"] = user in db.session.new
        seen["role"] = user.role

    with mock.patch("app.hooks.on_user_registered", side_effect=spy):
        resp = admin_client.post("/admin/users/new", data=_create_form(role=ROLE_RECRUIT))
    assert resp.status_code == 302
    assert seen == {"pending": True, "role": ROLE_RECRUIT}
    assert User.query.filter_by(email="new@example.com").one().role == ROLE_RECRUIT


@pytest.mark.parametrize("role", [ROLE_ADMIN, "superuser", ""])
def test_create_rejects_roles_outside_choice_list(admin_client, role):
    resp = admin_client.post("/admin/users/new", data=_create_form(role=role))
    assert resp.status_code == 200
    assert User.query.filter_by(email="new@example.com").count() == 0


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "not-an-email"},
        {"name": ""},
        {"password": "short", "confirm_password": "short"},
        {"confirm_password": "Different123!"},
        {"start_date": "not-a-date"},
    ],
)
def test_create_rejects_invalid_input(admin_client, overrides):
    before = User.query.count()
    resp = admin_client.post("/admin/users/new", data=_create_form(**overrides))
    assert resp.status_code == 200
    assert User.query.count() == before


def test_create_rejects_duplicate_email_case_insensitive(admin_client, manager):
    resp = admin_client.post("/admin/users/new", data=_create_form(email=manager.email.upper()))
    assert resp.status_code == 200
    assert b"An account with this email already exists." in resp.data
    assert User.query.filter(db.func.lower(User.email) == manager.email).count() == 1


def test_create_integrity_error_race_shows_error(admin_client, manager):
    with mock.patch("app.admin.routes._email_taken", return_value=False):
        resp = admin_client.post("/admin/users/new", data=_create_form(email=manager.email))
    assert resp.status_code == 200
    assert b"An account with this email already exists." in resp.data


# --- assignment ---------------------------------------------------------------------------


def test_assign_recruit_to_manager(admin_client, other_recruit, manager):
    resp = admin_client.post(
        f"/admin/users/{other_recruit.id}/manager", data={"manager_id": str(manager.id)}
    )
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/admin/"
    db.session.refresh(other_recruit)
    assert other_recruit.manager_id == manager.id


def test_reassign_and_unassign(admin_client, recruit, make_user):
    new_manager = make_user(ROLE_MANAGER)
    admin_client.post(
        f"/admin/users/{recruit.id}/manager", data={"manager_id": str(new_manager.id)}
    )
    db.session.refresh(recruit)
    assert recruit.manager_id == new_manager.id
    resp = admin_client.post(f"/admin/users/{recruit.id}/manager?page=2", data={"manager_id": ""})
    assert resp.headers["Location"] == "/admin/?page=2"
    db.session.refresh(recruit)
    assert recruit.manager_id is None


@pytest.mark.parametrize("target_role", [ROLE_RECRUIT, ROLE_ADMIN])
def test_assign_only_to_managers(admin_client, other_recruit, make_user, target_role):
    not_a_manager = make_user(target_role)
    resp = admin_client.post(
        f"/admin/users/{other_recruit.id}/manager", data={"manager_id": str(not_a_manager.id)}
    )
    assert resp.status_code == 302
    db.session.refresh(other_recruit)
    assert other_recruit.manager_id is None


def test_assign_rejects_unknown_manager_id(admin_client, other_recruit):
    admin_client.post(f"/admin/users/{other_recruit.id}/manager", data={"manager_id": "9999"})
    db.session.refresh(other_recruit)
    assert other_recruit.manager_id is None


def test_assign_rechecks_manager_role(admin_client, other_recruit, manager):
    # Defence in depth: even if the choice list were stale, the target must be a manager.
    with mock.patch("app.admin.routes._managers", return_value=[manager]):
        manager.role = ROLE_RECRUIT
        db.session.commit()
        admin_client.post(
            f"/admin/users/{other_recruit.id}/manager", data={"manager_id": str(manager.id)}
        )
    db.session.refresh(other_recruit)
    assert other_recruit.manager_id is None


@pytest.mark.parametrize("role", [ROLE_MANAGER, ROLE_ADMIN])
def test_non_recruit_cannot_be_assigned(admin_client, make_user, manager, role):
    user = make_user(role)
    resp = admin_client.post(
        f"/admin/users/{user.id}/manager", data={"manager_id": str(manager.id)}
    )
    assert resp.status_code == 302
    db.session.refresh(user)
    assert user.manager_id is None


def test_assign_unknown_user_404(admin_client, manager):
    resp = admin_client.post("/admin/users/9999/manager", data={"manager_id": str(manager.id)})
    assert resp.status_code == 404


def test_assign_get_not_allowed(admin_client, recruit):
    assert admin_client.get(f"/admin/users/{recruit.id}/manager").status_code == 405


def test_index_shows_assignment_form_only_for_recruits(admin_client, recruit, manager):
    page = admin_client.get("/admin/").data
    assert f'action="/admin/users/{recruit.id}/manager'.encode() in page
    assert f'action="/admin/users/{manager.id}/manager'.encode() not in page


# --- start date ---------------------------------------------------------------------------


@pytest.mark.parametrize("role", [ROLE_RECRUIT, ROLE_MANAGER])
def test_admin_sets_start_date(admin_client, make_user, role):
    user = make_user(role)
    resp = admin_client.post(
        f"/admin/users/{user.id}/start-date", data={"start_date": "2026-04-06"}
    )
    assert resp.status_code == 302
    db.session.refresh(user)
    assert user.start_date == date(2026, 4, 6)


def test_admin_clears_start_date(admin_client, recruit):
    admin_client.post(f"/admin/users/{recruit.id}/start-date", data={"start_date": ""})
    db.session.refresh(recruit)
    assert recruit.start_date is None


def test_admin_start_date_invalid_is_ignored(admin_client, recruit):
    original = recruit.start_date
    admin_client.post(f"/admin/users/{recruit.id}/start-date", data={"start_date": "31/12/2026"})
    db.session.refresh(recruit)
    assert recruit.start_date == original


def test_start_date_unknown_user_404(admin_client):
    resp = admin_client.post("/admin/users/9999/start-date", data={"start_date": "2026-04-06"})
    assert resp.status_code == 404


# --- CSRF ---------------------------------------------------------------------------------


def test_admin_post_without_csrf_token_rejected_and_nothing_changes(csrf_client):
    admin = _create_user("root@example.com", ROLE_ADMIN)
    manager = _create_user("boss@example.com", ROLE_MANAGER)
    recruit = _create_user("rookie@example.com", ROLE_RECRUIT)
    client = login(csrf_client, admin)
    page = client.get("/admin/")  # establish a CSRF session so the failure is the missing token
    assert page.status_code == 200

    data = {"manager_id": str(manager.id)}
    assert client.post(f"/admin/users/{recruit.id}/manager", data=data).status_code == 400
    assert client.post("/admin/users/new", data=_create_form()).status_code == 400
    db.session.expire_all()
    assert db.session.get(User, recruit.id).manager_id is None
    assert User.query.filter_by(email="new@example.com").count() == 0

    data["csrf_token"] = csrf_token_from(page)
    assert client.post(f"/admin/users/{recruit.id}/manager", data=data).status_code == 302
    db.session.expire_all()
    assert db.session.get(User, recruit.id).manager_id == manager.id
