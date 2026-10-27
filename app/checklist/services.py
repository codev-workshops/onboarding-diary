"""Checklist business logic shared with other blueprints (T5 imports ``checklist_progress``)."""

from datetime import timedelta

from app.extensions import db
from app.models import ChecklistItem, utcnow

# (title, description, days after the recruit's start date)
DEFAULT_CHECKLIST = (
    (
        "Set up your laptop and accounts",
        "Collect your equipment and sign in to email, chat and the code host.",
        0,
    ),
    (
        "Meet your manager",
        "Have a first 1:1 to agree on goals for your first weeks.",
        1,
    ),
    (
        "Complete HR paperwork",
        "Submit tax, bank and emergency-contact details.",
        2,
    ),
    (
        "Read the team handbook",
        "Learn how the team plans, communicates and ships work.",
        3,
    ),
    (
        "Finish security and compliance training",
        "Complete the mandatory online security and data-protection courses.",
        5,
    ),
    (
        "Shadow a teammate",
        "Pair with a teammate for a day to see the day-to-day workflow.",
        7,
    ),
    (
        "Ship your first small change",
        "Pick a starter task, open a pull request and get it merged.",
        14,
    ),
    (
        "30-day check-in",
        "Review your onboarding so far with your manager.",
        30,
    ),
)


def _base_date(user):
    if user.start_date is not None:
        return user.start_date
    if user.created_at is not None:
        return user.created_at.date()
    return utcnow().date()  # pending user: created_at is only set on flush


def seed_default_checklist(user):
    """Add the default onboarding checklist for ``user`` to the session and return the new items.

    Due dates are relative to ``user.start_date`` (or the account creation date if unset).
    Does not commit: the caller commits. Does nothing (returns ``[]``) if the user already has
    checklist items, so calling it twice never duplicates the list.
    """
    if user.checklist_items:
        return []
    base = _base_date(user)
    items = [
        ChecklistItem(title=title, description=description, due_date=base + timedelta(days=days))
        for title, description, days in DEFAULT_CHECKLIST
    ]
    user.checklist_items.extend(items)
    db.session.add_all(items)
    return items


def checklist_progress(user):
    """Return ``user``'s checklist completion as an int percent (0-100).

    ``completed / total * 100`` rounded half up (1/3 -> 33, 2/3 -> 67, 1/8 -> 13); 0 when the
    user has no items. Pure function of ``user.checklist_items``: no writes, no commit.
    """
    items = user.checklist_items
    total = len(items)
    if total == 0:
        return 0
    completed = sum(1 for item in items if item.completed)
    return (completed * 200 + total) // (2 * total)


def is_overdue(item, today=None):
    """True if ``item`` is not completed and its due date is before ``today``."""
    today = today or utcnow().date()
    return not item.completed and item.due_date is not None and item.due_date < today
