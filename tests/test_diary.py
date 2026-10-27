import re
from datetime import datetime, timedelta

import pytest

from app.constants import MOOD_VALUES, PER_PAGE, ROLE_RECRUIT
from app.extensions import db
from app.models import DiaryEntry, User
from tests.conftest import DEFAULT_PASSWORD, csrf_token_from, login


def _make_entry(user, title="My first day", body="Met the team.", mood="good", **kwargs):
    entry = DiaryEntry(user_id=user.id, title=title, body=body, mood=mood, **kwargs)
    db.session.add(entry)
    db.session.commit()
    return entry


def _snapshot(entry_id):
    db.session.expire_all()
    entry = db.session.get(DiaryEntry, entry_id)
    return None if entry is None else (entry.title, entry.body, entry.mood, entry.updated_at)


def _entry_form(**overrides):
    data = {"title": "Week one", "body": "Set up my laptop.", "mood": "great"}
    data.update(overrides)
    return data


@pytest.fixture
def entry(recruit):
    return _make_entry(recruit)


# --- auth & methods -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "method,path",
    [("get", "/entries/"), ("get", "/entries/new"), ("get", "/entries/1"),
     ("get", "/entries/1/edit"), ("post", "/entries/1/delete")],
)  # fmt: skip
def test_routes_require_login(client, method, path):
    resp = getattr(client, method)(path)
    assert resp.status_code == 302
    assert "/auth/login" in resp.headers["Location"]


def test_get_delete_is_not_allowed(recruit_client, entry):
    assert recruit_client.get(f"/entries/{entry.id}/delete").status_code == 405
    assert _snapshot(entry.id) is not None


# --- create / read / update / delete ------------------------------------------------------


def test_new_entry_form_renders_mood_choices(recruit_client):
    resp = recruit_client.get("/entries/new")
    assert resp.status_code == 200
    assert b'<option value="">No mood</option>' in resp.data
    assert b"selected" not in resp.data
    for value in MOOD_VALUES:
        assert f'value="{value}"'.encode() in resp.data


def test_create_entry(recruit_client, recruit):
    resp = recruit_client.post("/entries/new", data=_entry_form(title="  Week one  "))
    entry = DiaryEntry.query.one()
    assert resp.status_code == 302
    assert resp.headers["Location"] == f"/entries/{entry.id}"
    assert (entry.user_id, entry.title, entry.body, entry.mood) == (
        recruit.id,
        "Week one",
        "Set up my laptop.",
        "great",
    )


def test_create_entry_ignores_submitted_user_id(recruit_client, recruit, other_recruit):
    recruit_client.post("/entries/new", data=_entry_form(user_id=other_recruit.id))
    assert DiaryEntry.query.one().user_id == recruit.id


def test_create_entry_without_mood_stores_null(recruit_client):
    recruit_client.post("/entries/new", data=_entry_form(mood=""))
    assert DiaryEntry.query.one().mood is None


@pytest.mark.parametrize("missing", ["title", "body"])
def test_create_entry_requires_title_and_body(recruit_client, missing):
    resp = recruit_client.post("/entries/new", data=_entry_form(**{missing: "   "}))
    assert resp.status_code == 200
    assert b"This field is required." in resp.data
    assert DiaryEntry.query.count() == 0


@pytest.mark.parametrize("mood", ["ecstatic", "Great", "None", "<script>"])
def test_create_entry_rejects_mood_not_in_constants(recruit_client, mood):
    resp = recruit_client.post("/entries/new", data=_entry_form(mood=mood))
    assert resp.status_code == 200
    assert b"Not a valid mood." in resp.data
    assert DiaryEntry.query.count() == 0


@pytest.mark.parametrize("mood", MOOD_VALUES)
def test_create_entry_accepts_every_mood_value(recruit_client, mood):
    recruit_client.post("/entries/new", data=_entry_form(mood=mood))
    assert DiaryEntry.query.one().mood == mood


