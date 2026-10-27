"""T5: manager dashboard (aggregate only). Endpoints: manager.dashboard.

Managers see only their own assigned recruits, with name, email, start date, diary entry
COUNT and checklist %. Entry rows (titles, bodies, moods, tags, dates) are never loaded.
"""

from flask import render_template, request
from flask_login import current_user
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.checklist.services import checklist_progress
from app.constants import PER_PAGE, ROLE_MANAGER, ROLE_RECRUIT
from app.extensions import db
from app.manager import bp
from app.models import DiaryEntry, User
from app.security import role_required


def _entry_counts(user_ids):
    """Map user id -> diary entry count, via one aggregate GROUP BY query."""
    if not user_ids:
        return {}
    rows = db.session.execute(
        select(DiaryEntry.user_id, func.count(DiaryEntry.id))
        .where(DiaryEntry.user_id.in_(user_ids))
        .group_by(DiaryEntry.user_id)
    )
    return dict(rows.all())


@bp.get("/")
@role_required(ROLE_MANAGER)
def dashboard():
    page = request.args.get("page", 1, type=int)
    recruits = db.paginate(
        select(User)
        .where(User.manager_id == current_user.id, User.role == ROLE_RECRUIT)
        .options(selectinload(User.checklist_items))
        .order_by(User.name, User.id),
        page=page,
        per_page=PER_PAGE,
    )
    counts = _entry_counts([r.id for r in recruits.items])
    rows = [
        {
            "name": r.name,
            "email": r.email,
            "start_date": r.start_date,
            "entry_count": counts.get(r.id, 0),
            "checklist_percent": checklist_progress(r),
        }
        for r in recruits.items
    ]
    return render_template("manager/dashboard.html", rows=rows, pagination=recruits)
