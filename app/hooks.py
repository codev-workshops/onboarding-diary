from app.checklist.services import seed_default_checklist
from app.constants import ROLE_RECRUIT


def on_user_registered(user):
    """Call after a new user is added to the session (T1 public signup, T4 provisioning)."""
    if user.role == ROLE_RECRUIT:
        seed_default_checklist(user)
