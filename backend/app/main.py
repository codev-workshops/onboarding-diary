import os
import secrets
import sqlite3
from collections import deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from threading import Lock
from time import monotonic

from fastapi import Cookie, Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .database import Database
from .schemas import LoginRequest, ProfileResponse, ProfileUpdate, SignupRequest
from .security import hash_password, verify_password


SESSION_COOKIE = "session_id"
SESSION_DURATION = timedelta(hours=8)
GENERIC_LOGIN_ERROR = "Invalid email or password"
LOGIN_FAILURE_LIMIT = 5
LOGIN_FAILURE_WINDOW_SECONDS = 60


class LoginThrottle:
    def __init__(
        self,
        limit: int = LOGIN_FAILURE_LIMIT,
        window_seconds: int = LOGIN_FAILURE_WINDOW_SECONDS,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.failures: dict[str, deque[float]] = {}
        self.lock = Lock()

    def _active_failures(self, client_key: str, now: float) -> deque[float] | None:
        failures = self.failures.get(client_key)
        if failures is None:
            return None
        cutoff = now - self.window_seconds
        while failures and failures[0] <= cutoff:
            failures.popleft()
        if not failures:
            self.failures.pop(client_key, None)
            return None
        return failures

    def is_limited(self, client_key: str) -> bool:
        with self.lock:
            failures = self._active_failures(client_key, monotonic())
            return failures is not None and len(failures) >= self.limit

    def record_failure(self, client_key: str) -> None:
        with self.lock:
            now = monotonic()
            failures = self._active_failures(client_key, now)
            if failures is None:
                failures = deque()
                self.failures[client_key] = failures
            failures.append(now)

    def clear(self, client_key: str) -> None:
        with self.lock:
            self.failures.pop(client_key, None)


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: dict[str, str] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields


def error_content(
    code: str,
    message: str,
    fields: dict[str, str] | None = None,
) -> dict[str, object]:
    error: dict[str, object] = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return {"error": error}


def validation_fields(exc: RequestValidationError) -> dict[str, str]:
    fields: dict[str, str] = {}
    for error in exc.errors():
        location = error["loc"]
        field = str(location[-1]) if location else "request"
        message = str(error["msg"]).removeprefix("Value error, ")
        fields[field] = message
    return fields


def user_response(row: sqlite3.Row) -> ProfileResponse:
    return ProfileResponse(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        department=row["department"],
        start_date=row["start_date"],
    )


def get_database(request: Request) -> Database:
    return request.app.state.database


def require_user(
    database: Database = Depends(get_database),
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> sqlite3.Row:
    if not session_id:
        raise ApiError(401, "authentication_required", "Authentication required")
    now = datetime.now(UTC).isoformat()
    row = database.fetchone(
        """
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
        """,
        (session_id, now),
    )
    if row is None:
        database.execute("DELETE FROM sessions WHERE token = ?", (session_id,))
        raise ApiError(401, "authentication_required", "Authentication required")
    return row


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
        if not email or not password:
            raise RuntimeError(
                "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required"
            )
        try:
            signup = SignupRequest(
                email=email,
                password=password,
                name="Bootstrap Admin",
                department="Administration",
                start_date=datetime.now(UTC).date(),
            )
        except ValueError as exc:
            raise RuntimeError(f"Invalid bootstrap Admin configuration: {exc}") from exc

        database = Database()
        database.bootstrap_admin(signup.email, signup.password)
        app.state.database = database
        app.state.login_throttle = LoginThrottle()
        try:
            yield
        finally:
            database.close()
            app.state.database = None
            app.state.login_throttle = None

    app = FastAPI(title="Onboarding Diary API", lifespan=lifespan)

    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_content(exc.code, exc.message, exc.fields),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_content(
                "validation_error",
                "Request validation failed",
                validation_fields(exc),
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, __: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_content(
                "server_error",
                "An unexpected error occurred; please retry",
            ),
        )

    @app.get("/api/health")
    def health(database: Database = Depends(get_database)) -> dict[str, str]:
        database.fetchone("SELECT 1")
        return {"status": "ok", "database": "sqlite-memory"}

    @app.post("/api/auth/signup", response_model=ProfileResponse, status_code=201)
    def signup(
        payload: SignupRequest,
        database: Database = Depends(get_database),
    ) -> ProfileResponse:
        try:
            cursor = database.execute(
                """
                INSERT INTO users (
                    email, name, role, department, start_date, password_hash, created_at
                ) VALUES (?, ?, 'Recruit', ?, ?, ?, ?)
                """,
                (
                    payload.email,
                    payload.name,
                    payload.department,
                    payload.start_date.isoformat(),
                    hash_password(payload.password),
                    datetime.now(UTC).isoformat(),
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise ApiError(
                409,
                "email_conflict",
                "An account with this email already exists",
                {"email": "Email is already in use"},
            ) from exc
        row = database.fetchone("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,))
        if row is None:
            raise ApiError(500, "server_error", "Unable to create account")
        return user_response(row)

    @app.post("/api/auth/login", response_model=ProfileResponse)
    def login(
        payload: LoginRequest,
        request: Request,
        response: Response,
        database: Database = Depends(get_database),
    ) -> ProfileResponse:
        client_key = request.client.host if request.client else "unknown"
        throttle: LoginThrottle = request.app.state.login_throttle
        if throttle.is_limited(client_key):
            raise ApiError(401, "invalid_credentials", GENERIC_LOGIN_ERROR)

        row = database.fetchone("SELECT * FROM users WHERE email = ?", (payload.email,))
        if row is None or not verify_password(payload.password, row["password_hash"]):
            throttle.record_failure(client_key)
            raise ApiError(401, "invalid_credentials", GENERIC_LOGIN_ERROR)
        throttle.clear(client_key)

        token = secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        database.execute(
            """
            INSERT INTO sessions (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                token,
                row["id"],
                (now + SESSION_DURATION).isoformat(),
                now.isoformat(),
            ),
        )
        response.set_cookie(
            key=SESSION_COOKIE,
            value=token,
            max_age=int(SESSION_DURATION.total_seconds()),
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="lax",
            path="/",
        )
        return user_response(row)

    @app.post("/api/auth/logout", status_code=204)
    def logout(
        request: Request,
        response: Response,
        database: Database = Depends(get_database),
        session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    ) -> None:
        if session_id:
            database.execute("DELETE FROM sessions WHERE token = ?", (session_id,))
        response.delete_cookie(
            key=SESSION_COOKIE,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="lax",
            path="/",
        )

    @app.get("/api/profile", response_model=ProfileResponse)
    def get_profile(user: sqlite3.Row = Depends(require_user)) -> ProfileResponse:
        return user_response(user)

    @app.patch("/api/profile", response_model=ProfileResponse)
    def update_profile(
        payload: ProfileUpdate,
        user: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> ProfileResponse:
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return user_response(user)
        if "start_date" in updates and updates["start_date"] is not None:
            updates["start_date"] = updates["start_date"].isoformat()
        assignments = ", ".join(f"{field} = ?" for field in updates)
        parameters = [*updates.values(), user["id"]]
        try:
            database.execute(
                f"UPDATE users SET {assignments} WHERE id = ?",
                parameters,
            )
        except sqlite3.IntegrityError as exc:
            raise ApiError(
                409,
                "email_conflict",
                "An account with this email already exists",
                {"email": "Email is already in use"},
            ) from exc
        updated = database.fetchone("SELECT * FROM users WHERE id = ?", (user["id"],))
        if updated is None:
            raise ApiError(500, "server_error", "Unable to update profile")
        return user_response(updated)

    return app


app = create_app()
