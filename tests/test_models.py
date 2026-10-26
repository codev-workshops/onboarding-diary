import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError, StatementError

from app.constants import ROLE_RECRUIT
from app.models import ChecklistItem, DiaryEntry, Tag, User, entry_tags

EXPECTED_COLUMNS = {
    "users": {
        "id",
        "name",
        "email",
        "password_hash",
        "role",
        "start_date",
        "manager_id",
        "created_at",
    },
    "diary_entries": {"id", "user_id", "title", "body", "mood", "created_at", "updated_at"},
    "checklist_items": {
        "id",
        "user_id",
        "title",
        "description",
        "due_date",
        "completed",
        "completed_at",
    },
    "tags": {"id", "user_id", "name"},
    "entry_tags": {"entry_id", "tag_id"},
}

EXPECTED_FK_ONDELETE = {
    ("users", "manager_id"): "SET NULL",
    ("diary_entries", "user_id"): "CASCADE",
    ("checklist_items", "user_id"): "CASCADE",
    ("tags", "user_id"): "CASCADE",
    ("entry_tags", "entry_id"): "CASCADE",
    ("entry_tags", "tag_id"): "CASCADE",
}


def schema_snapshot(engine):
    insp = inspect(engine)
    columns = {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names()}
    fks = {}
    for table in insp.get_table_names():
        for fk in insp.get_foreign_keys(table):
            fks[(table, fk["constrained_columns"][0])] = (fk.get("options") or {}).get("ondelete")
    return columns, fks


def test_tables_columns_and_fk_ondelete(db):
    columns, fks = schema_snapshot(db.engine)
    for table, cols in EXPECTED_COLUMNS.items():
        assert columns[table] == cols
    assert fks == EXPECTED_FK_ONDELETE


def test_sqlite_foreign_keys_enabled(db):
    assert db.session.execute(text("PRAGMA foreign_keys")).scalar() == 1


def test_user_defaults_and_password_hashing(db):
    user = User(name="A", email="a@example.com")
    user.set_password("s3cret-pass")
    db.session.add(user)
    db.session.commit()
    assert user.role == ROLE_RECRUIT
    assert user.created_at is not None
    assert user.password_hash != "s3cret-pass"
    assert user.check_password("s3cret-pass")
    assert not user.check_password("wrong")


def test_email_unique(db, make_user):
    make_user(email="dup@example.com")
    with pytest.raises(IntegrityError):
        make_user(email="dup@example.com")


def test_invalid_role_rejected(db):
    user = User(name="X", email="x@example.com", password_hash="h", role="superuser")
    db.session.add(user)
    with pytest.raises(StatementError):
        db.session.commit()


def test_tag_name_unique_per_user(db, recruit, other_recruit):
    db.session.add_all([Tag(user=recruit, name="week1"), Tag(user=other_recruit, name="week1")])
    db.session.commit()
    db.session.add(Tag(user=recruit, name="week1"))
    with pytest.raises(IntegrityError):
        db.session.commit()


def _populate(db, user):
    tag = Tag(user=user, name="t")
    entry = DiaryEntry(user=user, title="Day 1", body="Hello", mood="good", tags=[tag])
    item = ChecklistItem(user=user, title="Laptop setup")
    db.session.add_all([tag, entry, item])
    db.session.commit()
    return entry, tag, item


def _counts(db):
    return {
        "entries": db.session.query(DiaryEntry).count(),
        "tags": db.session.query(Tag).count(),
        "items": db.session.query(ChecklistItem).count(),
        "links": db.session.execute(entry_tags.select()).all().__len__(),
    }


def test_orm_delete_user_cascades(db, recruit):
    _populate(db, recruit)
    db.session.delete(recruit)
    db.session.commit()
    assert _counts(db) == {"entries": 0, "tags": 0, "items": 0, "links": 0}


def test_db_level_delete_user_cascades(db, recruit):
    _populate(db, recruit)
    user_id = recruit.id
    db.session.expunge_all()
    db.session.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
    db.session.commit()
    assert _counts(db) == {"entries": 0, "tags": 0, "items": 0, "links": 0}


def test_deleting_entry_removes_links_but_keeps_tag(db, recruit):
    entry, tag, _ = _populate(db, recruit)
    db.session.delete(entry)
    db.session.commit()
    assert db.session.get(Tag, tag.id) is not None
    assert _counts(db)["links"] == 0


def test_deleting_manager_keeps_recruits(db, manager, recruit):
    assert recruit.manager_id == manager.id
    assert manager.recruits == [recruit]
    recruit_id = recruit.id
    db.session.delete(manager)
    db.session.commit()
    db.session.expire_all()
    remaining = db.session.get(User, recruit_id)
    assert remaining is not None
    assert remaining.manager_id is None
