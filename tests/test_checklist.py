from datetime import date, datetime, timedelta

import pytest

from app import hooks
from app.checklist.services import (
    DEFAULT_CHECKLIST,
    checklist_progress,
    is_overdue,
    seed_default_checklist,
)
from app.constants import PER_PAGE, ROLE_ADMIN, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import ChecklistItem, User, utcnow
from tests.conftest import DEFAULT_PASSWORD, csrf_token_from, login

START = date(2026, 3, 2)


def _add_items(user, *completed_flags):
    items = [
        ChecklistItem(user=user, title=f"Item {i}", completed=flag)
        for i, flag in enumerate(completed_flags)
    ]
    db.session.add_all(items)
    db.session.commit()
    return items


def _items_of(user):
    return ChecklistItem.query.filter_by(user_id=user.id).order_by(ChecklistItem.id).all()


def _toggle_url(item):
    return f"/checklist/items/{item.id}/toggle"


# --- seeding ------------------------------------------------------------------------------


def test_registration_seeds_default_checklist(client):
    resp = client.post(
        "/auth/register",
        data={
            "name": "New Recruit",
            "email": "new@example.com",
            "password": DEFAULT_PASSWORD,
            "confirm_password": DEFAULT_PASSWORD,
            "start_date": START.isoformat(),
        },
    )
    assert resp.status_code == 302
    user = User.query.filter_by(email="new@example.com").one()
    items = _items_of(user)
    assert [i.title for i in items] == [title for title, _, _ in DEFAULT_CHECKLIST]
    assert [i.due_date for i in items] == [
        START + timedelta(days=days) for _, _, days in DEFAULT_CHECKLIST
    ]
    assert all(i.description for i in items)
    assert not any(i.completed or i.completed_at for i in items)


def test_hook_seeds_recruits_but_not_managers_or_admins(make_user):
    users = {role: make_user(role) for role in (ROLE_RECRUIT, ROLE_MANAGER, ROLE_ADMIN)}
    for user in users.values():
        hooks.on_user_registered(user)
    db.session.commit()
    assert len(_items_of(users[ROLE_RECRUIT])) == len(DEFAULT_CHECKLIST)
    assert _items_of(users[ROLE_MANAGER]) == []
    assert _items_of(users[ROLE_ADMIN]) == []


def test_seed_does_not_commit(make_user):
    user = make_user(start_date=START)
    assert len(seed_default_checklist(user)) == len(DEFAULT_CHECKLIST)
    db.session.rollback()
    assert ChecklistItem.query.count() == 0


def test_seed_is_idempotent(make_user):
    user = make_user(start_date=START)
    seed_default_checklist(user)
    assert seed_default_checklist(user) == []  # still pending in the session
    db.session.commit()
    assert seed_default_checklist(user) == []  # persisted
    db.session.commit()
    assert ChecklistItem.query.count() == len(DEFAULT_CHECKLIST)


def test_seed_skips_user_with_existing_items(recruit):
    _add_items(recruit, False)
    assert seed_default_checklist(recruit) == []
    db.session.commit()
    assert len(_items_of(recruit)) == 1


def test_seed_without_start_date_uses_creation_date(app):
    created = utcnow() - timedelta(days=10)
    user = User(name="No Start", email="nostart@example.com", created_at=created)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    db.session.commit()
    seed_default_checklist(user)
    db.session.commit()
    assert _items_of(user)[0].due_date == created.date()


def test_seed_pending_user_without_start_date_uses_today(app):
    user = User(name="Pending", email="pending@example.com", role=ROLE_RECRUIT)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    seed_default_checklist(user)
    db.session.commit()
    assert _items_of(user)[0].due_date == utcnow().date()


# --- progress -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "flags,expected",
    [
        ((), 0),
        ((False, False), 0),
        ((True, False, False), 33),
        ((True, True, False), 67),
        ((True, False), 50),
        ((True,) + (False,) * 7, 13),  # 12.5 rounds half up
        ((True, True, True), 100),
    ],
)
def test_checklist_progress(recruit, flags, expected):
    _add_items(recruit, *flags)
    assert checklist_progress(recruit) == expected


