from app.constants import MOOD_CHOICES, MOOD_VALUES, ROLES


def test_mood_choices_are_unique_value_label_pairs():
    assert MOOD_CHOICES
    assert all(isinstance(v, str) and isinstance(label, str) for v, label in MOOD_CHOICES)
    assert len(set(MOOD_VALUES)) == len(MOOD_CHOICES)


def test_roles():
    assert ROLES == ("recruit", "manager", "admin")
