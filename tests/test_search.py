import re
from datetime import datetime

import pytest

from app.constants import PER_PAGE, ROLE_RECRUIT
from app.extensions import db
from app.models import DiaryEntry, Tag, User, entry_tags
from app.search.routes import escape_like
from tests.conftest import DEFAULT_PASSWORD, csrf_token_from, login


def _entry(user, title="Entry", body="Body text", created_at=None, tags=()):
    entry = DiaryEntry(user_id=user.id, title=title, body=body)
    if created_at is not None:
        entry.created_at = created_at
        entry.updated_at = created_at
    entry.tags.extend(tags)
    db.session.add(entry)
    db.session.commit()
    return entry


def _tag(user, name="work"):
    tag = Tag(user_id=user.id, name=name)
    db.session.add(tag)
    db.session.commit()
    return tag


def _titles(resp):
    assert resp.status_code == 200
    return re.findall(rb'<a href="/entries/\d+">([^<]*)</a>', resp.data)


def _tag_ids(entry_id):
    db.session.expire_all()
    return set(
        db.session.scalars(
            db.select(entry_tags.c.tag_id).where(entry_tags.c.entry_id == entry_id)
        ).all()
    )


def _tag_names(user):
    db.session.expire_all()
    return sorted(db.session.scalars(db.select(Tag.name).filter_by(user_id=user.id)).all())


# --- auth & methods -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "method,path",
    [("get", "/search/"), ("get", "/search/tags"), ("post", "/search/tags"),
     ("get", "/search/tags/1/edit"), ("post", "/search/tags/1/edit"),
     ("post", "/search/tags/1/delete"), ("post", "/search/entries/1/tags"),
     ("post", "/search/entries/1/tags/1/remove")],
)  # fmt: skip
def test_routes_require_login(client, method, path):
    resp = getattr(client, method)(path)
    assert resp.status_code == 302
    assert "/auth/login" in resp.headers["Location"]


@pytest.mark.parametrize(
    "path",
    ["/search/tags/1/delete", "/search/entries/1/tags", "/search/entries/1/tags/1/remove"],
)
def test_mutations_reject_get(recruit_client, recruit, path):
    tag = _tag(recruit)
    entry = _entry(recruit, tags=[tag])
    assert recruit_client.get(path).status_code == 405
    assert _tag_ids(entry.id) == {tag.id}


def test_nav_shows_search_link(recruit_client):
    assert b'href="/search/"' in recruit_client.get("/entries/").data


# --- keyword ------------------------------------------------------------------------------


def test_escape_like():
    assert escape_like("50%_a\\b") == "50\\%\\_a\\\\b"


def test_keyword_matches_title_and_body_case_insensitively(recruit_client, recruit):
    _entry(recruit, title="Laptop setup", body="nothing")
    _entry(recruit, title="Day two", body="Installed the LAPTOP drivers")
    _entry(recruit, title="Lunch", body="Met the team")

    assert sorted(_titles(recruit_client.get("/search/?q=laptop"))) == [b"Day two", b"Laptop setup"]
    assert sorted(_titles(recruit_client.get("/search/?q=LaPtOp"))) == [b"Day two", b"Laptop setup"]
    assert _titles(recruit_client.get("/search/?q=team")) == [b"Lunch"]
    assert _titles(recruit_client.get("/search/?q=absent")) == []


def test_keyword_escapes_like_wildcards(recruit_client, recruit):
    _entry(recruit, title="Done 100%", body="x")
    _entry(recruit, title="Done 1000", body="x")
    _entry(recruit, title="snake_case", body="x")
    _entry(recruit, title="snakeXcase", body="x")
    _entry(recruit, title="back\\slash", body="x")

    assert _titles(recruit_client.get("/search/?q=100%25")) == [b"Done 100%"]
    assert _titles(recruit_client.get("/search/?q=%25")) == [b"Done 100%"]
    assert _titles(recruit_client.get("/search/?q=e_c")) == [b"snake_case"]
    assert _titles(recruit_client.get("/search/?q=_")) == [b"snake_case"]
    assert _titles(recruit_client.get("/search/?q=k%5Cs")) == [b"back\\slash"]


