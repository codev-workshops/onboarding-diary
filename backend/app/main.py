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

from .authorization import ensure_admin
from .database import Database
from .schemas import (
    AdminUserCreate,
    AdminUserPatch,
    AdminUserResponse,
    LoginRequest,
    ManagerAssignmentRequest,
    ProfileResponse,
    ProfileUpdate,
    SignupRequest,
)
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


def admin_user_response(database: Database, row: sqlite3.Row) -> AdminUserResponse:
    assignment = database.fetchone(
        "SELECT manager_id FROM manager_assignments WHERE recruit_id = ?",
        (row["id"],),
    )
    return AdminUserResponse(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        department=row["department"],
        start_date=row["start_date"],
        assigned_manager_id=assignment["manager_id"] if assignment else None,
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


def api_error(status_code: int, code: str, message: str) -> ApiError:
    return ApiError(status_code, code, message)


def require_admin(user: sqlite3.Row = Depends(require_user)) -> sqlite3.Row:
    ensure_admin(user, api_error)
    return user


def get_user_or_404(database: Database, user_id: int) -> sqlite3.Row:
    row = database.fetchone("SELECT * FROM users WHERE id = ?", (user_id,))
    if row is None:
        raise ApiError(404, "not_found", "User not found")
    return row


def admin_count(database: Database) -> int:
    row = database.fetchone("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin'")
    return int(row["count"]) if row else 0


def invalidate_user_sessions(database: Database, user_id: int) -> None:
    database.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))


def remove_invalid_assignments(database: Database, user_id: int, role: str) -> None:
    if role != "Recruit":
        database.execute(
            "DELETE FROM manager_assignments WHERE recruit_id = ?", (user_id,)
        )
    if role != "Manager":
        database.execute(
            "DELETE FROM manager_assignments WHERE manager_id = ?", (user_id,)
        )


def validate_assignment_participants(
    database: Database,
    recruit_id: int,
    manager_id: int,
) -> None:
    recruit = get_user_or_404(database, recruit_id)
    manager = get_user_or_404(database, manager_id)
    fields: dict[str, str] = {}
    if recruit["role"] != "Recruit":
        fields["recruit_id"] = "Assignment target must be a Recruit"
    if manager["role"] != "Manager":
        fields["manager_id"] = "Assigned user must be a Manager"
    if recruit_id == manager_id:
        fields["manager_id"] = "Manager and Recruit must be different users"
    if fields:
        raise ApiError(
            409,
            "invalid_assignment",
            "Assignment requires one Recruit and one Manager",
            fields,
        )


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

    @app.get("/api/admin/users", response_model=list[AdminUserResponse])
    def list_admin_users(
        _: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> list[AdminUserResponse]:
        rows = database.fetchall(
            "SELECT * FROM users ORDER BY id ASC",
        )
        return [admin_user_response(database, row) for row in rows]

    @app.post("/api/admin/users", response_model=AdminUserResponse, status_code=201)
    def create_admin_user(
        payload: AdminUserCreate,
        _: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> AdminUserResponse:
        try:
            cursor = database.execute(
                """
                INSERT INTO users (
                    email, name, role, department, start_date, password_hash, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.email,
                    payload.name,
                    payload.role,
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
        row = get_user_or_404(database, cursor.lastrowid)
        return admin_user_response(database, row)

    @app.get("/api/admin/users/{user_id}", response_model=AdminUserResponse)
    def get_admin_user(
        user_id: int,
        _: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> AdminUserResponse:
        return admin_user_response(database, get_user_or_404(database, user_id))

    @app.patch("/api/admin/users/{user_id}", response_model=AdminUserResponse)
    def patch_admin_user(
        user_id: int,
        payload: AdminUserPatch,
        admin: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> AdminUserResponse:
        with database.atomic():
            target = get_user_or_404(database, user_id)
            updates = payload.model_dump(exclude_unset=True)
            if not updates:
                return admin_user_response(database, target)
            next_role = updates.get("role", target["role"])
            role_changed = "role" in updates and next_role != target["role"]
            if role_changed and user_id == admin["id"]:
                raise ApiError(
                    409, "invalid_state", "An Admin cannot change their own role"
                )
            if (
                role_changed
                and target["role"] == "Admin"
                and admin_count(database) == 1
            ):
                raise ApiError(409, "invalid_state", "Cannot remove the last Admin")
            if "start_date" in updates and updates["start_date"] is not None:
                updates["start_date"] = updates["start_date"].isoformat()
            assignments = ", ".join(f"{field} = ?" for field in updates)
            parameters = [*updates.values(), user_id]
            try:
                database.execute(
                    f"UPDATE users SET {assignments} WHERE id = ?", parameters
                )
            except sqlite3.IntegrityError as exc:
                raise ApiError(
                    409,
                    "email_conflict",
                    "An account with this email already exists",
                    {"email": "Email is already in use"},
                ) from exc
            if role_changed:
                invalidate_user_sessions(database, user_id)
                remove_invalid_assignments(database, user_id, str(next_role))
            updated = get_user_or_404(database, user_id)
            return admin_user_response(database, updated)

    @app.delete("/api/admin/users/{user_id}", status_code=204)
    def delete_admin_user(
        user_id: int,
        admin: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> None:
        with database.atomic():
            target = get_user_or_404(database, user_id)
            if user_id == admin["id"]:
                raise ApiError(
                    409, "invalid_state", "An Admin cannot delete themselves"
                )
            if target["role"] == "Admin" and admin_count(database) == 1:
                raise ApiError(409, "invalid_state", "Cannot delete the last Admin")
            database.execute("DELETE FROM users WHERE id = ?", (user_id,))

    @app.put(
        "/api/admin/recruits/{recruit_id}/manager",
        response_model=AdminUserResponse,
    )
    def put_manager_assignment(
        recruit_id: int,
        payload: ManagerAssignmentRequest,
        _: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> AdminUserResponse:
        validate_assignment_participants(database, recruit_id, payload.manager_id)
        database.execute(
            """
            INSERT INTO manager_assignments (recruit_id, manager_id, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(recruit_id) DO UPDATE SET
                manager_id = excluded.manager_id,
                created_at = excluded.created_at
            """,
            (recruit_id, payload.manager_id, datetime.now(UTC).isoformat()),
        )
        return admin_user_response(database, get_user_or_404(database, recruit_id))

    @app.delete("/api/admin/recruits/{recruit_id}/manager", status_code=204)
    def delete_manager_assignment(
        recruit_id: int,
        _: sqlite3.Row = Depends(require_admin),
        database: Database = Depends(get_database),
    ) -> None:
        recruit = get_user_or_404(database, recruit_id)
        if recruit["role"] != "Recruit":
            raise ApiError(
                409,
                "invalid_assignment",
                "Assignment target must be a Recruit",
                {"recruit_id": "Assignment target must be a Recruit"},
            )
        database.execute(
            "DELETE FROM manager_assignments WHERE recruit_id = ?",
            (recruit_id,),
        )

    return app


app = create_app()
