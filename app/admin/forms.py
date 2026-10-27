from flask_wtf import FlaskForm
from wtforms import DateField, EmailField, PasswordField, SelectField, StringField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Optional

from app.auth.forms import normalize_email, strip
from app.constants import ROLE_MANAGER, ROLE_RECRUIT

# Roles an admin may provision from the UI. Admins are created only via `flask create-admin`.
PROVISIONABLE_ROLE_CHOICES = [(ROLE_MANAGER, "Manager"), (ROLE_RECRUIT, "Recruit")]
MIN_PASSWORD_LENGTH = 8


class CreateUserForm(FlaskForm):
    name = StringField("Name", filters=[strip], validators=[DataRequired(), Length(max=120)])
    email = EmailField(
        "Email", filters=[normalize_email], validators=[DataRequired(), Email(), Length(max=255)]
    )
    # SelectField rejects any value not in ``choices`` during validation.
    role = SelectField("Role", choices=PROVISIONABLE_ROLE_CHOICES, default=ROLE_MANAGER)
    password = PasswordField(
        "Password", validators=[DataRequired(), Length(min=MIN_PASSWORD_LENGTH, max=128)]
    )
    confirm_password = PasswordField(
        "Confirm password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match.")],
    )
    start_date = DateField("Start date (optional)", validators=[Optional()])
    submit = SubmitField("Create user")


class AssignManagerForm(FlaskForm):
    """``manager_id`` choices are set per request: "" (unassigned) plus every manager."""

    manager_id = SelectField("Manager", choices=[], validate_choice=True)
    submit = SubmitField("Save")


class StartDateForm(FlaskForm):
    start_date = DateField("Start date", validators=[Optional()])
    submit = SubmitField("Save")
