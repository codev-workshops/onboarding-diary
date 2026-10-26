import logging
import os

from flask import Flask, render_template

from app.config import CONFIGS, DEV_SECRET_KEY, ProductionConfig
from app.extensions import csrf, db, login_manager, migrate


def create_app(config=None, **overrides):
    """App factory.

    ``config`` is a config class, a name from ``app.config.CONFIGS``, or None
    (uses ``APP_CONFIG`` env var, default ``development``). ``overrides`` are applied last.
    """
    if config is None:
        config = os.environ.get("APP_CONFIG", "development")
    if isinstance(config, str):
        config = CONFIGS[config]

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config)
    app.config.update(overrides)

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY must be set (env var SECRET_KEY).")
    if config is ProductionConfig and (
        len(app.config["SECRET_KEY"]) < 32 or app.config["SECRET_KEY"] == DEV_SECRET_KEY
    ):
        raise RuntimeError("SECRET_KEY must be a random value of at least 32 characters.")
    if app.config["SECRET_KEY"] == DEV_SECRET_KEY:
        logging.getLogger(__name__).warning("Using the insecure development SECRET_KEY.")

    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        os.makedirs(app.instance_path, exist_ok=True)
        db_path = os.path.join(app.instance_path, "onboarding.db")
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"

    db.init_app(app)
    migrate.init_app(app, db, render_as_batch=True, compare_type=True)
    csrf.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message_category = "info"

    from app import models  # noqa: F401  (register models with SQLAlchemy metadata)

    _register_blueprints(app)
    _register_error_handlers(app)
    _register_template_helpers(app)

    from app.cli import register_cli

    register_cli(app)
    return app


def _register_blueprints(app):
    from app.admin import bp as admin_bp
    from app.auth import bp as auth_bp
    from app.checklist import bp as checklist_bp
    from app.diary import bp as diary_bp
    from app.main import bp as main_bp
    from app.manager import bp as manager_bp
    from app.search import bp as search_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(diary_bp, url_prefix="/entries")
    app.register_blueprint(checklist_bp, url_prefix="/checklist")
    app.register_blueprint(search_bp, url_prefix="/search")
    app.register_blueprint(manager_bp, url_prefix="/manager")
    app.register_blueprint(admin_bp, url_prefix="/admin")


def _register_error_handlers(app):
    @app.errorhandler(403)
    def forbidden(_error):
        return render_template("errors/403.html"), 403

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("errors/404.html"), 404


def _register_template_helpers(app):
    @app.context_processor
    def inject_helpers():
        # Nav links render only once the owning task has added the endpoint.
        return {"has_endpoint": lambda endpoint: endpoint in app.view_functions}
