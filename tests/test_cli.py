import pytest

from app import create_app
from app.config import ProductionConfig
from app.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import ChecklistItem, DiaryEntry, Tag, User
from tests.conftest import app_context_for_tests

ADMIN_PASSWORD = "S3cure-admin-pw"


def _create_admin(app, *extra, env=None, input=None, email="Root@Example.com", name="Root"):
    args = ["create-admin", "--email", email, "--name", name, *extra]
    return app.test_cli_runner().invoke(args=args, env=env, input=input)


def _counts():
    return {
        model.__name__: db.session.query(model).count()
        for model in (User, DiaryEntry, ChecklistItem, Tag)
    }


# --- create-admin -------------------------------------------------------------------------


def test_create_admin_on_empty_db_with_env_password(app, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    result = _create_admin(app)
    assert result.exit_code == 0, result.output
    assert ADMIN_PASSWORD not in result.output
    admin = User.query.one()
    assert admin.email == "root@example.com"
    assert admin.name == "Root"
    assert admin.role == ROLE_ADMIN
    assert admin.password_hash != ADMIN_PASSWORD
    assert admin.check_password(ADMIN_PASSWORD)
    assert _counts() == {"User": 1, "DiaryEntry": 0, "ChecklistItem": 0, "Tag": 0}


def test_created_admin_can_log_in_and_reach_admin(app, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    assert _create_admin(app).exit_code == 0
    client = app.test_client()
    resp = client.post(
        "/auth/login", data={"email": "root@example.com", "password": ADMIN_PASSWORD}
    )
    assert resp.status_code == 302
    assert client.get("/admin/").status_code == 200


def test_create_admin_prompts_for_hidden_confirmed_password(app, monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    result = _create_admin(app, input=f"{ADMIN_PASSWORD}\n{ADMIN_PASSWORD}\n")
    assert result.exit_code == 0, result.output
    assert ADMIN_PASSWORD not in result.output
    assert User.query.one().check_password(ADMIN_PASSWORD)


def test_create_admin_has_no_password_option(app, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    result = _create_admin(app, "--password", "Whatever123")
    assert result.exit_code != 0
    assert User.query.count() == 0


def test_create_admin_duplicate_email_fails(app, make_user, monkeypatch):
    make_user(ROLE_RECRUIT, email="root@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    result = _create_admin(app, email="ROOT@example.com")
    assert result.exit_code != 0
    assert "already exists" in result.output
    assert User.query.count() == 1
    assert User.query.one().role == ROLE_RECRUIT


def test_create_admin_rejects_short_password(app, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "short")
    result = _create_admin(app)
    assert result.exit_code != 0
    assert "at least" in result.output or "8-128" in result.output
    assert User.query.count() == 0


@pytest.mark.parametrize("email,name", [("not-an-email", "Root"), ("root@example.com", "  ")])
def test_create_admin_rejects_invalid_email_or_name(app, monkeypatch, email, name):
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    result = _create_admin(app, email=email, name=name)
    assert result.exit_code != 0
    assert User.query.count() == 0


# --- seed-demo ----------------------------------------------------------------------------


def test_seed_demo_builds_working_graph(app, monkeypatch):
    seeded = []
    monkeypatch.setattr("app.hooks.seed_default_checklist", seeded.append)
    result = app.test_cli_runner().invoke(args=["seed-demo"])
    assert result.exit_code == 0, result.output
    assert "NON-PRODUCTION" in result.output
    assert "admin@demo.local / Admin1234" in result.output

    users = {u.email: u for u in User.query.all()}
    assert users["admin@demo.local"].role == ROLE_ADMIN
    assert users["admin@demo.local"].check_password("Admin1234")
    managers = [u for u in users.values() if u.role == ROLE_MANAGER]
    recruits = [u for u in users.values() if u.role == ROLE_RECRUIT]
    assert len(managers) >= 2 and len(recruits) >= 3
    assert all(m.manager_id is None for m in managers)
    assert all(r.manager is None or r.manager.role == ROLE_MANAGER for r in recruits)
    assert users["alex@demo.local"].manager == users["manager@demo.local"]
    assert any(r.manager is None for r in recruits)
    assert all(r.check_password("Recruit123") for r in recruits)
    assert sorted(seeded, key=lambda u: u.id) == sorted(recruits, key=lambda u: u.id)
    assert DiaryEntry.query.count() > 0
    assert all(e.user.role == ROLE_RECRUIT for e in DiaryEntry.query)
    # Every printed login actually works.
    logins = [line.split() for line in result.output.splitlines() if "@demo.local / " in line]
    assert len(logins) == len(users)
    for role, email, _slash, password in logins:
        assert users[email].role == role
        assert users[email].check_password(password)


def test_seed_demo_logins_work_end_to_end(app):
    assert app.test_cli_runner().invoke(args=["seed-demo"]).exit_code == 0
    client = app.test_client()
    resp = client.post(
        "/auth/login", data={"email": "manager@demo.local", "password": "Manager123"}
    )
    assert resp.status_code == 302


def test_seed_demo_refuses_when_data_exists(app, admin):
    result = app.test_cli_runner().invoke(args=["seed-demo"])
    assert result.exit_code != 0
    assert "refusing" in result.output
    assert User.query.count() == 1


@pytest.fixture
def production_app():
    app = create_app(ProductionConfig, SECRET_KEY="x" * 40, SQLALCHEMY_DATABASE_URI="sqlite://")
    yield from app_context_for_tests(app)


def test_seed_demo_refuses_under_production_config(production_app):
    result = production_app.test_cli_runner().invoke(args=["seed-demo"])
    assert result.exit_code != 0
    assert "production" in result.output
    assert _counts() == {"User": 0, "DiaryEntry": 0, "ChecklistItem": 0, "Tag": 0}


def test_create_admin_works_under_production_config(production_app, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    result = _create_admin(production_app)
    assert result.exit_code == 0, result.output
    assert User.query.one().role == ROLE_ADMIN
