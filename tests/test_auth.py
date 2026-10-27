from datetime import date
from unittest import mock

import pytest
from flask import Blueprint
from flask_login import login_required

from app import create_app
from app.auth.routes import is_safe_next
from app.config import TestConfig
from app.constants import ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import User
from app.security import role_required
from tests.conftest import DEFAULT_PASSWORD, app_context_for_tests, csrf_token_from, login


def _form(**overrides):
    data = {
        "name": "New Recruit",
        "email": "new@example.com",
        "password": DEFAULT_PASSWORD,
        "confirm_password": DEFAULT_PASSWORD,
        "start_date": "2026-02-02",
    }
    data.update(overrides)
    return data


def _users_with_email(email):
    return User.query.filter(db.func.lower(User.email) == email.lower()).all()


def _create_user(email="user@example.com", role=ROLE_RECRUIT):
    """Create a user in the current app's DB (``make_user`` is bound to the ``app`` fixture,
    not ``csrf_app``)."""
    user = User(name="User", email=email, role=role)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


def _logged_in(client):
    with client.session_transaction() as sess:
        return "_user_id" in sess


# --- registration -------------------------------------------------------------------------


def test_register_page_renders(client):
    resp = client.get("/auth/register")
    assert resp.status_code == 200
    assert b'name="role"' not in resp.data


def test_register_success_creates_hashed_recruit_and_runs_hook(client):
    with mock.patch("app.hooks.on_user_registered") as hook:
        resp = client.post("/auth/register", data=_form(email="  New@Example.COM "))

    assert resp.status_code == 302
    assert resp.headers["Location"] == "/"
    user = User.query.filter_by(email="new@example.com").one()
    assert user.role == ROLE_RECRUIT
    assert user.name == "New Recruit"
    assert user.start_date == date(2026, 2, 2)
    assert user.password_hash != DEFAULT_PASSWORD
    assert user.check_password(DEFAULT_PASSWORD)
    hook.assert_called_once_with(user)
    assert _logged_in(client)


def test_register_hook_runs_before_commit(client):
    seen = {}

    def spy(user):
        seen["pending"] = user in db.session.new

    with mock.patch("app.hooks.on_user_registered", side_effect=spy):
        client.post("/auth/register", data=_form())
    assert seen == {"pending": True}


@pytest.mark.parametrize("role", ["admin", ROLE_MANAGER])
def test_register_ignores_submitted_role(client, role):
    resp = client.post("/auth/register", data=_form(role=role))
    assert resp.status_code == 302
    assert User.query.filter_by(email="new@example.com").one().role == ROLE_RECRUIT


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "not-an-email"},
        {"email": ""},
        {"confirm_password": "Different123!"},
        {"password": "short", "confirm_password": "short"},
        {"name": ""},
        {"start_date": ""},
    ],
)
def test_register_rejects_invalid_input(client, overrides):
    resp = client.post("/auth/register", data=_form(**overrides))
    assert resp.status_code == 200
    assert User.query.count() == 0
    assert not _logged_in(client)


def test_register_password_mismatch_message(client):
    resp = client.post("/auth/register", data=_form(confirm_password="Different123!"))
    assert b"Passwords must match." in resp.data


def test_register_duplicate_email_case_insensitive(client, make_user):
    make_user(email="taken@example.com")
    resp = client.post("/auth/register", data=_form(email="TAKEN@Example.com"))
    assert resp.status_code == 200
    assert b"An account with this email already exists." in resp.data
    assert len(_users_with_email("taken@example.com")) == 1
    assert not _logged_in(client)


def test_register_integrity_error_race_shows_error(client, make_user):
    make_user(email="race@example.com")
    with mock.patch("app.auth.routes._email_taken", return_value=False):
        resp = client.post("/auth/register", data=_form(email="race@example.com"))
    assert resp.status_code == 200
    assert b"An account with this email already exists." in resp.data
    assert len(_users_with_email("race@example.com")) == 1
    assert not _logged_in(client)


def test_register_requires_csrf_token(csrf_client):
    resp = csrf_client.post("/auth/register", data=_form())
    assert resp.status_code == 400
    assert User.query.count() == 0


def test_register_with_csrf_token(csrf_client):
    token = csrf_token_from(csrf_client.get("/auth/register"))
    resp = csrf_client.post("/auth/register", data=_form(csrf_token=token))
    assert resp.status_code == 302
    assert User.query.filter_by(email="new@example.com").one().role == ROLE_RECRUIT


# --- login --------------------------------------------------------------------------------


def test_login_page_renders(client):
    assert client.get("/auth/login").status_code == 200


def test_login_success(client, recruit):
    resp = client.post(
        "/auth/login", data={"email": recruit.email.upper(), "password": DEFAULT_PASSWORD}
    )
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/"
    assert _logged_in(client)


