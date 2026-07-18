import logging
import re
import sqlite3
import threading
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

import psycopg
from psycopg.rows import dict_row

from .security import hash_password
from .settings import DataStoreSettings


LOGGER = logging.getLogger("uvicorn.error.onboarding_diary.database")


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

CREATE TABLE manager_assignments (
    recruit_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    CHECK (recruit_id != manager_id)
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN ('Training', 'Setup', 'Meeting', 'Project', 'Other')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('Not Started', 'In Progress', 'Completed', 'Blocked')
    ),
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    created_at TEXT NOT NULL
);

CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (
        severity IN ('Low', 'Medium', 'High', 'Critical')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('Open', 'In Progress', 'Resolved', 'Closed')
    ),
    resolution_notes TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN ('Positive', 'Suggestion', 'Concern')
    ),
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Recruit', 'Manager', 'Admin')),
    department TEXT NOT NULL,
    start_date TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS manager_assignments (
    recruit_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    manager_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    CHECK (recruit_id != manager_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN ('Training', 'Setup', 'Meeting', 'Project', 'Other')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('Not Started', 'In Progress', 'Completed', 'Blocked')
    ),
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (
        severity IN ('Low', 'Medium', 'High', 'Critical')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('Open', 'In Progress', 'Resolved', 'Closed')
    ),
    resolution_notes TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN ('Positive', 'Suggestion', 'Concern')
    ),
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class Database:
    store_name = "sqlite-memory"

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

    @contextmanager
    def atomic(self) -> Iterator[None]:
        with self.lock:
            yield

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

    def fetchall(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> list[sqlite3.Row]:
        with self.lock:
            return self.connection.execute(query, tuple(parameters)).fetchall()

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


def convert_placeholders(query: str) -> str:
    """Convert sqlite-style ? placeholders to %s, skipping quoted literals."""
    converted: list[str] = []
    in_quote: str | None = None
    for character in query:
        if in_quote:
            converted.append(character)
            if character == in_quote:
                in_quote = None
        elif character in {"'", '"'}:
            converted.append(character)
            in_quote = character
        elif character == "?":
            converted.append("%s")
        else:
            converted.append(character)
    return "".join(converted)


class InsertResult:
    def __init__(self, lastrowid: int | None) -> None:
        self.lastrowid = lastrowid


_INSERT_TABLE_PATTERN = re.compile(r"^\s*INSERT\s+INTO\s+(\w+)", re.IGNORECASE)
_AUTO_ID_TABLES = {"users", "tasks", "issues", "feedback", "notes"}


class PostgresDatabase:
    store_name = "postgres"

    def __init__(self, database_url: str) -> None:
        self.connection = psycopg.connect(
            database_url,
            autocommit=True,
            row_factory=dict_row,
            connect_timeout=5,
        )
        try:
            self.connection.execute(POSTGRES_SCHEMA)
        except Exception:
            self.connection.close()
            raise
        self.lock = threading.RLock()

    def close(self) -> None:
        with self.lock:
            self.connection.close()

    @contextmanager
    def atomic(self) -> Iterator[None]:
        with self.lock:
            yield

    def execute(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> InsertResult:
        converted = convert_placeholders(query)
        match = _INSERT_TABLE_PATTERN.match(query)
        returns_id = (
            match is not None
            and match.group(1).lower() in _AUTO_ID_TABLES
            and "returning" not in query.lower()
        )
        with self.lock:
            try:
                if returns_id:
                    row = self.connection.execute(
                        f"{converted} RETURNING id",
                        tuple(parameters),
                    ).fetchone()
                    return InsertResult(row["id"] if row else None)
                self.connection.execute(converted, tuple(parameters))
                return InsertResult(None)
            except psycopg.IntegrityError as exc:
                raise sqlite3.IntegrityError(str(exc)) from exc

    def fetchone(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> dict[str, object] | None:
        with self.lock:
            return self.connection.execute(
                convert_placeholders(query),
                tuple(parameters),
            ).fetchone()

    def fetchall(
        self,
        query: str,
        parameters: Iterable[object] = (),
    ) -> list[dict[str, object]]:
        with self.lock:
            return self.connection.execute(
                convert_placeholders(query),
                tuple(parameters),
            ).fetchall()

    def bootstrap_admin(self, email: str, password: str) -> None:
        now = datetime.now(UTC)
        self.execute(
            """
            INSERT INTO users (
                email, name, role, department, start_date, password_hash, created_at
            ) VALUES (?, ?, 'Admin', ?, ?, ?, ?)
            ON CONFLICT (email) DO NOTHING
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


def create_database() -> "Database | PostgresDatabase":
    settings = DataStoreSettings.from_environment()
    if settings.persistent_store_enabled:
        if not settings.database_url:
            LOGGER.warning(
                "PERSISTENT_STORE is enabled but DATABASE_URL is not set; "
                "falling back to the in-memory SQLite store"
            )
        else:
            try:
                database = PostgresDatabase(settings.database_url)
            except psycopg.Error:
                LOGGER.warning(
                    "Unable to connect to the Postgres persistent store; "
                    "falling back to the in-memory SQLite store",
                    exc_info=True,
                )
            else:
                LOGGER.info("Using the Postgres persistent store")
                return database
    return Database()