def test_progress_ignores_other_users_items(recruit, other_recruit):
    _add_items(other_recruit, True, True)
    _add_items(recruit, True, False)
    assert checklist_progress(recruit) == 50


def test_is_overdue():
    today = date(2026, 3, 10)
    assert is_overdue(ChecklistItem(due_date=date(2026, 3, 9), completed=False), today)
    assert not is_overdue(ChecklistItem(due_date=date(2026, 3, 9), completed=True), today)
    assert not is_overdue(ChecklistItem(due_date=today, completed=False), today)
    assert not is_overdue(ChecklistItem(due_date=None, completed=False), today)


# --- index --------------------------------------------------------------------------------


def test_index_requires_login(client):
    resp = client.get("/checklist/")
    assert resp.status_code == 302
    assert resp.headers["Location"].startswith("/auth/login?next=")


def test_index_shows_own_items_due_dates_and_progress(recruit_client, recruit, other_recruit):
    seed_default_checklist(recruit)
    db.session.commit()
    _items_of(recruit)[0].completed = True
    db.session.add(ChecklistItem(user=other_recruit, title="Someone else's secret task"))
    db.session.commit()

    page = recruit_client.get("/checklist/")
    assert page.status_code == 200
    body = page.get_data(as_text=True)
    assert "Progress: <strong>13%</strong> (1 of 8 done)" in body
    for title, _, _ in DEFAULT_CHECKLIST:
        assert title in body
    assert f"Due {recruit.start_date.isoformat()}" in body
    assert "Mark as not done" in body and "Mark as done" in body
    assert "Someone else" not in body


def test_index_empty_state(manager_client):
    body = manager_client.get("/checklist/").get_data(as_text=True)
    assert "Progress: <strong>0%</strong>" in body
    assert "You have no checklist items." in body


def test_index_paginates(recruit_client, recruit):
    _add_items(recruit, *([False] * (PER_PAGE + 2)))
    first = recruit_client.get("/checklist/").get_data(as_text=True)
    second = recruit_client.get("/checklist/?page=2").get_data(as_text=True)
    assert first.count("Mark as done") == PER_PAGE
    assert second.count("Mark as done") == 2
    assert "Page 2 of 2" in second
    assert f'action="/checklist/items/{_items_of(recruit)[-1].id}/toggle?page=2"' in second


def test_index_out_of_range_page_is_not_empty_state(recruit_client, recruit):
    _add_items(recruit, False)
    body = recruit_client.get("/checklist/?page=5").get_data(as_text=True)
    assert "You have no checklist items." not in body
    assert "No items on this page." in body


def test_nav_shows_checklist_link(recruit_client):
    assert b'href="/checklist/"' in recruit_client.get("/").data


# --- toggle -------------------------------------------------------------------------------

DONE = {"completed": "1"}
NOT_DONE = {"completed": "0"}


def _state(item):
    db.session.expire_all()
    return item.completed, item.completed_at


def test_index_buttons_post_desired_state(recruit_client, recruit):
    todo, done = _add_items(recruit, False, True)
    body = recruit_client.get("/checklist/").get_data(as_text=True)
    form_todo = body.split(f'action="{_toggle_url(todo)}"')[1].split("</form>")[0]
    form_done = body.split(f'action="{_toggle_url(done)}"')[1].split("</form>")[0]
    assert 'name="completed" value="1"' in form_todo and "Mark as done" in form_todo
    assert 'name="completed" value="0"' in form_done and "Mark as not done" in form_done


def test_toggle_completes_and_uncompletes(recruit_client, recruit):
    (item,) = _add_items(recruit, False)

    resp = recruit_client.post(_toggle_url(item), data=DONE)
    assert resp.status_code == 302
    assert resp.headers["Location"] == "/checklist/"
    completed, completed_at = _state(item)
    assert completed is True
    assert completed_at is not None
    assert checklist_progress(recruit) == 100

    assert recruit_client.post(_toggle_url(item), data=NOT_DONE).status_code == 302
    assert _state(item) == (False, None)
    assert checklist_progress(recruit) == 0


def test_mark_done_twice_is_idempotent(recruit_client, recruit):
    (item,) = _add_items(recruit, False)
    recruit_client.post(_toggle_url(item), data=DONE)
    first = _state(item)
    assert first[0] is True and first[1] is not None

    assert recruit_client.post(_toggle_url(item), data=DONE).status_code == 302
    assert _state(item) == first  # still done, original completed_at kept


