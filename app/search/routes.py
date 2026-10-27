"""T6: search/filter/tags, all scoped to current_user.

Endpoints: search.index (plus tag management routes).

- search.index (GET, read-only): q / tag / from / to filters, AND-combined, paginated.
- search.tags (GET), search.create_tag (POST), search.edit_tag (GET/POST),
  search.delete_tag (POST): the current user's tags.
- search.tag_entry (POST), search.untag_entry (POST): attach/detach the current user's tag
  on the current user's entry. Foreign tag or entry -> 404.
"""

from datetime import date, datetime, time, timedelta

from flask import abort, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app.constants import PER_PAGE
from app.extensions import db
from app.models import DiaryEntry, Tag, entry_tags
from app.search import bp
from app.search.forms import EntryTagForm, PostOnlyForm, TagForm
from app.security import get_owned_or_404

LIKE_ESCAPE = "\\"
FILTER_PARAMS = ("q", "tag", "from", "to")


def escape_like(value):
    """Escape LIKE wildcards so ``%`` and ``_`` match literally."""
    return (
        value.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2)
        .replace("%", LIKE_ESCAPE + "%")
        .replace("_", LIKE_ESCAPE + "_")
    )


def _user_tags_query():
    return db.select(Tag).filter_by(user_id=current_user.id).order_by(db.func.lower(Tag.name))


@bp.app_context_processor
def inject_tag_helpers():
    """Lets the diary templates render tag/untag forms for the current user's own tags."""

    def user_tags():
        if not current_user.is_authenticated:
            return []
        return db.session.scalars(_user_tags_query()).all()

    return {"user_tags": user_tags}


def _parse_date(raw, label, errors):
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        errors.append(f"{label} date must be a valid date (YYYY-MM-DD).")
        return None


def _parse_filters(args, errors):
    filters = {name: args.get(name, "").strip() for name in FILTER_PARAMS}
    tag = None
    if filters["tag"]:
        if not filters["tag"].isdigit():
            errors.append("Unknown tag.")
        else:
            tag = get_owned_or_404(Tag, int(filters["tag"]))
    date_from = _parse_date(filters["from"], "From", errors)
    date_to = _parse_date(filters["to"], "To", errors)
    if date_from and date_to and date_from > date_to:
        errors.append("The From date must be on or before the To date.")
    return filters, tag, date_from, date_to


def _search_query(q, tag, date_from, date_to):
    query = db.select(DiaryEntry).filter_by(user_id=current_user.id)
    if q:
        pattern = f"%{escape_like(q)}%"
        query = query.where(
            db.or_(
                DiaryEntry.title.ilike(pattern, escape=LIKE_ESCAPE),
                DiaryEntry.body.ilike(pattern, escape=LIKE_ESCAPE),
            )
        )
    if tag is not None:
        query = query.where(
            DiaryEntry.id.in_(db.select(entry_tags.c.entry_id).filter_by(tag_id=tag.id))
        )
    if date_from:
        query = query.where(DiaryEntry.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        # Inclusive: everything before the start of the following day.
        next_day = datetime.combine(date_to + timedelta(days=1), time.min)
        query = query.where(DiaryEntry.created_at < next_day)
    return query.order_by(DiaryEntry.created_at.desc(), DiaryEntry.id.desc())


@bp.get("/")
@login_required
def index():
    errors = []
    filters, tag, date_from, date_to = _parse_filters(request.args, errors)
    active_filters = {k: v for k, v in filters.items() if v}
    pagination = None
    if not errors:
        page = request.args.get("page", 1, type=int)
        query = _search_query(filters["q"], tag, date_from, date_to)
        pagination = db.paginate(query, page=page, per_page=PER_PAGE, error_out=False)
        last_page = max(pagination.pages, 1)
        if page < 1 or page > last_page:
            target = min(max(page, 1), last_page)
            return redirect(url_for("search.index", page=target, **active_filters))
    return render_template(
        "search/index.html",
        filters=filters,
        active_filters=active_filters,
        errors=errors,
        pagination=pagination,
        tags=db.session.scalars(_user_tags_query()).all(),
    )


# --- tag CRUD -----------------------------------------------------------------------------


def _name_taken(name, exclude_id=None):
    query = db.select(Tag.id).where(
        Tag.user_id == current_user.id, db.func.lower(Tag.name) == name.lower()
    )
    if exclude_id is not None:
        query = query.where(Tag.id != exclude_id)
    return db.session.scalar(query) is not None


def _save_tag(tag, form):
    """Validate uniqueness and commit; on failure add a form error and return False."""
    if _name_taken(form.name.data, exclude_id=tag.id):
        form.name.errors.append("You already have a tag with that name.")
        return False
    tag.name = form.name.data
    db.session.add(tag)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        form.name.errors.append("You already have a tag with that name.")
        return False
    return True


def _render_tags(form):
    page = request.args.get("page", 1, type=int)
    query = db.select(Tag).filter_by(user_id=current_user.id).order_by(db.func.lower(Tag.name))
    pagination = db.paginate(query, page=page, per_page=PER_PAGE, error_out=False)
    return render_template(
        "search/tags.html", form=form, pagination=pagination, delete_form=PostOnlyForm()
    )


@bp.get("/tags")
@login_required
def tags():
    return _render_tags(TagForm())


@bp.post("/tags")
@login_required
def create_tag():
    form = TagForm()
    if form.validate_on_submit():
        tag = Tag(user_id=current_user.id)
        if _save_tag(tag, form):
            flash(f'Tag "{tag.name}" created.', "success")
            return redirect(url_for("search.tags"))
    return _render_tags(form)


@bp.route("/tags/<int:tag_id>/edit", methods=["GET", "POST"])
@login_required
def edit_tag(tag_id):
    tag = get_owned_or_404(Tag, tag_id)
    form = TagForm(obj=tag)
    if form.validate_on_submit():
        if _save_tag(tag, form):
            flash("Tag renamed.", "success")
            return redirect(url_for("search.tags"))
    return render_template("search/tag_form.html", form=form, tag=tag)


@bp.post("/tags/<int:tag_id>/delete")
@login_required
def delete_tag(tag_id):
    tag = get_owned_or_404(Tag, tag_id)
    db.session.delete(tag)  # entry_tags rows cascade; entries are untouched
    db.session.commit()
    flash("Tag deleted.", "success")
    return redirect(url_for("search.tags"))


# --- tag / untag entries ------------------------------------------------------------------


@bp.post("/entries/<int:entry_id>/tags")
@login_required
def tag_entry(entry_id):
    entry = get_owned_or_404(DiaryEntry, entry_id)
    form = EntryTagForm()
    if not form.validate_on_submit():
        abort(400)
    tag = get_owned_or_404(Tag, form.tag_id.data)
    if tag not in entry.tags:
        entry.tags.append(tag)
        db.session.commit()
    flash(f'Tagged "{tag.name}".', "success")
    return redirect(url_for("diary.view_entry", entry_id=entry.id))


@bp.post("/entries/<int:entry_id>/tags/<int:tag_id>/remove")
@login_required
def untag_entry(entry_id, tag_id):
    entry = get_owned_or_404(DiaryEntry, entry_id)
    tag = get_owned_or_404(Tag, tag_id)
    if tag in entry.tags:
        entry.tags.remove(tag)
        db.session.commit()
    flash(f'Removed tag "{tag.name}".', "success")
    return redirect(url_for("diary.view_entry", entry_id=entry.id))
