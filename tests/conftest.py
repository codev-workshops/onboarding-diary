"""Shared fixtures. Tests build the schema with db.create_all() on in-memory SQLite.

CSRF is disabled in TestConfig for most tests; use ``csrf_client`` to assert CSRF rejection.
"""

import re
from datetime import date

import pytest
from flask import g
from flask.testing import FlaskClient

from app import create_app
from app.config import TestConfig
from app.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db as _db
from app.models import User

DEFAULT_PASSWORD = "Password123!"


class IsolatedUserClient(FlaskClient):
    """Fixtures keep one app context pushed for the whole test, and requests reuse it, so
    Flask-Login's cached ``g._login_user`` would leak between requests/clients. Clear it."""

    def open(self, *args, **kwargs):
        g.pop("_login_user", None)
        try:
            return super().open(*args, **kwargs)
        finally:
            g.pop("_login_user", None)


def app_context_for_tests(app):
    """Yield ``app`` inside an app context with a fresh schema (create_all/drop_all)."""
    app.test_client_class = IsolatedUserClient
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


def _make_app(**overrides):
    yield from app_context_for_tests(create_app(TestConfig, **overrides))


def csrf_token_from(response):
    """Extract the CSRF token from any page that extends base.html."""
    match = re.search(rb'name="csrf-token" content="([^"]+)"', response.data)
    assert match, "no csrf-token meta tag in response"
    return match.group(1).decode()


@pytest.fixture
def app():
    yield from _make_app()


@pytest.fixture
def csrf_app():
    yield from _make_app(WTF_CSRF_ENABLED=True)


@pytest.fixture
def db(app):
    return _db


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def csrf_client(csrf_app):
    return csrf_app.test_client()


@pytest.fixture
def make_user(app):
    counter = {"n": 0}

    def _make_user(
        role=ROLE_RECRUIT,
        name=None,
        email=None,
        password=DEFAULT_PASSWORD,
        manager=None,
        start_date=None,
    ):
        counter["n"] += 1
        n = counter["n"]
        user = User(
            name=name or f"{role.title()} {n}",
            email=email or f"{role}{n}@example.com",
            role=role,
            manager=manager,
            start_date=start_date or date(2026, 1, 5),
        )
        user.set_password(password)
        _db.session.add(user)
        _db.session.commit()
        return user

    return _make_user


@pytest.fixture
def manager(make_user):
    return make_user(ROLE_MANAGER)


@pytest.fixture
def recruit(make_user, manager):
    return make_user(ROLE_RECRUIT, manager=manager)


@pytest.fixture
def other_recruit(make_user):
    return make_user(ROLE_RECRUIT)


@pytest.fixture
def admin(make_user):
    return make_user(ROLE_ADMIN)


def login(client, user):
    """Log ``user`` in on ``client`` without going through the login form."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user.id)
        sess["_fresh"] = True
    return client


@pytest.fixture
def recruit_client(app, recruit):
    return login(app.test_client(), recruit)


@pytest.fixture
def manager_client(app, manager):
    return login(app.test_client(), manager)


@pytest.fixture
def admin_client(app, admin):
    return login(app.test_client(), admin)
