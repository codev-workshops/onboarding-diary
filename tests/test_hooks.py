from app import hooks


def test_on_user_registered_seeds_only_recruits(monkeypatch, make_user):
    seeded = []
    monkeypatch.setattr(hooks, "seed_default_checklist", seeded.append)
    recruit = make_user("recruit")
    hooks.on_user_registered(recruit)
    hooks.on_user_registered(make_user("manager"))
    hooks.on_user_registered(make_user("admin"))
    assert seeded == [recruit]
