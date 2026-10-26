"""T1: auth routes. Endpoints: auth.register, auth.login, auth.logout (POST)."""

from urllib.parse import urlsplit

from flask import flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import hooks
from app.auth import bp
from app.auth.forms import LoginForm, RegistrationForm
from app.constants import ROLE_RECRUIT
from app.extensions import db
from app.models import User

DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists."


def _email_taken(email):
    return db.session.query(User.id).filter(func.lower(User.email) == email).first() is not None


def is_safe_next(target):
    """Allow only relative, same-host paths such as ``/entries?page=2``."""
    if not target or not target.startswith("/") or target.startswith("//"):
        return False
    if "\\" in target or any(ord(ch) < 32 or ord(ch) == 127 for ch in target):
        return False
    parts = urlsplit(target)
    return not parts.scheme and not parts.netloc


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))

    form = RegistrationForm()
    if form.validate_on_submit():
        # Signup intentionally reports a taken email. This is an accepted tradeoff for a small
        # internal app: the "don't leak existence / 404" rule covers diary-entry ownership,
        # not account signup.
        if _email_taken(form.email.data):
            form.email.errors.append(DUPLICATE_EMAIL_MESSAGE)
        else:
            # Fields are copied explicitly (never User(**form.data)); role is always set here.
            # The recruit picks their own start_date at signup; an admin may override it (T4).
            user = User(
                name=form.name.data,
                email=form.email.data,
                role=ROLE_RECRUIT,
                start_date=form.start_date.data,
            )
            user.set_password(form.password.data)
            db.session.add(user)
            hooks.on_user_registered(user)
            try:
                db.session.commit()
            except IntegrityError:
                # Lost a race with a concurrent signup for the same email.
                db.session.rollback()
                form.email.errors.append(DUPLICATE_EMAIL_MESSAGE)
            else:
                login_user(user)
                flash("Welcome! Your account has been created.", "success")
                return redirect(url_for("main.index"))
    return render_template("auth/register.html", form=form)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))

    form = LoginForm()
    if form.validate_on_submit():
        user = db.session.query(User).filter(func.lower(User.email) == form.email.data).first()
        if user is not None and user.check_password(form.password.data):
            login_user(user)
            next_url = request.args.get("next")
            return redirect(next_url if is_safe_next(next_url) else url_for("main.index"))
        flash("Invalid email or password.", "error")
    return render_template("auth/login.html", form=form)


@bp.post("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("main.index"))