def test_no_filters_lists_own_entries_newest_first(recruit_client, recruit):
    _entry(recruit, title="Old", created_at=datetime(2026, 1, 1, 9))
    _entry(recruit, title="New", created_at=datetime(2026, 1, 3, 9))
    assert _titles(recruit_client.get("/search/")) == [b"New", b"Old"]


# --- tag filter ---------------------------------------------------------------------------


def test_tag_filter(recruit_client, recruit):
    work, fun = _tag(recruit, "work"), _tag(recruit, "fun")
    _entry(recruit, title="Both", tags=[work, fun])
    _entry(recruit, title="Work only", tags=[work])
    _entry(recruit, title="Untagged")

    assert sorted(_titles(recruit_client.get(f"/search/?tag={work.id}"))) == [
        b"Both",
        b"Work only",
    ]
    assert _titles(recruit_client.get(f"/search/?tag={fun.id}")) == [b"Both"]


def test_foreign_or_unknown_tag_filter_leaks_nothing(recruit_client, recruit, other_recruit):
    theirs = _tag(other_recruit, "secret")
    _entry(other_recruit, title="Their entry", tags=[theirs])
    _entry(recruit, title="Mine")

    assert recruit_client.get(f"/search/?tag={theirs.id}").status_code == 404
    assert recruit_client.get("/search/?tag=9999").status_code == 404
    resp = recruit_client.get("/search/?tag=abc")
    assert resp.status_code == 200
    assert b"Unknown tag." in resp.data
    assert _titles(resp) == []
    assert b"secret" not in resp.data


# --- date range ---------------------------------------------------------------------------


def test_date_range_is_inclusive_on_both_ends(recruit_client, recruit):
    _entry(recruit, title="Before", created_at=datetime(2026, 3, 9, 23, 59, 59))
    _entry(recruit, title="Start", created_at=datetime(2026, 3, 10, 0, 0, 0))
    _entry(recruit, title="Middle", created_at=datetime(2026, 3, 11, 12, 0))
    _entry(recruit, title="End", created_at=datetime(2026, 3, 12, 23, 59, 59, 999999))
    _entry(recruit, title="After", created_at=datetime(2026, 3, 13, 0, 0, 0))

    resp = recruit_client.get("/search/?from=2026-03-10&to=2026-03-12")
    assert _titles(resp) == [b"End", b"Middle", b"Start"]
    assert _titles(recruit_client.get("/search/?from=2026-03-12")) == [b"After", b"End"]
    assert _titles(recruit_client.get("/search/?to=2026-03-10")) == [b"Start", b"Before"]
    assert _titles(recruit_client.get("/search/?from=2026-03-11&to=2026-03-11")) == [b"Middle"]


@pytest.mark.parametrize(
    "query,message",
    [("from=2026-13-01", b"From date must be a valid date"),
     ("to=yesterday", b"To date must be a valid date"),
     ("from=2026-03-12&to=2026-03-10", b"on or before the To date")],
)  # fmt: skip
def test_invalid_dates_show_validation_message(recruit_client, recruit, query, message):
    _entry(recruit, title="Mine")
    resp = recruit_client.get(f"/search/?{query}")
    assert resp.status_code == 200
    assert message in resp.data
    assert _titles(resp) == []


# --- combined filters & pagination --------------------------------------------------------


def test_filters_combine_with_and(recruit_client, recruit):
    work = _tag(recruit, "work")
    _entry(recruit, title="Match", body="standup", created_at=datetime(2026, 4, 2), tags=[work])
    _entry(recruit, title="Wrong tag", body="standup", created_at=datetime(2026, 4, 2))
    _entry(
        recruit, title="Wrong date", body="standup", created_at=datetime(2026, 5, 2), tags=[work]
    )
    _entry(recruit, title="Wrong word", body="lunch", created_at=datetime(2026, 4, 2), tags=[work])

    resp = recruit_client.get(f"/search/?q=standup&tag={work.id}&from=2026-04-01&to=2026-04-30")
    assert _titles(resp) == [b"Match"]


