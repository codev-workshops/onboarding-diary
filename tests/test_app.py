import pytest

from app import create_app
from app.config import DevelopmentConfig, ProductionConfig, TestConfig


def test_health_returns_200(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_index_renders(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Onboarding Diary" in resp.data


def test_unknown_route_is_404(client):
    assert client.get("/no-such-page").status_code == 404


def test_create_app_accepts_config_name():
    app = create_app("testing")
    assert app.config["TESTING"] is True


def test_production_requires_secret_key(monkeypatch):
    monkeypatch.setattr(ProductionConfig, "SECRET_KEY", None)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(ProductionConfig, SQLALCHEMY_DATABASE_URI="sqlite://")


@pytest.mark.parametrize("key", ["change-me", "dev-insecure-secret-key"])
def test_production_rejects_weak_secret_key(monkeypatch, key):
    monkeypatch.setattr(ProductionConfig, "SECRET_KEY", key)
    with pytest.raises(RuntimeError, match="32 characters"):
        create_app(ProductionConfig, SQLALCHEMY_DATABASE_URI="sqlite://")


def test_production_subclass_rejects_weak_secret_key():
    class CustomProduction(ProductionConfig):
        SECRET_KEY = "dev-insecure-secret-key"

    with pytest.raises(RuntimeError, match="32 characters"):
        create_app(CustomProduction, SQLALCHEMY_DATABASE_URI="sqlite://")


def test_production_cookie_flags(monkeypatch):
    monkeypatch.setattr(ProductionConfig, "SECRET_KEY", "x" * 32)
    app = create_app(ProductionConfig, SQLALCHEMY_DATABASE_URI="sqlite://")
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"
    assert app.config["SESSION_COOKIE_SECURE"] is True
    assert app.config["REMEMBER_COOKIE_SECURE"] is True
    assert app.config["WTF_CSRF_ENABLED"] is True


def test_development_has_fallback_secret_and_csrf_on():
    assert DevelopmentConfig.SECRET_KEY
    assert DevelopmentConfig.WTF_CSRF_ENABLED is True
    assert TestConfig.WTF_CSRF_ENABLED is False


def test_all_feature_blueprints_registered(app):
    assert {"main", "auth", "diary", "checklist", "search", "manager", "admin"} <= set(
        app.blueprints
    )
