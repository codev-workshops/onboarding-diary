import pytest
from flask import Blueprint

from app import create_app
from app.config import TestConfig
from app.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import DiaryEntry, User
from app.security import get_owned_or_404, role_required
from tests.conftest import DEFAULT_PASSWORD, app_context_for_tests, csrf_token_from, login


def _probe_app(**overrides):
    app = create_app(TestConfig, **overrides)
    probe = Blueprint("probe", __name__)

    @probe.get("/probe/manager-only")
    @role_required(ROLE_MANAGER)
    def manager_only():
        return "ok"

    @probe.get("/probe/entries/<int:entry_id>")
    @role_required(ROLE_RECRUIT, ROLE_MANAGER, ROLE_ADMIN)
    def entry(entry_id):
        return get_owned_or_404(DiaryEntry, entry_id).title

    @probe.post("/probe/mutate")
    def mutate():
        return "mutated"

    app.register_blueprint(probe)
    if "auth.login" not in app.view_functions:  # until T1 adds the real login view
        app.add_url_rule("/auth/login", endpoint="auth.login", view_func=lambda: "login")
    return app


@pytest.fixture
def probe_app():
    yield from app_context_for_tests(_probe_app())


@pytest.fixture
def users(probe_app):
    created = {}
    for role in (ROLE_RECRUIT, ROLE_MANAGER, ROLE_ADMIN):
        user = User(name=role, email=f"{role}@example.com", role=role)
        user.set_password(DEFAULT_PASSWORD)
        db.session.add(user)
        created[role] = user
    db.session.commit()
    return created


def test_role_required_redirects_anonymous_to_login(probe_app):
    resp = probe_app.test_client().get("/probe/manager-only")
    assert resp.status_code == 302
    assert "/auth/login" in resp.headers["Location"]


def test_role_required_403_for_wrong_role(probe_app, users):
    client = probe_app.test_client
    assert login(client(), users[ROLE_RECRUIT]).get("/probe/manager-only").status_code == 403
    assert login(client(), users[ROLE_ADMIN]).get("/probe/manager-only").status_code == 403
    assert login(client(), users[ROLE_MANAGER]).get("/probe/manager-only").status_code == 200


@pytest.mark.parametrize("role", [ROLE_MANAGER, ROLE_ADMIN])
def test_get_owned_or_404_denies_every_non_owner(probe_app, users, role):
    entry = DiaryEntry(user=users[ROLE_RECRUIT], title="secret", body="b")
    db.session.add(entry)
    db.session.commit()
    owner = login(probe_app.test_client(), users[ROLE_RECRUIT])
    assert owner.get(f"/probe/entries/{entry.id}").data == b"secret"
    other = login(probe_app.test_client(), users[role])
    assert other.get(f"/probe/entries/{entry.id}").status_code == 404


def test_get_owned_or_404_missing_object(probe_app, users):
    client = login(probe_app.test_client(), users[ROLE_RECRUIT])
    assert client.get("/probe/entries/999").status_code == 404


def test_csrf_enabled_rejects_post_without_valid_token():
    for app in app_context_for_tests(_probe_app(WTF_CSRF_ENABLED=True)):
        client = app.test_client()
        assert client.post("/probe/mutate").status_code == 400
        assert client.post("/probe/mutate", data={"csrf_token": "bogus"}).status_code == 400
        token = csrf_token_from(client.get("/"))
        assert client.post("/probe/mutate", data={"csrf_token": token}).data == b"mutated"


def test_csrf_client_fixture_has_csrf_enabled(csrf_app, csrf_client):
    assert csrf_app.config["WTF_CSRF_ENABLED"] is True
    assert csrf_token_from(csrf_client.get("/"))
