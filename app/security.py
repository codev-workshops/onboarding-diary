"""Access-control helpers shared by all blueprints.

- Ownership: non-owners get 404, whatever their role (admins included).
- Role gating: wrong role gets 403. This is the only 403 case.
"""

from functools import wraps

from flask import abort
from flask_login import current_user, login_required

from app.extensions import db


def role_required(*roles):
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles:
                abort(403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def get_owned_or_404(model, object_id):
    """Fetch ``model`` row ``object_id`` owned by ``current_user`` (via ``user_id``) or 404."""
    obj = db.session.get(model, object_id)
    if obj is None or obj.user_id != current_user.id:
        abort(404)
    return obj
