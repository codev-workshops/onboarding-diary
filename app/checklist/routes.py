"""T3: onboarding checklist. Endpoints: checklist.index, checklist.toggle_item (POST)."""

from flask import flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.checklist import bp
from app.checklist.services import checklist_progress, is_overdue
from app.constants import PER_PAGE
from app.extensions import db
from app.models import ChecklistItem, utcnow
from app.security import get_owned_or_404


def _page_arg(source):
    page = source.get("page", type=int)
    return page if page and page > 1 else None


@bp.get("/")
@login_required
def index():
    query = (
        db.select(ChecklistItem)
        .filter_by(user_id=current_user.id)
        .order_by(ChecklistItem.due_date.is_(None), ChecklistItem.due_date, ChecklistItem.id)
    )
    pagination = db.paginate(query, per_page=PER_PAGE, error_out=False)
    return render_template(
        "checklist/index.html",
        pagination=pagination,
        progress=checklist_progress(current_user),
        completed_count=sum(1 for item in current_user.checklist_items if item.completed),
        total_count=len(current_user.checklist_items),
        is_overdue=is_overdue,
    )


@bp.post("/items/<int:item_id>/toggle")
@login_required
def toggle_item(item_id):
    item = get_owned_or_404(ChecklistItem, item_id)
    item.completed = not item.completed
    item.completed_at = utcnow() if item.completed else None
    db.session.commit()
    state = "completed" if item.completed else "marked as not done"
    flash(f"“{item.title}” {state}.", "success")
    return redirect(url_for("checklist.index", page=_page_arg(request.args)))
