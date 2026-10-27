import os
from datetime import date

import click
from email_validator import EmailNotValidError, validate_email
from sqlalchemy import func

from app import hooks
from app.admin.forms import MIN_PASSWORD_LENGTH
from app.auth.forms import normalize_email
from app.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import DiaryEntry, User

DEMO_ADMIN = ("Demo Admin", "admin@demo.local", "Admin1234")
DEMO_MANAGERS = [
    ("Morgan Manager", "manager@demo.local", "Manager123"),
    ("Sam Supervisor", "sam@demo.local", "Manager123"),
]
# (name, email, password, manager email or None)
DEMO_RECRUITS = [
    ("Alex Recruit", "alex@demo.local", "Recruit123", "manager@demo.local"),
    ("Priya Recruit", "priya@demo.local", "Recruit123", "manager@demo.local"),
    ("Jordan Recruit", "jordan@demo.local", "Recruit123", "sam@demo.local"),
    ("Casey Unassigned", "casey@demo.local", "Recruit123", None),
]
DEMO_ENTRIES = {
    "alex@demo.local": [
        ("First day", "Met the team and set up my laptop.", "great"),
        ("Codebase tour", "Walked through the main services with my buddy.", "good"),
    ],
    "priya@demo.local": [("Week one", "Lots of new names to remember.", "okay")],
    "jordan@demo.local": [("Access requests", "Still waiting on some permissions.", "stressed")],
}


def _email_taken(email):
    return db.session.query(User.id).filter(func.lower(User.email) == email).first() is not None


def _new_user(name, email, password, role, start_date=None, manager=None):
    user = User(name=name, email=email, role=role, start_date=start_date, manager=manager)
    user.set_password(password)
    db.session.add(user)
    hooks.on_user_registered(user)
    return user


def register_cli(app):
    """Register top-level ``flask`` commands: ``create-admin`` and ``seed-demo``."""

    @app.cli.command("create-admin")
    @click.option("--email", required=True, help="Email address of the new admin.")
    @click.option("--name", required=True, help="Display name of the new admin.")
    def create_admin(email, name):
        """Create an admin account (production-safe; no demo data).

        The password is read from the ADMIN_PASSWORD env var, or prompted for (hidden,
        confirmed). It is deliberately not accepted as a CLI argument.
        """
        try:
            email = normalize_email(
                validate_email(email.strip(), check_deliverability=False).normalized
            )
        except EmailNotValidError as exc:
            raise click.ClickException(f"Invalid email: {exc}") from exc
        name = name.strip()
        if not name or len(name) > 120:
            raise click.ClickException("Name must be 1-120 characters.")
        if _email_taken(email):
            raise click.ClickException(f"A user with email {email} already exists.")

        password = os.environ.get("ADMIN_PASSWORD")
        if password is None:
            password = click.prompt("Admin password", hide_input=True, confirmation_prompt=True)
        if not MIN_PASSWORD_LENGTH <= len(password) <= 128:
            raise click.ClickException(
                f"Password must be {MIN_PASSWORD_LENGTH}-128 characters long."
            )

        _new_user(name, email, password, ROLE_ADMIN)
        db.session.commit()
        click.echo(f"Created admin {email}.")

    @app.cli.command("seed-demo")
    def seed_demo():
        """NON-PRODUCTION: seed demo users, assignments and sample diary entries."""
        if app.config.get("IS_PRODUCTION", True):
            raise click.ClickException(
                "seed-demo is for local/testing use only and refuses to run under the "
                "production config. Use `flask create-admin` instead."
            )
        if db.session.query(User.id).first() is not None:
            raise click.ClickException("Database already contains users; refusing to seed.")

        click.echo("NON-PRODUCTION demo data: do not use these accounts outside local/testing.")
        start = date.today()
        users = {}
        name, email, password = DEMO_ADMIN
        users[email] = _new_user(name, email, password, ROLE_ADMIN)
        for name, email, password in DEMO_MANAGERS:
            users[email] = _new_user(name, email, password, ROLE_MANAGER, start_date=start)
        for name, email, password, manager_email in DEMO_RECRUITS:
            manager = users[manager_email] if manager_email else None
            users[email] = _new_user(
                name, email, password, ROLE_RECRUIT, start_date=start, manager=manager
            )
        for email, entries in DEMO_ENTRIES.items():
            for title, body, mood in entries:
                db.session.add(DiaryEntry(user=users[email], title=title, body=body, mood=mood))
        db.session.commit()

        click.echo("Demo logins (email / password):")
        logins = [DEMO_ADMIN, *DEMO_MANAGERS, *(r[:3] for r in DEMO_RECRUITS)]
        for _name, email, password in logins:
            click.echo(f"  {users[email].role:<8} {email} / {password}")