def test_pagination_keeps_filters(recruit_client, recruit):
    work = _tag(recruit, "work")
    for i in range(25):
        _entry(recruit, title=f"Match {i:02d}", created_at=datetime(2026, 6, 1, 0, i), tags=[work])
    _entry(recruit, title="Other", created_at=datetime(2026, 6, 1, 1, 0))

    base = f"q=match&tag={work.id}&from=2026-06-01&to=2026-06-01"
    pages = [_titles(recruit_client.get(f"/search/?{base}&page={n}")) for n in (1, 2, 3)]
    assert [len(p) for p in pages] == [PER_PAGE, PER_PAGE, 5]
    assert pages[0][0] == b"Match 24" and pages[2][-1] == b"Match 00"
    assert len({t for p in pages for t in p}) == 25

    page2 = recruit_client.get(f"/search/?{base}&page=2").data.decode()
    links = re.findall(r'<nav class="pagination".*?</nav>', page2, re.S)[0]
    hrefs = [h.replace("&amp;", "&") for h in re.findall(r'href="([^"]+)"', links)]
    assert len(hrefs) == 2
    for href in hrefs:
        for part in ("q=match", f"tag={work.id}", "from=2026-06-01", "to=2026-06-01"):
            assert part in href
    assert any("page=1" in h for h in hrefs) and any("page=3" in h for h in hrefs)


def test_out_of_range_page_redirects_keeping_filters(recruit_client, recruit):
    _entry(recruit, title="Only")
    resp = recruit_client.get("/search/?q=only&page=9")
    assert resp.status_code == 302
    assert "page=1" in resp.headers["Location"] and "q=only" in resp.headers["Location"]


# --- scoping ------------------------------------------------------------------------------


def test_other_users_entries_and_tags_never_appear(recruit_client, recruit, other_recruit):
    _tag(other_recruit, "their-tag")
    _entry(other_recruit, title="Their laptop")
    _entry(recruit, title="My laptop")

    resp = recruit_client.get("/search/?q=laptop")
    assert _titles(resp) == [b"My laptop"]
    assert b"their-tag" not in resp.data
    assert b"their-tag" not in recruit_client.get("/search/tags").data


@pytest.mark.parametrize("client_fixture", ["manager_client", "admin_client"])
def test_managers_and_admins_only_see_their_own(request, recruit, client_fixture):
    client = request.getfixturevalue(client_fixture)
    _entry(recruit, title="Recruit laptop")
    _tag(recruit, "recruit-tag")
    resp = client.get("/search/?q=laptop")
    assert _titles(resp) == []
    assert b"recruit-tag" not in resp.data


# --- tag CRUD -----------------------------------------------------------------------------


def test_create_tag_strips_name(recruit_client, recruit):
    resp = recruit_client.post("/search/tags", data={"name": "  onboarding  "})
    assert resp.status_code == 302
    assert _tag_names(recruit) == ["onboarding"]
    assert b"onboarding" in recruit_client.get("/search/tags").data


@pytest.mark.parametrize(
    "name,message",
    [("WORK", b"already have a tag"), (" work ", b"already have a tag"),
     ("   ", b"This field is required"), ("x" * 51, b"longer than 50")],
)  # fmt: skip
def test_create_tag_rejects_duplicates_blank_and_too_long(recruit_client, recruit, name, message):
    _tag(recruit, "work")
    resp = recruit_client.post("/search/tags", data={"name": name})
    assert resp.status_code == 200
    assert message in resp.data
    assert _tag_names(recruit) == ["work"]


def test_same_tag_name_allowed_for_different_users(recruit_client, recruit, other_recruit):
    _tag(other_recruit, "work")
    assert recruit_client.post("/search/tags", data={"name": "Work"}).status_code == 302
    assert _tag_names(recruit) == ["Work"]


def test_rename_tag(recruit_client, recruit):
    tag = _tag(recruit, "wrok")
    assert recruit_client.get(f"/search/tags/{tag.id}/edit").status_code == 200
    resp = recruit_client.post(f"/search/tags/{tag.id}/edit", data={"name": " work "})
    assert resp.status_code == 302
    assert _tag_names(recruit) == ["work"]
    # Changing only the case of its own name is not a duplicate.
    assert (
        recruit_client.post(f"/search/tags/{tag.id}/edit", data={"name": "Work"}).status_code == 302
    )
    assert _tag_names(recruit) == ["Work"]


