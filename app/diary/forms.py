from flask_wtf import FlaskForm
from wtforms import SelectField, StringField, SubmitField, TextAreaField
from wtforms.validators import AnyOf, DataRequired, Length, Optional

from app.constants import MOOD_CHOICES, MOOD_VALUES

NO_MOOD = ""


def strip(value):
    return value.strip() if isinstance(value, str) else value


class EntryForm(FlaskForm):
    title = StringField("Title", filters=[strip], validators=[DataRequired(), Length(max=200)])
    body = TextAreaField("Entry", validators=[DataRequired(), Length(max=20000)])
    # Choices and validation both come from app.constants; the empty choice means "no mood".
    mood = SelectField(
        "Mood",
        choices=[(NO_MOOD, "No mood"), *MOOD_CHOICES],
        validate_choice=False,
        validators=[Optional(), AnyOf(MOOD_VALUES, message="Not a valid mood.")],
    )
    submit = SubmitField("Save")


class DeleteEntryForm(FlaskForm):
    submit = SubmitField("Delete")
