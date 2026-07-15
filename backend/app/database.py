import sqlite3
import threading
from collections.abc import Iterable
from datetime import UTC, datetime

from .security import hash_password


SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Recruit', 'Manager', 'Admin')),
    department TEXT NOT NULL,
    start_date TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class Database:
    def __init__(self) -> None:
        self.connection = sqlite3.connect(
            ":memory:",
            check_same_thread=False,
        )
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript(SCHEMA)
        self.lock = threading.RLock()

    def close(self) -> None:
        with self.lock:
            self.connection.close()

    def execute(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> sqlite3.Cursor:
        with self.lock:
            cursor = self.connection.execute(query, tuple(parameters))
            self.connection.commit()
            return cursor

    def fetchone(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> sqlite3.Row | None:
        with self.lock:
            return self.connection.execute(query, tuple(parameters)).fetchone()

    def bootstrap_admin(self, email: str, password: str) -> None:
        now = datetime.now(UTC)
        self.execute(
            """
            INSERT INTO users (
                email, name, role, department, start_date, password_hash, created_at
            ) VALUES (?, ?, 'Admin', ?, ?, ?, ?)
            """,
            (
                email,
                "Bootstrap Admin",
                "Administration",
                now.date().isoformat(),
                hash_password(password),
                now.isoformat(),
            ),
        )
