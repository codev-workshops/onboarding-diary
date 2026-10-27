import re

import pytest
from sqlalchemy import event

from app.checklist.services import seed_default_checklist
from app.constants import MOOD_CHOICES, PER_PAGE, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.models import ChecklistItem, DiaryEntry, Tag
from tests.conftest import login

URL = "/manager/"


def _add_entries(user, n, **fields):
    for i in range(n):
        db.session.add(
            DiaryEntry(
                user=user,
                title=fields.get("title", f"title {i}"),
                body=fields.get("body", f"body {i}"),
                mood=fields.get("mood"),
            )
        )
    db.session.commit()


def _add_items(user, total, completed):
    for i in range(total):
        db.session.add(ChecklistItem(user=user, title=f"item {i}", completed=i < completed))
    db.session.commit()


def _rows(response):
    """Table body rows as lists of cell texts (tags stripped)."""
    html = response.get_data(as_text=True)
    tbody = re.search(r"<tbody>(.*?)</tbody>", html, re.S)
    if not tbody:
        return []
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", tbody.group(1), re.S):
        cells = re.findall(r"<td>(.*?)</td>", tr, re.S)
        rows.append([re.sub(r"<[^>]+>.*?</[^>]+>|<[^>]+>", "", c).strip() for c in cells])
    return rows


# --- routes and role gating ---------------------------------------------------------------


def test_manager_blueprint_has_only_the_dashboard_get_route(app):
    routes = {
        (method, rule.rule)
        for rule in app.url_map.iter_rules()
        if rule.endpoint.startswith("manager.")
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }
    assert routes == {("GET", URL)}


def test_anonymous_is_redirected_to_login(client):
    resp = client.get(URL)
    assert resp.status_code == 302
    assert "/auth/login" in resp.headers["Location"]


@pytest.mark.parametrize("client_fixture", ["recruit_client", "admin_client"])
def test_recruit_and_admin_get_403(request, client_fixture):
    assert request.getfixturevalue(client_fixture).get(URL).status_code == 403


def test_post_is_not_allowed(manager_client):
    assert manager_client.post(URL).status_code == 405


def test_nav_shows_team_link_for_manager_only(manager_client, recruit_client):
    assert 'href="/manager/"' in manager_client.get("/").get_data(as_text=True)
    assert 'href="/manager/"' not in recruit_client.get("/").get_data(as_text=True)


# --- content ------------------------------------------------------------------------------


def test_empty_state_when_no_assignees(manager_client):
    resp = manager_client.get(URL)
    assert resp.status_code == 200
    assert "No recruits are assigned to you yet." in resp.get_data(as_text=True)
    assert _rows(resp) == []


def test_manager_sees_own_assignees_with_counts_and_progress(app, make_user, manager):
    zed = make_user(ROLE_RECRUIT, name="Zed Recruit", email="zed@example.com", manager=manager)
    amy = make_user(ROLE_RECRUIT, name="Amy Recruit", email="amy@example.com", manager=manager)
    bob = make_user(ROLE_RECRUIT, name="Bob Recruit", email="bob@example.com", manager=manager)
    _add_entries(zed, 3)
    _add_items(zed, 3, 2)  # 67%
    _add_entries(amy, 1)
    seed_default_checklist(amy)
    db.session.commit()
    amy.checklist_items[0].completed = True  # 1/8 -> 13% (rounded half up)
    db.session.commit()
    # bob: 0 entries and 0 checklist items -> 0%

    resp = login(app.test_client(), manager).get(URL)
    assert resp.status_code == 200
    assert _rows(resp) == [
        ["Amy Recruit", "amy@example.com", "2026-01-05", "1", "13%"],
        ["Bob Recruit", "bob@example.com", "2026-01-05", "0", "0%"],
        ["Zed Recruit", "zed@example.com", "2026-01-05", "3", "67%"],
    ]
    assert bob.checklist_items == []


def test_missing_start_date_shows_dash(app, make_user, manager):
    recruit = make_user(ROLE_RECRUIT, manager=manager)
    recruit.start_date = None
    db.session.commit()
    rows = _rows(login(app.test_client(), manager).get(URL))
    assert rows[0][2] == "—"


def test_other_managers_assignees_and_unassigned_recruits_are_hidden(
    app, make_user, manager, recruit, other_recruit
):
    other_manager = make_user(ROLE_MANAGER, name="Other Manager")
    theirs = make_user(
        ROLE_RECRUIT, name="Their Recruit", email="theirs@example.com", manager=other_manager
    )
    # A non-recruit pointing at this manager must not be listed either.
    make_user(ROLE_MANAGER, name="Sub Manager", email="sub@example.com", manager=manager)
    _add_entries(theirs, 2)

    html = login(app.test_client(), manager).get(URL).get_data(as_text=True)
    assert recruit.email in html
    for hidden in (theirs, other_recruit):
        assert hidden.email not in html
        assert hidden.name not in html
    assert "sub@example.com" not in html

    other_html = login(app.test_client(), other_manager).get(URL).get_data(as_text=True)
    assert theirs.email in other_html
    assert recruit.email not in other_html


def test_no_entry_content_mood_tag_or_links_are_exposed(app, manager, recruit):
    tag = Tag(user=recruit, name="zz-secret-tag-label")
    db.session.add(tag)
    for mood, _label in MOOD_CHOICES:
        entry = DiaryEntry(
            user=recruit,
            title=f"zz-secret-title-{mood}",
            body=f"zz-secret-body-{mood}",
            mood=mood,
        )
        entry.tags.append(tag)
        db.session.add(entry)
    db.session.commit()

    resp = login(app.test_client(), manager).get(URL)
    html = resp.get_data(as_text=True)
    assert _rows(resp)[0][3] == str(len(MOOD_CHOICES))
    assert "zz-secret" not in html
    # The nav legitimately links to the manager's own diary; check the dashboard body only.
    main = re.search(r"<main>(.*)</main>", html, re.S).group(1)
    assert "/entries/" not in main
    assert "<a " not in main.split("<tbody>")[1].split("</tbody>")[0]
    lowered = main.lower()
    for value, label in MOOD_CHOICES:
        assert value not in lowered
        assert label.lower() not in lowered
    assert "mood" not in lowered
    assert "tag" not in re.sub(r"<[^>]+>", "", lowered)


def test_entry_rows_are_never_loaded(app, manager, recruit):
    _add_entries(recruit, 2, title="zz-title", body="zz-body", mood="great")
    client = login(app.test_client(), manager)
    statements = []

    def capture(_conn, _cursor, statement, *_args):
        statements.append(statement)

    engine = db.engine
    event.listen(engine, "before_cursor_execute", capture)
    try:
        assert client.get(URL).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", capture)

    entry_queries = [s for s in statements if "diary_entries" in s]
    assert len(entry_queries) == 1
    assert "count(" in entry_queries[0].lower()
    for column in ("title", "body", "mood", "created_at", "updated_at"):
        assert f"diary_entries.{column}" not in entry_queries[0]


def test_dashboard_is_paginated(app, make_user, manager):
    for i in range(PER_PAGE + 2):
        make_user(ROLE_RECRUIT, name=f"Recruit {i:02d}", manager=manager)
    client = login(app.test_client(), manager)

    first = client.get(URL)
    assert len(_rows(first)) == PER_PAGE
    assert "Page 1 of 2" in first.get_data(as_text=True)
    assert f'href="{URL}?page=2"' in first.get_data(as_text=True)

    second = client.get(f"{URL}?page=2")
    assert [row[0] for row in _rows(second)] == ["Recruit 10", "Recruit 11"]