def test_rename_tag_to_existing_name_is_rejected(recruit_client, recruit):
    _tag(recruit, "work")
    fun = _tag(recruit, "fun")
    resp = recruit_client.post(f"/search/tags/{fun.id}/edit", data={"name": "WORK"})
    assert resp.status_code == 200
    assert b"already have a tag" in resp.data
    assert _tag_names(recruit) == ["fun", "work"]


def test_foreign_tag_edit_and_delete_404(recruit_client, other_recruit):
    theirs = _tag(other_recruit, "theirs")
    assert recruit_client.get(f"/search/tags/{theirs.id}/edit").status_code == 404
    assert (
        recruit_client.post(f"/search/tags/{theirs.id}/edit", data={"name": "x"}).status_code == 404
    )
    assert recruit_client.post(f"/search/tags/{theirs.id}/delete").status_code == 404
    assert recruit_client.post("/search/tags/9999/delete").status_code == 404
    assert _tag_names(other_recruit) == ["theirs"]


def test_delete_tag_removes_association_but_keeps_entry(recruit_client, recruit):
    work, fun = _tag(recruit, "work"), _tag(recruit, "fun")
    entry = _entry(recruit, title="Kept", tags=[work, fun])

    assert recruit_client.post(f"/search/tags/{work.id}/delete").status_code == 302
    assert _tag_names(recruit) == ["fun"]
    assert _tag_ids(entry.id) == {fun.id}
    assert db.session.get(DiaryEntry, entry.id).title == "Kept"


def test_tags_list_is_paginated(recruit_client, recruit):
    for i in range(PER_PAGE + 2):
        _tag(recruit, f"tag{i:02d}")
    page1 = recruit_client.get("/search/tags").data
    page2 = recruit_client.get("/search/tags?page=2").data
    assert b"tag00" in page1 and b"tag11" not in page1
    assert b"tag11" in page2 and b"tag00" not in page2


# --- tag / untag entries ------------------------------------------------------------------


def test_tag_and_untag_entry_persists_and_is_idempotent(recruit_client, recruit):
    tag = _tag(recruit, "work")
    entry = _entry(recruit)

    view = recruit_client.get(f"/entries/{entry.id}")
    assert f'action="/search/entries/{entry.id}/tags"'.encode() in view.data

    for _ in range(2):
        resp = recruit_client.post(f"/search/entries/{entry.id}/tags", data={"tag_id": tag.id})
        assert resp.status_code == 302
        assert resp.headers["Location"] == f"/entries/{entry.id}"
        assert _tag_ids(entry.id) == {tag.id}

    view = recruit_client.get(f"/entries/{entry.id}")
    assert b"#work" in view.data
    assert f"/search/entries/{entry.id}/tags/{tag.id}/remove".encode() in view.data

    for _ in range(2):
        resp = recruit_client.post(f"/search/entries/{entry.id}/tags/{tag.id}/remove")
        assert resp.status_code == 302
        assert _tag_ids(entry.id) == set()


def test_tag_entry_requires_tag_id(recruit_client, recruit):
    entry = _entry(recruit)
    assert recruit_client.post(f"/search/entries/{entry.id}/tags", data={}).status_code == 400
    assert (
        recruit_client.post(f"/search/entries/{entry.id}/tags", data={"tag_id": "abc"}).status_code
        == 400
    )
    assert _tag_ids(entry.id) == set()


def test_tag_entry_with_foreign_tag_or_entry_is_404(recruit_client, recruit, other_recruit):
    mine_tag, mine_entry = _tag(recruit, "mine"), _entry(recruit, title="Mine")
    their_tag, their_entry = _tag(other_recruit, "theirs"), _entry(other_recruit, title="Theirs")

    url = "/search/entries/{}/tags"
    assert (
        recruit_client.post(url.format(mine_entry.id), data={"tag_id": their_tag.id}).status_code
        == 404
    )
    assert (
        recruit_client.post(url.format(their_entry.id), data={"tag_id": mine_tag.id}).status_code
        == 404
    )
    assert (
        recruit_client.post(url.format(their_entry.id), data={"tag_id": their_tag.id}).status_code
        == 404
    )
    assert recruit_client.post(url.format(9999), data={"tag_id": mine_tag.id}).status_code == 404
    assert _tag_ids(mine_entry.id) == set()
    assert _tag_ids(their_entry.id) == set()


