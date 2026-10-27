"""T2: diary entry CRUD.

Endpoints: diary.list_entries, diary.new_entry, diary.view_entry, diary.edit_entry,
diary.delete_entry (POST).
"""

from flask import flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.constants import MOOD_CHOICES, PER_PAGE
from app.diary import bp
from app.diary.forms import DeleteEntryForm, EntryForm
from app.extensions import db
from app.models import DiaryEntry, utcnow
from app.security import get_owned_or_404

MOOD_LABELS = dict(MOOD_CHOICES)


def _apply_form(entry, form):
    # Fields are copied explicitly; user_id is never taken from the form.
    entry.title = form.title.data
    entry.body = form.body.data
    entry.mood = form.mood.data or None


@bp.get("/")
@login_required
def list_entries():
    page = request.args.get("page", 1, type=int)
    query = (
        db.select(DiaryEntry)
        .filter_by(user_id=current_user.id)
        .order_by(DiaryEntry.created_at.desc(), DiaryEntry.id.desc())
    )
    pagination = db.paginate(query, page=page, per_page=PER_PAGE, error_out=False)
    last_page = max(pagination.pages, 1)
    if page < 1 or page > last_page:
        return redirect(url_for("diary.list_entries", page=min(max(page, 1), last_page)))
    return render_template("diary/list.html", pagination=pagination, mood_labels=MOOD_LABELS)


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new_entry():
    form = EntryForm()
    if form.validate_on_submit():
        entry = DiaryEntry(user_id=current_user.id)
        _apply_form(entry, form)
        db.session.add(entry)
        db.session.commit()
        flash("Entry created.", "success")
        return redirect(url_for("diary.view_entry", entry_id=entry.id))
    return render_template("diary/form.html", form=form, entry=None)


@bp.get("/<int:entry_id>")
@login_required
def view_entry(entry_id):
    entry = get_owned_or_404(DiaryEntry, entry_id)
    return render_template(
        "diary/view.html", entry=entry, delete_form=DeleteEntryForm(), mood_labels=MOOD_LABELS
    )


@bp.route("/<int:entry_id>/edit", methods=["GET", "POST"])
@login_required
def edit_entry(entry_id):
    entry = get_owned_or_404(DiaryEntry, entry_id)
    form = EntryForm(obj=entry)
    if form.validate_on_submit():
        _apply_form(entry, form)
        entry.updated_at = utcnow()
        db.session.commit()
        flash("Entry updated.", "success")
        return redirect(url_for("diary.view_entry", entry_id=entry.id))
    return render_template("diary/form.html", form=form, entry=entry)


@bp.post("/<int:entry_id>/delete")
@login_required
def delete_entry(entry_id):
    # The CSRF token (from DeleteEntryForm on the view page) is enforced app-wide by CSRFProtect.
    entry = get_owned_or_404(DiaryEntry, entry_id)
    db.session.delete(entry)
    db.session.commit()
    flash("Entry deleted.", "success")
    return redirect(url_for("diary.list_entries"))
