"""T4: admin provisioning. Endpoints: admin.index, admin.create_user, admin.assign_manager,
admin.set_start_date (all role_required(ROLE_ADMIN)).

Admin is provisioning only: these views never load or link to diary entries.
"""

from flask import abort, flash, redirect, render_template, request, url_for
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app import hooks
from app.admin import bp
from app.admin.forms import AssignManagerForm, CreateUserForm, StartDateForm
from app.constants import PER_PAGE, ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import User
from app.security import role_required

DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists."
UNASSIGNED = ""


def _email_taken(email):
    return db.session.query(User.id).filter(func.lower(User.email) == email).first() is not None


def _managers():
    return db.session.scalars(
        select(User).where(User.role == ROLE_MANAGER).order_by(User.name, User.id)
    ).all()


def _manager_choices(managers):
    return [(UNASSIGNED, "— unassigned —")] + [
        (str(m.id), f"{m.name} ({m.email})") for m in managers
    ]


def _get_user_or_404(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        abort(404)
    return user


def _back_to_index():
    page = request.args.get("page", type=int)
    return redirect(url_for("admin.index", page=page) if page else url_for("admin.index"))


@bp.get("/")
@role_required(ROLE_ADMIN)
def index():
    page = request.args.get("page", 1, type=int)
    users = db.paginate(
        select(User).order_by(User.role, User.name, User.id), page=page, per_page=PER_PAGE
    )
    choices = _manager_choices(_managers())
    rows = []
    for user in users.items:
        assign_form = None
        if user.role == ROLE_RECRUIT:
            assign_form = AssignManagerForm(
                formdata=None, manager_id=str(user.manager_id or UNASSIGNED)
            )
            assign_form.manager_id.choices = choices
        rows.append((user, assign_form, StartDateForm(formdata=None, start_date=user.start_date)))
    return render_template("admin/index.html", users=users, rows=rows)


@bp.route("/users/new", methods=["GET", "POST"])
@role_required(ROLE_ADMIN)
def create_user():
    form = CreateUserForm()
    if form.validate_on_submit():
        if _email_taken(form.email.data):
            form.email.errors.append(DUPLICATE_EMAIL_MESSAGE)
        else:
            # Fields are copied explicitly (never User(**form.data)); role was validated
            # against PROVISIONABLE_ROLE_CHOICES by the SelectField.
            user = User(
                name=form.name.data,
                email=form.email.data,
                role=form.role.data,
                start_date=form.start_date.data,
            )
            user.set_password(form.password.data)
            db.session.add(user)
            hooks.on_user_registered(user)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                form.email.errors.append(DUPLICATE_EMAIL_MESSAGE)
            else:
                flash(f"Created {user.role} {user.email}.", "success")
                return redirect(url_for("admin.index"))
    return render_template("admin/create_user.html", form=form)


@bp.post("/users/<int:user_id>/manager")
@role_required(ROLE_ADMIN)
def assign_manager(user_id):
    user = _get_user_or_404(user_id)
    form = AssignManagerForm()
    form.manager_id.choices = _manager_choices(_managers())
    if user.role != ROLE_RECRUIT:
        flash("Only recruits can be assigned to a manager.", "error")
    elif not form.validate_on_submit():
        flash("Choose a valid manager.", "error")
    elif form.manager_id.data == UNASSIGNED:
        user.manager_id = None
        db.session.commit()
        flash(f"{user.name} is now unassigned.", "success")
    else:
        manager = db.session.get(User, int(form.manager_id.data))
        if manager is None or manager.role != ROLE_MANAGER:
            flash("Recruits can only be assigned to a manager.", "error")
        else:
            user.manager_id = manager.id
            db.session.commit()
            flash(f"Assigned {user.name} to {manager.name}.", "success")
    return _back_to_index()


@bp.post("/users/<int:user_id>/start-date")
@role_required(ROLE_ADMIN)
def set_start_date(user_id):
    user = _get_user_or_404(user_id)
    form = StartDateForm()
    if form.validate_on_submit():
        user.start_date = form.start_date.data
        db.session.commit()
        flash(f"Updated start date for {user.name}.", "success")
    else:
        flash("Enter a valid date (YYYY-MM-DD) or leave it empty.", "error")
    return _back_to_index()
