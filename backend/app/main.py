import json
import logging
import os
import secrets
import sqlite3
from collections import deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from threading import Lock
from time import monotonic
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .authorization import authorize_recruit_scope, authorize_report_scope, ensure_admin
from .database import Database
from .reports import (
    REPORT_COLUMNS,
    ReportFormat,
    ReportType,
    render_csv,
    render_pdf,
    report_filename,
    report_rows,
)
from .schemas import (
    AdminUserCreate,
    AdminUserPatch,
    AdminUserResponse,
    DashboardActivity,
    DashboardCounts,
    DashboardRecruit,
    DashboardResponse,
    FeedbackCreate,
    FeedbackPatch,
    FeedbackResponse,
    IssueCreate,
    IssuePatch,
    IssueResponse,
    IssueSeverity,
    IssueStatus,
    LoginRequest,
    ManagerAssignmentRequest,
    NoteCreate,
    NotePatch,
    NoteResponse,
    ProfileResponse,
    ProfileUpdate,
    SignupRequest,
    StrictDateValue,
    TaskCategory,
    TaskCreate,
    TaskPatch,
    TaskResponse,
    TaskStatus,
)
from .security import hash_password, verify_password


SESSION_COOKIE = "session_id"
SESSION_DURATION = timedelta(hours=8)
GENERIC_LOGIN_ERROR = "Invalid email or password"
LOGIN_FAILURE_LIMIT = 5
LOGIN_FAILURE_WINDOW_SECONDS = 60
REQUEST_LOGGER = logging.getLogger("onboarding_diary.requests")


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


def task_response(row: sqlite3.Row) -> TaskResponse:
    return TaskResponse.model_validate(dict(row))


def issue_response(row: sqlite3.Row) -> IssueResponse:
    return IssueResponse.model_validate(dict(row))


def feedback_response(row: sqlite3.Row) -> FeedbackResponse:
    return FeedbackResponse.model_validate(dict(row))


def note_response(row: sqlite3.Row) -> NoteResponse:
    values = dict(row)
    values["tags"] = json.loads(row["tags"])
    return NoteResponse.model_validate(values)


def dashboard_activity_response(row: sqlite3.Row) -> DashboardActivity:
    values = dict(row)
    values["tags"] = json.loads(row["tags"]) if row["tags"] is not None else []
    return DashboardActivity.model_validate(values)


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


def resolve_diary_owner(
    database: Database,
    actor: sqlite3.Row,
    owner_id: int | None,
) -> sqlite3.Row:
    if owner_id is None:
        if actor["role"] == "Recruit":
            return actor
        raise ApiError(
            422,
            "validation_error",
            "Request validation failed",
            {"owner_id": "Owner is required"},
        )
    return authorize_recruit_scope(
        database,
        actor,
        owner_id,
        api_error,
        conceal_unknown=True,
    )


def get_scoped_diary_record(
    database: Database,
    actor: sqlite3.Row,
    table: str,
    record_id: int,
) -> sqlite3.Row:
    row = database.fetchone(f"SELECT * FROM {table} WHERE id = ?", (record_id,))
    if row is None:
        raise ApiError(403, "access_denied", "Access denied")
    authorize_recruit_scope(
        database,
        actor,
        row["owner_id"],
        api_error,
        conceal_unknown=True,
    )
    return row


def serialize_updates(updates: dict[str, object]) -> dict[str, object]:
    if "date" in updates:
        updates["date"] = updates["date"].isoformat()
    return updates