@pytest.mark.parametrize(
    "email,password",
    [("recruit-placeholder", "WrongPassword1!"), ("nobody@example.com", DEFAULT_PASSWORD)],
)
def test_login_failure_is_generic(client, recruit, email, password):
    email = recruit.email if email == "recruit-placeholder" else email
    resp = client.post("/auth/login", data={"email": email, "password": password})
    assert resp.status_code == 200
    assert b"Invalid email or password." in resp.data
    assert not _logged_in(client)


@pytest.mark.parametrize(
    "next_url",
    [
        "https://evil.com/",
        "http://evil.com",
        "//evil.com",
        "//evil.com/path",
        "/\\evil.com",
        "\\\\evil.com",
        "/\\/evil.com",
        "javascript:alert(1)",
        "evil.com",
        " //evil.com",
        "/\t/evil.com",
        "",
    ],
)
def test_login_rejects_unsafe_next(client, recruit, next_url):
    resp = client.post(
        "/auth/login",
        query_string={"next": next_url},
        data={"email": recruit.email, "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/"


@pytest.mark.parametrize("next_url", ["/entries", "/entries?page=2", "/checklist/"])
def test_login_follows_safe_relative_next(client, recruit, next_url):
    resp = client.post(
        "/auth/login",
        query_string={"next": next_url},
        data={"email": recruit.email, "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 302
    assert resp.headers["Location"] == next_url


def test_is_safe_next_handles_none():
    assert not is_safe_next(None)


def test_login_requires_csrf_token(csrf_client):
    user = _create_user()
    creds = {"email": user.email, "password": DEFAULT_PASSWORD}
    assert csrf_client.post("/auth/login", data=creds).status_code == 400
    assert not _logged_in(csrf_client)
    token = csrf_token_from(csrf_client.get("/auth/login"))
    assert csrf_client.post("/auth/login", data={**creds, "csrf_token": token}).status_code == 302
    assert _logged_in(csrf_client)


# --- logout -------------------------------------------------------------------------------


def test_logout_post_logs_out(recruit_client):
    resp = recruit_client.post("/auth/logout")
    assert resp.status_code == 302
    assert not _logged_in(recruit_client)


def test_logout_get_is_rejected(recruit_client):
    assert recruit_client.get("/auth/logout").status_code == 405
    assert _logged_in(recruit_client)


def test_logout_requires_csrf_token(csrf_client):
    client = login(csrf_client, _create_user())
    client.get("/")  # establish a CSRF session so the failure is the missing token
    assert client.post("/auth/logout").status_code == 400
    assert _logged_in(client)
    assert b'action="/auth/logout"' in client.get("/").data


def test_logout_with_csrf_token_from_nav(csrf_client):
    client = login(csrf_client, _create_user())
    page = client.get("/")
    assert b'action="/auth/logout"' in page.data
    resp = client.post("/auth/logout", data={"csrf_token": csrf_token_from(page)})
    assert resp.status_code == 302
    assert not _logged_in(client)


# --- authenticated users / nav ------------------------------------------------------------


@pytest.mark.parametrize("path", ["/auth/login", "/auth/register"])
def test_authenticated_user_redirected_to_index(recruit_client, path):
    for method in (recruit_client.get, recruit_client.post):
        resp = method(path)
        assert resp.status_code == 302
        assert resp.headers["Location"] == "/"


def test_nav_shows_login_and_register_when_anonymous(client):
    page = client.get("/").data
    assert b'href="/auth/login"' in page
    assert b'href="/auth/register"' in page


# --- protected routes ---------------------------------------------------------------------


@pytest.fixture
def protected_app():
    app = create_app(TestConfig)
    probe = Blueprint("probe", __name__)

    @probe.get("/probe/private")
    @login_required
    def private():
        return "private"

    @probe.get("/probe/recruits")
    @role_required(ROLE_RECRUIT)
    def recruits_only():
        return "recruits"

    app.register_blueprint(probe)
    yield from app_context_for_tests(app)


@pytest.mark.parametrize("path", ["/probe/private", "/probe/recruits"])
def test_unauthenticated_protected_route_redirects_to_login(protected_app, path):
    resp = protected_app.test_client().get(path)
    assert resp.status_code == 302
    assert resp.headers["Location"].startswith("/auth/login?next=")


def test_login_then_follow_next_to_protected_route(protected_app):
    user = _create_user()
    client = protected_app.test_client()
    location = client.get("/probe/private").headers["Location"]
    resp = client.post(location, data={"email": user.email, "password": DEFAULT_PASSWORD})
    assert resp.headers["Location"] == "/probe/private"
    assert client.get("/probe/private").data == b"private"
