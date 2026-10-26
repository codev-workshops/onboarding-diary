"""The complete schema. Frozen after T0: feature tasks must not add models or migrations."""

from datetime import datetime, timezone

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.constants import ROLE_RECRUIT, ROLES
from app.extensions import db, login_manager


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


entry_tags = db.Table(
    "entry_tags",
    db.Column(
        "entry_id",
        db.Integer,
        db.ForeignKey("diary_entries.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "tag_id",
        db.Integer,
        db.ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum(*ROLES, name="user_role", create_constraint=True, validate_strings=True),
        nullable=False,
        default=ROLE_RECRUIT,
    )
    start_date = db.Column(db.Date)
    # SET NULL (not CASCADE): removing a manager must not delete their recruits.
    manager_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    manager = db.relationship(
        "User", remote_side=[id], back_populates="recruits", foreign_keys=[manager_id]
    )
    recruits = db.relationship(
        "User", back_populates="manager", foreign_keys=[manager_id], passive_deletes=True
    )
    entries = db.relationship(
        "DiaryEntry", back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    checklist_items = db.relationship(
        "ChecklistItem", back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    tags = db.relationship(
        "Tag", back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.id} {self.email} {self.role}>"


class DiaryEntry(db.Model):
    __tablename__ = "diary_entries"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    mood = db.Column(db.String(20))  # one of constants.MOOD_VALUES, or NULL
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="entries")
    tags = db.relationship("Tag", secondary=entry_tags, back_populates="entries")


class ChecklistItem(db.Model):
    __tablename__ = "checklist_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.Date)
    completed = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    completed_at = db.Column(db.DateTime)

    user = db.relationship("User", back_populates="checklist_items")


class Tag(db.Model):
    __tablename__ = "tags"
    __table_args__ = (db.UniqueConstraint("user_id", "name"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(50), nullable=False)

    user = db.relationship("User", back_populates="tags")
    entries = db.relationship(
        "DiaryEntry", secondary=entry_tags, back_populates="tags", passive_deletes=True
    )


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))