def test_view_entry_escapes_content(recruit_client, recruit):
    entry = _make_entry(recruit, title="<b>Hi</b>", body="<script>alert(1)</script>", mood=None)
    resp = recruit_client.get(f"/entries/{entry.id}")
    assert resp.status_code == 200
    assert b"&lt;b&gt;Hi&lt;/b&gt;" in resp.data
    assert b"&lt;script&gt;alert(1)&lt;/script&gt;" in resp.data
    assert b"<script>alert(1)</script>" not in resp.data
    assert b"No mood" in resp.data


def test_view_entry_shows_mood_label(recruit_client, entry):
    resp = recruit_client.get(f"/entries/{entry.id}")
    assert b"Mood: Good" in resp.data
    assert b"Met the team." in resp.data


def test_edit_form_prefills_entry(recruit_client, entry):
    resp = recruit_client.get(f"/entries/{entry.id}/edit")
    assert resp.status_code == 200
    assert b'value="My first day"' in resp.data
    assert b'<option selected value="good">' in resp.data


def test_edit_form_prefills_no_mood(recruit_client, recruit):
    entry = _make_entry(recruit, mood=None)
    resp = recruit_client.get(f"/entries/{entry.id}/edit")
    assert b'<option value="">No mood</option>' in resp.data
    assert b"selected" not in resp.data


def test_edit_entry_updates_fields_and_updated_at(recruit_client, recruit):
    old = datetime(2026, 1, 1, 9, 0)
    entry = _make_entry(recruit, created_at=old, updated_at=old)
    resp = recruit_client.post(
        f"/entries/{entry.id}/edit", data=_entry_form(title="Edited", body="New body", mood="")
    )
    assert resp.status_code == 302
    assert resp.headers["Location"] == f"/entries/{entry.id}"
    db.session.expire_all()
    entry = db.session.get(DiaryEntry, entry.id)
    assert (entry.title, entry.body, entry.mood) == ("Edited", "New body", None)
    assert entry.created_at == old
    assert entry.updated_at > old


def test_edit_entry_rejects_invalid_mood(recruit_client, entry):
    before = _snapshot(entry.id)
    resp = recruit_client.post(f"/entries/{entry.id}/edit", data=_entry_form(mood="furious"))
    assert resp.status_code == 200
    assert b"Not a valid mood." in resp.data
    assert _snapshot(entry.id) == before


def test_delete_entry(recruit_client, entry):
    resp = recruit_client.post(f"/entries/{entry.id}/delete")
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/entries/"
    assert _snapshot(entry.id) is None


def test_missing_entry_is_404(recruit_client):
    assert recruit_client.get("/entries/999").status_code == 404
    assert recruit_client.get("/entries/999/edit").status_code == 404
    assert recruit_client.post("/entries/999/delete").status_code == 404


# --- ownership: every non-owner gets 404 --------------------------------------------------


@pytest.fixture(params=["other_recruit", "manager", "admin"])
def non_owner_client(request, app):
    # ``manager`` is the entry owner's assigned manager (see conftest ``recruit``).
    return login(app.test_client(), request.getfixturevalue(request.param))


@pytest.mark.parametrize(
    "method,suffix,data",
    [
        ("get", "", None),
        ("get", "/edit", None),
        ("post", "/edit", _entry_form(title="Hijacked", body="Hijacked", mood="")),
        ("post", "/delete", None),
    ],
)
def test_non_owner_gets_404_and_entry_is_unchanged(non_owner_client, entry, method, suffix, data):
    before = _snapshot(entry.id)
    resp = getattr(non_owner_client, method)(f"/entries/{entry.id}{suffix}", data=data)
    assert resp.status_code == 404
    assert b"Met the team." not in resp.data
    assert _snapshot(entry.id) == before


