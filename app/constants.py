"""Shared constants. Import from here; never redefine these lists elsewhere."""

ROLE_RECRUIT = "recruit"
ROLE_MANAGER = "manager"
ROLE_ADMIN = "admin"
ROLES = (ROLE_RECRUIT, ROLE_MANAGER, ROLE_ADMIN)

# Manually self-selected mood for a diary entry (not NLP-derived). (value, label) pairs,
# usable directly as WTForms SelectField choices.
MOOD_CHOICES = [
    ("great", "Great"),
    ("good", "Good"),
    ("okay", "Okay"),
    ("stressed", "Stressed"),
    ("struggling", "Struggling"),
]
MOOD_VALUES = tuple(value for value, _ in MOOD_CHOICES)

PER_PAGE = 10
