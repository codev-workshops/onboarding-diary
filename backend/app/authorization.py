import sqlite3
from collections.abc import Callable, Iterable
from typing import Protocol


ErrorFactory = Callable[[int, str, str], Exception]


class DatabaseReader(Protocol):
    def fetchone(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> sqlite3.Row | None: ...


def is_admin(user: sqlite3.Row) -> bool:
    return user["role"] == "Admin"


def ensure_admin(user: sqlite3.Row, error_factory: ErrorFactory) -> None:
    if not is_admin(user):
        raise error_factory(403, "access_denied", "Access denied")


def authorize_recruit_scope(
    database: DatabaseReader,
    actor: sqlite3.Row,
    recruit_id: int,
    error_factory: ErrorFactory,
) -> sqlite3.Row:
    if actor["role"] == "Recruit":
        if actor["id"] != recruit_id:
            raise error_factory(403, "access_denied", "Access denied")
        return actor

    if actor["role"] == "Manager":
        recruit = database.fetchone(
            """
            SELECT users.*
            FROM manager_assignments
            JOIN users ON users.id = manager_assignments.recruit_id
            WHERE manager_assignments.recruit_id = ?
                AND manager_assignments.manager_id = ?
                AND users.role = 'Recruit'
            """,
            (recruit_id, actor["id"]),
        )
        if recruit is None:
            raise error_factory(403, "access_denied", "Access denied")
        return recruit

    if actor["role"] == "Admin":
        recruit = database.fetchone(
            "SELECT * FROM users WHERE id = ? AND role = 'Recruit'",
            (recruit_id,),
        )
        if recruit is None:
            raise error_factory(404, "not_found", "Recruit not found")
        return recruit

    raise error_factory(403, "access_denied", "Access denied")


def authorize_report_scope(
    database: DatabaseReader,
    actor: sqlite3.Row,
    recruit_id: int,
    error_factory: ErrorFactory,
) -> sqlite3.Row:
    return authorize_recruit_scope(database, actor, recruit_id, error_factory)