def test_list_shows_only_own_entries(non_owner_client, recruit_client, entry):
    resp = non_owner_client.get("/entries/")
    assert resp.status_code == 200
    assert b"My first day" not in resp.data
    assert b"No entries yet." in resp.data
    assert b"My first day" in recruit_client.get("/entries/").data


# --- list & pagination --------------------------------------------------------------------


@pytest.fixture
def many_entries(recruit, other_recruit):
    base = datetime(2026, 1, 1, 9, 0)
    for i in range(25):
        _make_entry(recruit, title=f"Entry {i:02d}", created_at=base + timedelta(hours=i))
    _make_entry(other_recruit, title="Not mine", created_at=base + timedelta(days=30))


def _titles(resp):
    return re.findall(r">(Entry \d\d|Not mine)</a>", resp.get_data(as_text=True))


def test_pagination_splits_newest_first(recruit_client, many_entries):
    pages = [_titles(recruit_client.get(f"/entries/?page={n}")) for n in (1, 2, 3)]
    assert [len(p) for p in pages] == [PER_PAGE, PER_PAGE, 5]
    flat = [title for page in pages for title in page]
    assert flat == [f"Entry {i:02d}" for i in range(24, -1, -1)]
    assert b"Page 1 of 3" in recruit_client.get("/entries/").data


def test_pagination_links(recruit_client, many_entries):
    first = recruit_client.get("/entries/").data
    assert b'href="/entries/?page=2"' in first and b"Newer" not in first
    middle = recruit_client.get("/entries/?page=2").data
    assert b'href="/entries/?page=1"' in middle and b'href="/entries/?page=3"' in middle
    last = recruit_client.get("/entries/?page=3").data
    assert b"Older" not in last


def test_same_timestamp_entries_order_by_id(recruit_client, recruit):
    when = datetime(2026, 1, 1, 9, 0)
    for i in range(3):
        _make_entry(recruit, title=f"Entry {i:02d}", created_at=when)
    assert _titles(recruit_client.get("/entries/")) == ["Entry 02", "Entry 01", "Entry 00"]


@pytest.mark.parametrize(
    "query,expected",
    [("?page=99", "/entries/?page=3"), ("?page=0", "/entries/?page=1"),
     ("?page=-4", "/entries/?page=1")],
)  # fmt: skip
def test_out_of_range_page_redirects_to_nearest_page(recruit_client, many_entries, query, expected):
    resp = recruit_client.get(f"/entries/{query}")
    assert resp.status_code == 302
    assert resp.headers["Location"] == expected


def test_non_numeric_page_falls_back_to_first_page(recruit_client, many_entries):
    resp = recruit_client.get("/entries/?page=abc")
    assert resp.status_code == 200
    assert _titles(resp)[0] == "Entry 24"


def test_empty_list_out_of_range_page_redirects_to_page_one(recruit_client):
    resp = recruit_client.get("/entries/?page=5")
    assert resp.headers["Location"] == "/entries/?page=1"
    assert b"No entries yet." in recruit_client.get("/entries/?page=1").data


# --- CSRF ---------------------------------------------------------------------------------


def _create_user_in_current_app(email="csrf-recruit@example.com"):
    """``make_user`` is bound to the ``app`` fixture's DB, not ``csrf_app``'s."""
    user = User(name="CSRF Recruit", email=email, role=ROLE_RECRUIT)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


def test_delete_requires_valid_csrf_token(csrf_client):
    owner = _create_user_in_current_app()
    entry = _make_entry(owner)
    client = login(csrf_client, owner)

    for data in ({}, {"csrf_token": "not-a-real-token"}):
        resp = client.post(f"/entries/{entry.id}/delete", data=data)
        assert resp.status_code == 400
        assert _snapshot(entry.id) is not None

    token = csrf_token_from(client.get(f"/entries/{entry.id}"))
    resp = client.post(f"/entries/{entry.id}/delete", data={"csrf_token": token})
    assert resp.status_code == 302
    assert _snapshot(entry.id) is None
