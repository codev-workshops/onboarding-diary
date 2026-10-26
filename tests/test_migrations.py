"""The single committed migration must build exactly the schema defined by the models."""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from flask_migrate import downgrade, upgrade
from sqlalchemy import inspect

from app import create_app
from app.config import TestConfig
from app.extensions import db
from tests.test_models import EXPECTED_COLUMNS, EXPECTED_FK_ONDELETE, schema_snapshot


def test_upgrade_matches_models_and_downgrades(tmp_path):
    app = create_app(TestConfig, SQLALCHEMY_DATABASE_URI=f"sqlite:///{tmp_path / 'm.db'}")
    with app.app_context():
        upgrade()
        columns, fks = schema_snapshot(db.engine)
        for table, cols in EXPECTED_COLUMNS.items():
            assert columns[table] == cols
        assert fks == EXPECTED_FK_ONDELETE

        with db.engine.connect() as conn:
            ctx = MigrationContext.configure(
                conn, opts={"compare_type": True, "render_as_batch": True}
            )
            assert compare_metadata(ctx, db.metadata) == []

        downgrade(revision="base")
        assert set(inspect(db.engine).get_table_names()) == {"alembic_version"}
        db.engine.dispose()