def ensure_issue_resolution(status: str, resolution_notes: str) -> None:
    if status in {"Resolved", "Closed"} and not resolution_notes:
        raise ApiError(
            422,
            "validation_error",
            "Request validation failed",
            {"resolution_notes": "Resolution notes are required"},
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

    @app.middleware("http")
    async def log_request(request: Request, call_next):
        request_id = secrets.token_hex(16)
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            REQUEST_LOGGER.info(
                "request method=%s route=%s status=%s request_id=%s",
                request.method,
                request.url.path,
                status_code,
                request_id,
            )

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

    @app.get("/api/diary/recruits", response_model=list[ProfileResponse])
    def list_diary_recruits(
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> list[ProfileResponse]:
        if actor["role"] == "Recruit":
            rows = [actor]
        elif actor["role"] == "Manager":
            rows = database.fetchall(
                """
                SELECT users.*
                FROM manager_assignments
                JOIN users ON users.id = manager_assignments.recruit_id
                WHERE manager_assignments.manager_id = ?
                    AND users.role = 'Recruit'
                ORDER BY users.name ASC, users.id ASC
                """,
                (actor["id"],),
            )
        else:
            rows = database.fetchall(
                """
                SELECT * FROM users
                WHERE role = 'Recruit'
                ORDER BY name ASC, id ASC
                """
            )
        return [user_response(row) for row in rows]

    @app.get("/api/dashboard", response_model=DashboardResponse)
    def get_dashboard(
        owner_id: int | None = None,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> DashboardResponse:
        owner = resolve_diary_owner(database, actor, owner_id)
        counts_row = database.fetchone(
            """
            SELECT
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ?) AS tasks,
                (SELECT COUNT(*) FROM issues WHERE owner_id = ?) AS issues,
                (SELECT COUNT(*) FROM feedback WHERE owner_id = ?) AS feedback,
                (SELECT COUNT(*) FROM notes WHERE owner_id = ?) AS notes
            """,
            (owner["id"], owner["id"], owner["id"], owner["id"]),
        )
        task_counts = database.fetchone(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
            FROM tasks
            WHERE owner_id = ?
            """,
            (owner["id"],),
        )
        total_tasks = int(task_counts["total"]) if task_counts else 0
        completed_tasks = int(task_counts["completed"] or 0) if task_counts else 0
        task_progress = (
            int((completed_tasks * 100 / total_tasks) + 0.5) if total_tasks else 0
        )
        open_issue_rows = database.fetchall(
            """
            SELECT * FROM issues
            WHERE owner_id = ? AND status IN ('Open', 'In Progress')
            ORDER BY date DESC, created_at DESC, id DESC
            """,
            (owner["id"],),
        )
        activity_rows = database.fetchall(
            """
            SELECT
                id, 'task' AS kind, date, created_at, title, status, priority,
                NULL AS severity, NULL AS feedback_type, NULL AS tags
            FROM tasks
            WHERE owner_id = ?
            UNION ALL
            SELECT
                id, 'issue' AS kind, date, created_at, title, status,
                NULL AS priority, severity, NULL AS feedback_type, NULL AS tags
            FROM issues
            WHERE owner_id = ?
            UNION ALL
            SELECT
                id, 'feedback' AS kind, date, created_at, subject AS title,
                NULL AS status, NULL AS priority, NULL AS severity,
                type AS feedback_type, NULL AS tags
            FROM feedback
            WHERE owner_id = ?
            UNION ALL
            SELECT
                id, 'note' AS kind, date, created_at, title, NULL AS status,
                NULL AS priority, NULL AS severity, NULL AS feedback_type, tags
            FROM notes
            WHERE owner_id = ?
            ORDER BY date DESC, created_at DESC, id DESC, kind ASC
            LIMIT 10
            """,
            (owner["id"], owner["id"], owner["id"], owner["id"]),
        )
        counts = counts_row or {
            "tasks": 0,
            "issues": 0,
            "feedback": 0,
            "notes": 0,
        }
        return DashboardResponse(
            recruit=DashboardRecruit(id=owner["id"], name=owner["name"]),
            counts=DashboardCounts(
                tasks=counts["tasks"],
                issues=counts["issues"],
                feedback=counts["feedback"],
                notes=counts["notes"],
            ),
            task_progress_percent=task_progress,
            open_issue_count=len(open_issue_rows),
            open_issues=[issue_response(row) for row in open_issue_rows],
            recent_activity=[dashboard_activity_response(row) for row in activity_rows],
        )

    @app.get("/api/reports")
    def download_report(
        recruit_id: int,
        report_type: Annotated[ReportType, Query(alias="type")],
        start_date: StrictDateValue,
        end_date: StrictDateValue,
        report_format: Annotated[ReportFormat, Query(alias="format")],
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> Response:
        if start_date > end_date:
            raise ApiError(
                422,
                "validation_error",
                "Request validation failed",
                {"start_date": "Start date must be on or before end date"},
            )
        recruit = authorize_report_scope(
            database,
            actor,
            recruit_id,
            api_error,
            conceal_unknown=True,
        )
        columns = REPORT_COLUMNS[report_type]
        rows = report_rows(
            database,
            recruit_id,
            report_type,
            start_date,
            end_date,
        )
        try:
            if report_format == "csv":
                content = render_csv(columns, rows)
                media_type = "text/csv"
            else:
                content = render_pdf(
                    recruit["name"],
                    report_type,
                    start_date,
                    end_date,
                    datetime.now(UTC),
                    columns,
                    rows,
                )
                media_type = "application/pdf"
        except Exception as exc:
            raise ApiError(
                500,
                "server_error",
                "An unexpected error occurred; please retry",
            ) from exc
        filename = report_filename(
            recruit_id,
            report_type,
            start_date,
            end_date,
            report_format,
        )
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-store",
            },
        )

    @app.get("/api/tasks", response_model=list[TaskResponse])
    def list_tasks(
        owner_id: int | None = None,
        date: StrictDateValue | None = None,
        category: TaskCategory | None = None,
        status: TaskStatus | None = None,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> list[TaskResponse]:
        owner = resolve_diary_owner(database, actor, owner_id)
        conditions = ["owner_id = ?"]
        parameters: list[object] = [owner["id"]]
        if date is not None:
            conditions.append("date = ?")
            parameters.append(date.isoformat())
        for field, value in (("category", category), ("status", status)):
            if value is not None:
                conditions.append(f"{field} = ?")
                parameters.append(value)
        rows = database.fetchall(
            f"""
            SELECT * FROM tasks
            WHERE {" AND ".join(conditions)}
            ORDER BY date DESC, created_at DESC, id DESC
            """,
            parameters,
        )
        return [task_response(row) for row in rows]

    @app.post("/api/tasks", response_model=TaskResponse, status_code=201)
    def create_task(
        payload: TaskCreate,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> TaskResponse:
        owner = resolve_diary_owner(database, actor, payload.owner_id)
        cursor = database.execute(
            """
            INSERT INTO tasks (
                owner_id, date, title, description, category, status,
                priority, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                owner["id"],
                payload.date.isoformat(),
                payload.title,
                payload.description,
                payload.category,
                payload.status,
                payload.priority,
                datetime.now(UTC).isoformat(),
            ),
        )
        row = database.fetchone("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,))
        if row is None:
            raise ApiError(500, "server_error", "Unable to create task")
        return task_response(row)

    @app.get("/api/tasks/{task_id}", response_model=TaskResponse)
    def get_task(
        task_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> TaskResponse:
        return task_response(get_scoped_diary_record(database, actor, "tasks", task_id))

    @app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
    def patch_task(
        task_id: int,
        payload: TaskPatch,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> TaskResponse:
        row = get_scoped_diary_record(database, actor, "tasks", task_id)
        updates = serialize_updates(payload.model_dump(exclude_unset=True))
        if not updates:
            return task_response(row)
        assignments = ", ".join(f"{field} = ?" for field in updates)
        database.execute(
            f"UPDATE tasks SET {assignments} WHERE id = ?",
            [*updates.values(), task_id],
        )
        updated = database.fetchone("SELECT * FROM tasks WHERE id = ?", (task_id,))
        if updated is None:
            raise ApiError(500, "server_error", "Unable to update task")
        return task_response(updated)

    @app.delete("/api/tasks/{task_id}", status_code=204)
    def delete_task(
        task_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> None:
        get_scoped_diary_record(database, actor, "tasks", task_id)
        database.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

    @app.get("/api/issues", response_model=list[IssueResponse])
    def list_issues(
        owner_id: int | None = None,
        status: IssueStatus | None = None,
        severity: IssueSeverity | None = None,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> list[IssueResponse]:
        owner = resolve_diary_owner(database, actor, owner_id)
        conditions = ["owner_id = ?"]
        parameters: list[object] = [owner["id"]]
        for field, value in (("status", status), ("severity", severity)):
            if value is not None:
                conditions.append(f"{field} = ?")
                parameters.append(value)
        rows = database.fetchall(
            f"""
            SELECT * FROM issues
            WHERE {" AND ".join(conditions)}
            ORDER BY date DESC, created_at DESC, id DESC
            """,
            parameters,
        )
        return [issue_response(row) for row in rows]

    @app.post("/api/issues", response_model=IssueResponse, status_code=201)
    def create_issue(
        payload: IssueCreate,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> IssueResponse:
        owner = resolve_diary_owner(database, actor, payload.owner_id)
        ensure_issue_resolution(payload.status, payload.resolution_notes)
        cursor = database.execute(
            """
            INSERT INTO issues (
                owner_id, date, title, description, severity, status,
                resolution_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                owner["id"],
                payload.date.isoformat(),
                payload.title,
                payload.description,
                payload.severity,
                payload.status,
                payload.resolution_notes,
                datetime.now(UTC).isoformat(),
            ),
        )
        row = database.fetchone(
            "SELECT * FROM issues WHERE id = ?", (cursor.lastrowid,)
        )
        if row is None:
            raise ApiError(500, "server_error", "Unable to create issue")
        return issue_response(row)

    @app.get("/api/issues/{issue_id}", response_model=IssueResponse)
    def get_issue(
        issue_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> IssueResponse:
        return issue_response(
            get_scoped_diary_record(database, actor, "issues", issue_id)
        )

    @app.patch("/api/issues/{issue_id}", response_model=IssueResponse)
    def patch_issue(
        issue_id: int,
        payload: IssuePatch,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> IssueResponse:
        row = get_scoped_diary_record(database, actor, "issues", issue_id)
        updates = serialize_updates(payload.model_dump(exclude_unset=True))
        next_status = str(updates.get("status", row["status"]))
        next_notes = str(updates.get("resolution_notes", row["resolution_notes"]))
        ensure_issue_resolution(next_status, next_notes)
        if not updates:
            return issue_response(row)
        assignments = ", ".join(f"{field} = ?" for field in updates)
        database.execute(
            f"UPDATE issues SET {assignments} WHERE id = ?",
            [*updates.values(), issue_id],
        )
        updated = database.fetchone("SELECT * FROM issues WHERE id = ?", (issue_id,))
        if updated is None:
            raise ApiError(500, "server_error", "Unable to update issue")
        return issue_response(updated)

    @app.delete("/api/issues/{issue_id}", status_code=204)
    def delete_issue(
        issue_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> None:
        get_scoped_diary_record(database, actor, "issues", issue_id)
        database.execute("DELETE FROM issues WHERE id = ?", (issue_id,))

    @app.get("/api/feedback", response_model=list[FeedbackResponse])
    def list_feedback(
        owner_id: int | None = None,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> list[FeedbackResponse]:
        owner = resolve_diary_owner(database, actor, owner_id)
        rows = database.fetchall(
            """
            SELECT * FROM feedback
            WHERE owner_id = ?
            ORDER BY date DESC, created_at DESC, id DESC
            """,
            (owner["id"],),
        )
        return [feedback_response(row) for row in rows]

    @app.post("/api/feedback", response_model=FeedbackResponse, status_code=201)
    def create_feedback(
        payload: FeedbackCreate,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> FeedbackResponse:
        owner = resolve_diary_owner(database, actor, payload.owner_id)
        cursor = database.execute(
            """
            INSERT INTO feedback (
                owner_id, date, subject, type, details, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                owner["id"],
                payload.date.isoformat(),
                payload.subject,
                payload.type,
                payload.details,
                datetime.now(UTC).isoformat(),
            ),
        )
        row = database.fetchone(
            "SELECT * FROM feedback WHERE id = ?", (cursor.lastrowid,)
        )
        if row is None:
            raise ApiError(500, "server_error", "Unable to create feedback")
        return feedback_response(row)

    @app.get("/api/feedback/{feedback_id}", response_model=FeedbackResponse)
    def get_feedback(
        feedback_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> FeedbackResponse:
        return feedback_response(
            get_scoped_diary_record(database, actor, "feedback", feedback_id)
        )

    @app.patch("/api/feedback/{feedback_id}", response_model=FeedbackResponse)
    def patch_feedback(
        feedback_id: int,
        payload: FeedbackPatch,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> FeedbackResponse:
        row = get_scoped_diary_record(database, actor, "feedback", feedback_id)
        updates = serialize_updates(payload.model_dump(exclude_unset=True))
        if not updates:
            return feedback_response(row)
        assignments = ", ".join(f"{field} = ?" for field in updates)
        database.execute(
            f"UPDATE feedback SET {assignments} WHERE id = ?",
            [*updates.values(), feedback_id],
        )
        updated = database.fetchone(
            "SELECT * FROM feedback WHERE id = ?", (feedback_id,)
        )
        if updated is None:
            raise ApiError(500, "server_error", "Unable to update feedback")
        return feedback_response(updated)

    @app.delete("/api/feedback/{feedback_id}", status_code=204)
    def delete_feedback(
        feedback_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> None:
        get_scoped_diary_record(database, actor, "feedback", feedback_id)
        database.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))

    @app.get("/api/notes", response_model=list[NoteResponse])
    def list_notes(
        owner_id: int | None = None,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> list[NoteResponse]:
        owner = resolve_diary_owner(database, actor, owner_id)
        rows = database.fetchall(
            """
            SELECT * FROM notes
            WHERE owner_id = ?
            ORDER BY date DESC, created_at DESC, id DESC
            """,
            (owner["id"],),
        )
        return [note_response(row) for row in rows]

    @app.post("/api/notes", response_model=NoteResponse, status_code=201)
    def create_note(
        payload: NoteCreate,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> NoteResponse:
        owner = resolve_diary_owner(database, actor, payload.owner_id)
        cursor = database.execute(
            """
            INSERT INTO notes (
                owner_id, date, title, content, tags, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                owner["id"],
                payload.date.isoformat(),
                payload.title,
                payload.content,
                json.dumps(payload.tags, separators=(",", ":")),
                datetime.now(UTC).isoformat(),
            ),
        )
        row = database.fetchone("SELECT * FROM notes WHERE id = ?", (cursor.lastrowid,))
        if row is None:
            raise ApiError(500, "server_error", "Unable to create note")
        return note_response(row)

    @app.get("/api/notes/{note_id}", response_model=NoteResponse)
    def get_note(
        note_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> NoteResponse:
        return note_response(get_scoped_diary_record(database, actor, "notes", note_id))

    @app.patch("/api/notes/{note_id}", response_model=NoteResponse)
    def patch_note(
        note_id: int,
        payload: NotePatch,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> NoteResponse:
        row = get_scoped_diary_record(database, actor, "notes", note_id)
        updates = serialize_updates(payload.model_dump(exclude_unset=True))
        if "tags" in updates:
            updates["tags"] = json.dumps(updates["tags"], separators=(",", ":"))
        if not updates:
            return note_response(row)
        assignments = ", ".join(f"{field} = ?" for field in updates)
        database.execute(
            f"UPDATE notes SET {assignments} WHERE id = ?",
            [*updates.values(), note_id],
        )
        updated = database.fetchone("SELECT * FROM notes WHERE id = ?", (note_id,))
        if updated is None:
            raise ApiError(500, "server_error", "Unable to update note")
        return note_response(updated)

    @app.delete("/api/notes/{note_id}", status_code=204)
    def delete_note(
        note_id: int,
        actor: sqlite3.Row = Depends(require_user),
        database: Database = Depends(get_database),
    ) -> None:
        get_scoped_diary_record(database, actor, "notes", note_id)
        database.execute("DELETE FROM notes WHERE id = ?", (note_id,))

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