def test_untag_with_foreign_tag_or_entry_is_404(recruit_client, recruit, other_recruit):
    their_tag = _tag(other_recruit, "theirs")
    their_entry = _entry(other_recruit, title="Theirs", tags=[their_tag])
    mine_tag = _tag(recruit, "mine")
    mine_entry = _entry(recruit, title="Mine", tags=[mine_tag])

    url = "/search/entries/{}/tags/{}/remove"
    assert recruit_client.post(url.format(their_entry.id, their_tag.id)).status_code == 404
    assert recruit_client.post(url.format(mine_entry.id, their_tag.id)).status_code == 404
    assert recruit_client.post(url.format(their_entry.id, mine_tag.id)).status_code == 404
    assert _tag_ids(their_entry.id) == {their_tag.id}
    assert _tag_ids(mine_entry.id) == {mine_tag.id}


def test_entry_view_only_offers_own_tags(recruit_client, recruit, other_recruit):
    _tag(other_recruit, "their-tag")
    _tag(recruit, "my-tag")
    entry = _entry(recruit)
    view = recruit_client.get(f"/entries/{entry.id}").data
    assert b"my-tag" in view and b"their-tag" not in view


# --- CSRF ---------------------------------------------------------------------------------


def _create_user_in_current_app(email="csrf-tagger@example.com"):
    """``make_user`` is bound to the ``app`` fixture's DB, not ``csrf_app``'s."""
    user = User(name="CSRF Tagger", email=email, role=ROLE_RECRUIT)
    user.set_password(DEFAULT_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


def test_tag_untag_and_tag_crud_require_csrf_token(csrf_client):
    owner = _create_user_in_current_app()
    tagged, untagged = _tag(owner, "tagged"), _tag(owner, "spare")
    entry = _entry(owner, tags=[tagged])
    client = login(csrf_client, owner)

    for data in ({}, {"csrf_token": "not-a-real-token"}):
        assert (
            client.post(
                f"/search/entries/{entry.id}/tags", data={**data, "tag_id": untagged.id}
            ).status_code
            == 400
        )
        assert (
            client.post(
                f"/search/entries/{entry.id}/tags/{tagged.id}/remove", data=data
            ).status_code
            == 400
        )
        assert client.post("/search/tags", data={**data, "name": "new"}).status_code == 400
        assert client.post(f"/search/tags/{untagged.id}/delete", data=data).status_code == 400
        assert _tag_ids(entry.id) == {tagged.id}
        assert _tag_names(owner) == ["spare", "tagged"]

    token = csrf_token_from(client.get(f"/entries/{entry.id}"))
    resp = client.post(
        f"/search/entries/{entry.id}/tags", data={"csrf_token": token, "tag_id": untagged.id}
    )
    assert resp.status_code == 302
    assert _tag_ids(entry.id) == {tagged.id, untagged.id}
    resp = client.post(
        f"/search/entries/{entry.id}/tags/{tagged.id}/remove", data={"csrf_token": token}
    )
    assert resp.status_code == 302
    assert _tag_ids(entry.id) == {untagged.id}


def test_max_to_date_does_not_overflow(recruit_client, recruit):
    _entry(recruit, title="Mine", created_at=datetime(2026, 3, 10))
    assert _titles(recruit_client.get("/search/?from=2026-03-10&to=9999-12-31")) == [b"Mine"]


@pytest.mark.parametrize("value", ["\u00b2", "\u0661", "-1", "1.5"])
def test_non_ascii_or_non_integer_tag_shows_unknown_tag(recruit_client, recruit, value):
    _entry(recruit, title="Mine")
    resp = recruit_client.get("/search/", query_string={"tag": value})
    assert resp.status_code == 200
    assert b"Unknown tag." in resp.data
    assert _titles(resp) == []


def test_duplicate_check_folds_non_ascii_case(recruit_client, recruit):
    _tag(recruit, "École")
    resp = recruit_client.post("/search/tags", data={"name": "école"})
    assert resp.status_code == 200
    assert b"already have a tag" in resp.data
    assert _tag_names(recruit) == ["École"]
