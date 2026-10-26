from flask_wtf import FlaskForm
from wtforms import DateField, EmailField, PasswordField, StringField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length


def normalize_email(value):
    return value.strip().lower() if isinstance(value, str) else value


def strip(value):
    return value.strip() if isinstance(value, str) else value


class RegistrationForm(FlaskForm):
    # Deliberately no ``role`` field: public signup is always a recruit (set server-side).
    name = StringField("Name", filters=[strip], validators=[DataRequired(), Length(max=120)])
    email = EmailField(
        "Email", filters=[normalize_email], validators=[DataRequired(), Email(), Length(max=255)]
    )
    password = PasswordField("Password", validators=[DataRequired(), Length(min=8, max=128)])
    confirm_password = PasswordField(
        "Confirm password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match.")],
    )
    start_date = DateField("Start date", validators=[DataRequired()])
    submit = SubmitField("Register")


class LoginForm(FlaskForm):
    email = EmailField("Email", filters=[normalize_email], validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Log in")
