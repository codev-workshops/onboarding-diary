# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their onboarding journey.

Flask app (app factory + one blueprint per feature), SQLAlchemy, Flask-Migrate (Alembic),
Flask-Login, Flask-WTF (CSRF). SQLite by default.

## Setup

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional; edit as needed
flask db upgrade              # creates instance/onboarding.db (or DATABASE_URL)
flask run                     # http://127.0.0.1:5000  (GET /health -> {"status": "ok"})
```

Tests and lint:

```bash
pytest --cov=app
ruff check . && ruff format --check .
```

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `APP_CONFIG` | `development` | `development`, `testing` or `production` |
| `SECRET_KEY` | dev-only fallback | **Required in production** — `create_app` raises `RuntimeError` if unset |
| `DATABASE_URL` | `sqlite:///<instance>/onboarding.db` | Any SQLAlchemy URL |
| `FLASK_APP` | `app` (from `.flaskenv`) | |

Production config sets `SESSION_COOKIE_SECURE`/`REMEMBER_COOKIE_SECURE=True`; all configs set
`HttpOnly=True` and `SameSite=Lax`.

## Layout

```
app/
  __init__.py      create_app(config=None, **overrides)
  extensions.py    db, migrate, login_manager, csrf (+ SQLite PRAGMA foreign_keys=ON)
  config.py        DevelopmentConfig / TestConfig / ProductionConfig
  constants.py     ROLES, MOOD_CHOICES, PER_PAGE
  models.py        the complete schema (frozen)
  security.py      role_required(...), get_owned_or_404(model, id)
  hooks.py         on_user_registered(user) -> seed_default_checklist for recruits
  cli.py           register_cli(app) (T4 adds create-admin / seed-demo)
  main/            /, /health
  auth/ diary/ checklist/ search/ manager/ admin/   feature blueprints (stubs until their task)
migrations/        one initial migration
tests/             conftest.py fixtures + tests
```

## Rules for feature tasks

**The schema is frozen. Feature tasks add routes, forms, templates and logic only — never models
or migrations.** If a task seems to need a schema change, stop and raise it instead.

- Import `db` from `app.extensions`; register routes on the existing blueprint for your feature
  (see the endpoint names in each `routes.py` docstring — `base.html` shows nav links for them
  automatically once they exist).
- `role` is never user-submittable. Public registration forces `role='recruit'` server-side; forms
  never bind `role`; never `User(**form.data)`. Managers/admins come only from admin provisioning,
  `flask create-admin` or `flask seed-demo`.
- `admin` grants provisioning rights only. It does **not** bypass diary ownership.
- Non-owner access → **404** (use `get_owned_or_404`). The only 403 is role-gating
  (`role_required`): recruit on the manager dashboard, non-admin on admin provisioning,
  admin on the manager dashboard.
- Every state change is **POST + CSRF** (Flask-WTF). No GET mutates state; logout is POST.
- Mood values come only from `app.constants.MOOD_CHOICES` (manually selected, not NLP).
- Managers see aggregate progress only (entry count + checklist %); diary content and mood are
  private to the owning recruit.
- Paginate lists with `PER_PAGE` (10).

## Schema notes

- `users.manager_id` uses `ON DELETE SET NULL`, so deleting a manager does not delete their
  recruits. Every other FK uses `ON DELETE CASCADE`, with matching ORM
  `cascade="all, delete-orphan"`.
- SQLite only enforces FKs when `PRAGMA foreign_keys=ON` is set; `app/extensions.py` sets it on
  every connection.
- Migrations use Alembic batch mode (`render_as_batch=True`) and a MetaData naming convention so
  every constraint has a stable name.
- Drift check: `flask db upgrade` on a fresh DB followed by `flask db check` must report
  "No new upgrade operations detected." `tests/test_migrations.py` does the same comparison in
  pytest.

## Testing conventions

- Tests build the schema with `db.create_all()` on in-memory SQLite (`TestConfig`).
- `TestConfig` sets `WTF_CSRF_ENABLED=False`. To test CSRF rejection, use the `csrf_app` /
  `csrf_client` fixtures and `csrf_token_from(response)` from `tests/conftest.py`.
- Fixtures: `app`, `db`, `client`, `make_user(role, ...)`, `recruit` (assigned to `manager`),
  `other_recruit`, `manager`, `admin`, `recruit_client`, `manager_client`, `admin_client`, and
  `login(client, user)`.
