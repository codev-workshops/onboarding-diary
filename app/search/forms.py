from flask_wtf import FlaskForm
from wtforms import IntegerField, StringField, SubmitField
from wtforms.validators import DataRequired, InputRequired, Length

from app.auth.forms import strip

TAG_NAME_MAX = 50  # matches tags.name String(50)


class TagForm(FlaskForm):
    name = StringField(
        "Tag name", filters=[strip], validators=[DataRequired(), Length(max=TAG_NAME_MAX)]
    )
    submit = SubmitField("Save")


class EntryTagForm(FlaskForm):
    """Attach one of the current user's tags to an entry (``tag_id`` ownership checked in view)."""

    tag_id = IntegerField("Tag", validators=[InputRequired()])
    submit = SubmitField("Add tag")


class PostOnlyForm(FlaskForm):
    """CSRF-only form for delete/untag buttons."""

    submit = SubmitField("Remove")