def test_mark_done_keeps_existing_completed_at(recruit_client, recruit):
    original = datetime(2026, 1, 2, 3, 4, 5)
    item = ChecklistItem(user=recruit, title="Done", completed=True, completed_at=original)
    db.session.add(item)
    db.session.commit()
    recruit_client.post(_toggle_url(item), data=DONE)
    assert _state(item) == (True, original)


def test_mark_not_done_twice_is_idempotent(recruit_client, recruit):
    (item,) = _add_items(recruit, True)
    recruit_client.post(_toggle_url(item), data=NOT_DONE)
    assert _state(item) == (False, None)
    assert recruit_client.post(_toggle_url(item), data=NOT_DONE).status_code == 302
    assert _state(item) == (False, None)


@pytest.mark.parametrize(
    "data", [{}, {"completed": ""}, {"completed": "2"}, {"completed": "true"}, {"completed": "on"}]
)
@pytest.mark.parametrize("initially_completed", [False, True])
def test_toggle_invalid_or_missing_state_is_400_and_unchanged(
    recruit_client, recruit, data, initially_completed
):
    original = datetime(2026, 1, 2, 3, 4, 5) if initially_completed else None
    item = ChecklistItem(
        user=recruit, title="Item", completed=initially_completed, completed_at=original
    )
    db.session.add(item)
    db.session.commit()
    assert recruit_client.post(_toggle_url(item), data=data).status_code == 400
    assert _state(item) == (initially_completed, original)


def test_toggle_preserves_page(recruit_client, recruit):
    (item,) = _add_items(recruit, False)
    resp = recruit_client.post(_toggle_url(item) + "?page=2", data=DONE)
    assert resp.headers["Location"] == "/checklist/?page=2"


@pytest.fixture
def other_client(app, other_recruit):
    return login(app.test_client(), other_recruit)


@pytest.mark.parametrize("client_fixture", ["other_client", "manager_client", "admin_client"])
def test_toggle_by_non_owner_is_404_and_unchanged(request, recruit, client_fixture):
    (item,) = _add_items(recruit, False)
    client = request.getfixturevalue(client_fixture)
    assert client.post(_toggle_url(item), data=DONE).status_code == 404
    assert _state(item) == (False, None)


def test_toggle_missing_item_is_404(recruit_client):
    assert recruit_client.post("/checklist/items/9999/toggle", data=DONE).status_code == 404


def test_toggle_get_is_405(recruit_client, recruit):
    (item,) = _add_items(recruit, False)
    assert recruit_client.get(_toggle_url(item), query_string=DONE).status_code == 405
    assert _state(item) == (False, None)


def test_toggle_requires_login(client, recruit):
    (item,) = _add_items(recruit, False)
    resp = client.post(_toggle_url(item), data=DONE)
    assert resp.status_code == 302
    assert resp.headers["Location"].startswith("/auth/login?next=")
    assert _state(item) == (False, None)


def test_toggle_requires_csrf_token(csrf_client):
    # make_user/recruit live in the `app` fixture's DB, so create the user in csrf_app's DB.
    user = User(name="CSRF Recruit", email="csrf@example.com", role=ROLE_RECRUIT)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    (item,) = _add_items(user, False)
    client = login(csrf_client, user)
    page = client.get("/checklist/")  # establish a CSRF session so the failure is the token

    assert client.post(_toggle_url(item), data=DONE).status_code == 400
    assert _state(item) == (False, None)

    resp = client.post(_toggle_url(item), data={**DONE, "csrf_token": csrf_token_from(page)})
    assert resp.status_code == 302
    assert _state(item)[0] is True


# --- other callers of on_user_registered -------------------------------------------------


def test_seed_demo_seeds_checklists_for_recruits_only(app):
    assert app.test_cli_runner().invoke(args=["seed-demo"]).exit_code == 0
    for user in User.query.all():
        expected = len(DEFAULT_CHECKLIST) if user.role == ROLE_RECRUIT else 0
        assert len(_items_of(user)) == expected, user.email
