# Onboarding Diary

A web application for new recruits to document their onboarding journey. Built with .NET 10 Web API + Next.js.

## Architecture

```
backend/
  OnboardingDiary.Api          - ASP.NET Core Web API, controllers, auth pipeline
  OnboardingDiary.Application  - DTOs, interfaces, validators (persistence-ignorant)
  OnboardingDiary.Domain       - Entities, enums, constants
  OnboardingDiary.Infrastructure - EF Core, auth service implementations
  OnboardingDiary.Tests        - Unit + integration tests

frontend/                     - Next.js 16 (App Router)
```

## Configuration

### JWT (`Jwt` section in appsettings)

| Key                | Default | Description                                         |
|--------------------|---------|-----------------------------------------------------|
| `Issuer`           | `OnboardingDiary` | JWT issuer claim                        |
| `Audience`         | `OnboardingDiary` | JWT audience claim                      |
| `SigningKey`       | *(dev only key)* | HS256 signing key (>= 32 bytes). **In production, load from a secret store or environment variable -- never commit.** |
| `AccessTokenMinutes` | `15`  | Access token lifetime                               |
| `RefreshTokenDays` | `7`    | Refresh token lifetime                              |

### Security / Lockout (`Security` section)

| Key                | Default | Description                                       |
|--------------------|---------|---------------------------------------------------|
| `MaxFailedAttempts`| `5`     | Failed login attempts before lockout              |
| `LockoutMinutes`   | `15`    | Lockout duration in minutes                       |

### Database

Connection string in `ConnectionStrings:DefaultConnection`. A default admin user is seeded in Development (`Seed:AdminEmail` / `Seed:AdminPassword`).

### Migration

Phase 2 adds `FailedLoginAttempts` and `LockoutEnd` to `User`, plus a `PasswordResetTokens` table. Generate the migration:

```bash
cd backend
dotnet ef migrations add AddAuthLockoutAndResetTokens \
  --project OnboardingDiary.Infrastructure \
  --startup-project OnboardingDiary.Api
```

Migrations are auto-applied at startup in Development via `DbSeeder`.

## Auth Endpoints (`/api/auth/`)

| Method | Path              | Auth     | Description                                     |
|--------|-------------------|----------|-------------------------------------------------|
| POST   | `/register`       | Anonymous| Create user (defaults to Recruit role) -> 201   |
| POST   | `/login`          | Anonymous| Returns access + refresh tokens -> 200          |
| POST   | `/logout`         | Anonymous| Revokes refresh token -> 204                    |
| POST   | `/refresh`        | Anonymous| Rotates tokens -> 200                           |
| POST   | `/forgot-password`| Anonymous| Sends reset token (24h) via email -> 200        |
| POST   | `/reset-password` | Anonymous| Resets password, revokes all refresh tokens -> 200 |
| GET    | `/ping`           | Bearer   | Returns current user id/role (smoke-test) -> 200|

### Swagger

Run the backend and visit `/swagger`. Use the Authorize button (lock icon) to paste a JWT access token from the `/login` response.

### Account Lockout

After 5 consecutive failed login attempts (configurable), the account is locked for 15 minutes. A successful login resets the counter.

### Email

`IEmailSender` is implemented by `LoggingEmailSender` which logs emails to the console. Replace with a real SMTP sender for production.

## Running

### Backend

```bash
cd backend/OnboardingDiary.Api
dotnet run
# Swagger at https://localhost:7030/swagger
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE_URL` to override the backend URL (defaults to `https://localhost:7030`).

### Tests

```bash
cd backend
dotnet test
```

## User Profile & Admin User Management Endpoints (`/api/users/`)

| Method | Path              | Auth          | Description                                              |
|--------|-------------------|---------------|----------------------------------------------------------|
| GET    | `/me`             | Bearer        | Returns the authenticated user's profile -> 200          |
| PUT    | `/me`             | Bearer        | Updates the authenticated user's profile -> 200          |
| GET    | `/`               | AdminOnly     | Lists users with pagination, search, role/department filters -> 200 |
| PUT    | `/{id}/role`      | AdminOnly     | Updates a user's role (sends email notification, writes audit log) -> 200 |
| DELETE | `/{id}`           | AdminOnly     | Soft-deactivates a user (sets IsActive=false, revokes refresh tokens, writes audit log) -> 204 |

**Self-lockout prevention**: admins cannot deactivate themselves or remove their own Admin role (returns 400).

**Validation (section 7.1)**:
- Name: 2–100 chars, letters/spaces/hyphens/apostrophes only
- Department: must be in the predefined `Departments` constant
- StartDate: not more than 30 days future / 1 year past
- AvatarUrl: optional; valid HTTP/HTTPS URL when present
- Role: must be a defined `Role` enum value

**Audit logging (NFR 8.2)**: `UpdateRoleAsync` and `DeactivateUserAsync` write `AuditLog` rows stamped with the acting admin's user ID.

## Frontend Auth

- **Token storage**: access token in memory, refresh token in localStorage (trade-off: simpler setup vs. XSS risk; httpOnly cookies recommended for production).
- **401 interceptor**: on 401, the API client automatically attempts one refresh; on failure, clears tokens and redirects to `/login`.
- **Protected routes**: wrap pages with `<ProtectedRoute>` to enforce authentication.
- **Pages**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` (placeholder), `/profile` (user profile editor), `/admin/users` (admin user management table — role-gated).

## Task Log Endpoints (`/api/tasks/`) — Phase 4

| Method | Path        | Auth   | Description                                       |
|--------|-------------|--------|---------------------------------------------------|
| GET    | `/`         | Bearer | List tasks (paginated/filtered) -> 200            |
| POST   | `/`         | Bearer | Create task -> 201                                |
| GET    | `/{id}`     | Bearer | Get task by ID -> 200 (404 if not found)          |
| PUT    | `/{id}`     | Bearer | Update task -> 200                                |
| DELETE | `/{id}`     | Bearer | Soft delete task -> 204                           |
| GET    | `/stats`    | Bearer | Get task stats (optional `?recruitId`) -> 200     |

### Query parameters (GET `/api/tasks`)

`page`, `limit` (max 100, default 20), `startDate`, `endDate`, `category`, `status`, `priority`, `recruitId`.

### Business rules

- **Completed requires description**: when `Status == Completed`, `Description` must be non-empty.
- **CompletedAt auto-set**: set automatically when status transitions to Completed; cleared when moved away.
- **Soft delete**: tasks are never physically removed; `IsDeleted = true`.
- **Manager read-only**: managers may list/get an assigned recruit's tasks but cannot create/update/delete them.
- **Access control**: recruits see only own tasks; managers see own + assigned recruits'; admins see all.

### Reference pattern

This Task Log slice (Controller → Service → Repository → DTOs → Validators) is the **reference pattern** for Phases 5 (Issues), 6 (Feedback), and 7 (Notes). DI registration uses a dedicated `AddTaskModule()` extension to minimize merge conflicts.

### Frontend routes

| Route             | Description                                 |
|-------------------|---------------------------------------------|
| `/tasks`          | Task list with filters, pagination, CRUD    |
| `/tasks/[id]`     | Task detail/edit page                       |

## Notes Endpoints (`/api/notes/`) — Phase 7

| Method | Path        | Auth   | Description                                       |
|--------|-------------|--------|---------------------------------------------------|
| GET    | `/`         | Bearer | List notes (paginated/filtered/searched) -> 200   |
| POST   | `/`         | Bearer | Create note -> 201                                |
| GET    | `/{id}`     | Bearer | Get note by ID -> 200 (404 if not found/not owner)|
| PUT    | `/{id}`     | Bearer | Update note -> 200                                |
| DELETE | `/{id}`     | Bearer | Soft delete note -> 204                           |

### Query parameters (GET `/api/notes`)

`page`, `limit` (max 100, default 20), `search` (full-text across title/content/tags), `tags` (comma-separated), `startDate`, `endDate`.

### Business rules

- **Owner-only**: notes are private to the recruit; no manager/admin read access.
- **Tags**: optional, max 10 per note, each 1–30 chars, alphanumeric and hyphens only; stored as JSON.
- **Pinning**: `IsPinned` boolean; server enforces max 5 pinned notes per user (on create and on update toggle false→true); returns 400 when exceeded.
- **Pinned-first ordering**: pinned notes appear first in list results, then by date descending.
- **Search**: case-insensitive match across title, content, and tags.
- **Soft delete**: notes are never physically removed; `IsDeleted = true`.
- **Content**: supports Markdown (rendered in the frontend editor).

### Frontend routes

| Route             | Description                                          |
|-------------------|------------------------------------------------------|
| `/notes`          | Notes list with search, tag chips, pinned section    |
| `/notes/[id]`     | Note detail/edit page with Markdown editor           |

## Issue Log Endpoints (`/api/issues/`) — Phase 5

| Method | Path               | Auth   | Description                                       |
|--------|--------------------|--------|---------------------------------------------------|
| GET    | `/`                | Bearer | List issues (paginated/filtered) -> 200           |
| POST   | `/`                | Bearer | Create issue -> 201                               |
| GET    | `/{id}`            | Bearer | Get issue by ID -> 200 (404 if not found)         |
| PUT    | `/{id}`            | Bearer | Update issue -> 200                               |
| DELETE | `/{id}`            | Bearer | Soft delete issue -> 204                          |
| POST   | `/{id}/escalate`   | Bearer | Escalate issue to manager -> 200                  |

### Query parameters (GET `/api/issues`)

`page`, `limit` (max 100, default 20), `status`, `severity`, `startDate`, `endDate`, `recruitId`.

### Business rules

- **Resolution notes required**: when `Status` is `Resolved` or `Closed`, `ResolutionNotes` must be non-empty.
- **ResolvedAt auto-set**: set automatically when status transitions to Resolved/Closed; cleared when moved back.
- **Status transition validation**: `Closed` -> `Open` is not allowed.
- **Soft delete**: issues are never physically removed; `IsDeleted = true`.
- **Manager read-only**: managers may list/get an assigned recruit's issues but cannot create/update/delete them.
- **Escalate**: sets `IsEscalated = true` and sends an email notification to the recruit's manager.
- **Access control**: recruits see only own issues; managers see own + assigned recruits'; admins see all.

### Frontend routes

| Route             | Description                                 |
|-------------------|---------------------------------------------|
| `/issues`         | Issue list with filters, pagination, CRUD   |
| `/issues/[id]`    | Issue detail/edit page                      |

## Feedback Endpoints (`/api/feedback/`) — Phase 6

| Method | Path        | Auth   | Description                                        |
|--------|-------------|--------|----------------------------------------------------|
| GET    | `/`         | Bearer | List feedback (paginated/filtered) -> 200          |
| POST   | `/`         | Bearer | Create feedback -> 201                             |
| GET    | `/{id}`     | Bearer | Get feedback by ID -> 200 (404 if not found)       |
| PUT    | `/{id}`     | Bearer | Update feedback -> 200                             |
| DELETE | `/{id}`     | Bearer | Soft delete feedback -> 204                        |

### Query parameters (GET `/api/feedback`)

`page`, `limit` (max 100, default 20), `type` (Positive/Suggestion/Concern), `startDate`, `endDate`, `recruitId`, `department` (admin only).

### Business rules

- **Soft delete**: feedback is never physically removed; `IsDeleted = true`.
- **Owner-only update**: only the feedback author can edit their feedback.
- **Delete**: owner or admin can soft-delete.
- **Manager read-only**: managers may list/get an assigned recruit's feedback (US-FEED-03) but cannot create/update/delete it.
- **Admin aggregated view**: admins can list all feedback across users, filterable by department, type, and date range (US-FEED-04).
- **Access control**: recruits see only own feedback; managers see own + assigned recruits'; admins see all.

### Validation rules (section 7.4)

- **Date**: required, valid, not in the future.
- **Subject**: required, 3–150 chars, trimmed.
- **Type**: required, defined FeedbackType enum value.
- **Details**: required, 20–5000 chars.

### Frontend routes

| Route             | Description                                 |
|-------------------|---------------------------------------------|
| `/feedback`       | Feedback list with filters, pagination, CRUD|
| `/feedback/[id]`  | Feedback detail/edit page                   |

## Report Endpoints (`/api/reports/`) — Phase 9

| Method | Path                | Auth   | Description                                                    |
|--------|---------------------|--------|----------------------------------------------------------------|
| POST   | `/generate`         | Bearer | Generate a report (PDF/CSV) -> 200 `{ reportId, downloadUrl }`|
| GET    | `/{id}/download`    | Bearer | Download generated report file -> 200 file stream              |
| GET    | `/`                 | Bearer | List reports (paginated, role-scoped) -> 200 `{ reports[], total }` |

### Query parameters

**POST `/generate`** body:
- `startDate` (required), `endDate` (required, >= startDate, range <= 365 days)
- `categories` (required, at least one of: `tasks`, `issues`, `feedback`, `notes`, or `all`)
- `format` (required, `Pdf` or `Csv`)
- `recruitId` (optional; required for manager/admin generating for another user)

**GET `/`**: `page`, `limit` (max 100, default 20).

**GET `/{id}/download`**: `?format=pdf|csv` (optional; defaults to report's stored format).

### Business rules

- **PDF generation**: uses QuestPDF (Community license) with headers (recruit name, department, date range, generated-by, generated-on) and category sections with formatted tables.
- **CSV generation**: uses CsvHelper with proper field escaping; category-delimited sections in a single CSV file.
- **Soft-deleted entries excluded**: global query filters apply; deleted tasks/issues/feedback/notes are not included.
- **Access control**:
  - Recruits: can only generate/view reports for themselves.
  - Managers: can generate/view for themselves and assigned recruits.
  - Admins: can generate/view for any user.
- **Download access**: caller must have generated the report, be the subject, be admin, or be the subject's assigned manager.

### Configuration

| Key                  | Default                        | Description                     |
|----------------------|--------------------------------|---------------------------------|
| `Reports:StoragePath`| `{AppContext.BaseDirectory}/reports` | Directory for generated report files |

### Packages

| Package    | License    | Description              |
|------------|------------|--------------------------|
| `QuestPDF` | Community  | PDF report generation    |
| `CsvHelper`| Apache 2.0 | CSV report generation    |

**Note**: `QuestPDF.Settings.License = LicenseType.Community` is set at startup via `AddReportModule()`.

### Frontend routes

| Route             | Description                                              |
|-------------------|----------------------------------------------------------|
| `/reports`        | Reports list with download links + generate new report   |

### Validation rules (section 7.6)

- **StartDate**: required, valid date.
- **EndDate**: required, valid, >= StartDate, range <= 365 days.
- **Categories**: at least one; each must be `tasks`, `issues`, `feedback`, `notes`, or `all`.
- **Format**: required, `Pdf` or `Csv`.

## Authorization Policies

| Policy                | Requirement                                         |
|-----------------------|-----------------------------------------------------|
| `AdminOnly`           | Role = Admin                                        |
| `ManagerOrAdmin`      | Role = Manager or Admin                             |
| `AssignedRecruitOrSelf` | Caller is Admin, or owns the resource, or is a Manager assigned to the recruit |

## Cross-Cutting Hardening — Phase 10

### Global Exception Handling & ProblemDetails

All unhandled exceptions are intercepted by `GlobalExceptionHandler` (`IExceptionHandler`) and returned as RFC 7807 `ProblemDetails` responses:

| Exception Type               | HTTP Status | Notes                                    |
|------------------------------|-------------|------------------------------------------|
| `ValidationException`        | 400         | Includes `errors` dictionary (field → messages) |
| FluentValidation failures    | 400         | Same `errors` dictionary format          |
| `BusinessRuleException`      | 400         | Bad request detail (lockout, limits, invalid transitions) |
| `UnauthorizedAccessException`| 401         | Missing/invalid authentication           |
| `ForbiddenException`         | 403         | Insufficient permissions                 |
| `NotFoundException`          | 404         | Resource not found                       |
| `KeyNotFoundException`       | 404         | Resource not found                       |
| `FileNotFoundException`      | 404         | File not found (e.g. report file)        |
| `ConflictException`          | 409         | Duplicate resource                       |
| Any other exception          | 500         | Generic message in Production; detail in Development |

Response shape:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed.",
  "errors": {
    "Title": ["Title is required."]
  }
}
```

### Rate Limiting

Built-in `Microsoft.AspNetCore.RateLimiting` middleware with two layers:

| Policy    | Scope                          | Limit                    | Window  |
|-----------|--------------------------------|--------------------------|---------|
| Global    | Authenticated user ID or client IP | 100 requests             | 1 minute |
| `login`   | IP + submitted email           | 5 attempts               | 15 minutes |

Exceeded limits return `429 Too Many Requests` with a `ProblemDetails` body and `Retry-After` header.

**Configuration** (`RateLimiting` section in `appsettings.json`):

| Key                  | Default | Description                        |
|----------------------|---------|------------------------------------|
| `PermitPerMinute`    | `100`   | Global per-user/IP request limit   |
| `LoginPermit`        | `5`     | Login attempts before rate-limited |
| `LoginWindowMinutes` | `15`    | Login rate-limit window            |

**Note**: This transport-level rate limit coexists with the Phase 2 per-account lockout (5 failed attempts → `LockoutEnd`). The rate limiter blocks by IP+email at the middleware level; the account lockout is a business rule that persists across server restarts.

### Input Sanitization / XSS Prevention

XSS prevention uses **output-time encoding** (the industry standard):

- **React (frontend)**: JSX text interpolation automatically escapes `<`, `>`, `&`, `"`, `'` — this is the primary XSS defense for HTML contexts.
- **Markdown notes**: The `simpleMarkdownToHtml` renderer escapes HTML before converting markdown syntax, preventing injection.
- **Server-side**: All user-provided string inputs are **trimmed** on create/update. An `ISanitizer` abstraction (`HtmlSanitizer` using `System.Text.Encodings.Web.HtmlEncoder`) is registered in DI and available for contexts that need explicit HTML encoding (e.g. server-rendered HTML). Raw text is stored in the database so that non-HTML consumers (emails, CSV/PDF reports, search) work correctly without decoding.

### Pagination Caps

All list endpoints enforce centralized pagination via `PaginationParams.Normalize()`:

| Parameter | Default | Min | Max |
|-----------|---------|-----|-----|
| `page`    | 1       | 1   | —   |
| `limit`   | 20      | 1   | 100 |

Requesting `limit=1000` silently clamps to 100. Requesting `limit=0` or negative defaults to 20.

### CORS & HTTPS

- **CORS**: `"FrontendCors"` policy allows only the configured origin (`Cors:FrontendOrigin`), with credentials. Not `AllowAnyOrigin`.
- **HTTPS**: `app.UseHttpsRedirection()` is active. HSTS (`app.UseHsts()`) is enabled in non-Development environments.
- **Secrets**: JWT signing key and admin seed password are loaded from configuration (`appsettings.json` / environment variables / secret store). The `SigningKey` placeholder in `appsettings.json` must be replaced with a secure value from a secret vault in production.

### Accessibility & Responsiveness

**WCAG 2.1 AA compliance**:
- Semantic HTML landmarks: `<main>`, `<nav>`, `<header>`, skip-to-content link
- ARIA attributes: `role="dialog"`, `aria-modal`, `aria-label` on all modals, buttons, and filters
- Keyboard navigation: modals close on Escape, focus is managed on open
- Focus indicator: 2px solid `#0070f3` outline with 2px offset on `:focus-visible`
- Minimum tap targets: 44×44px on all interactive elements
- Screen-reader-only utility class (`.sr-only`)
- Toast notifications use `role="alert"` with `aria-live="polite"`

**Responsive breakpoints**:
- Mobile: < 768px (stacked layouts, full-width inputs)
- Tablet: 768–1024px
- Desktop: > 1024px

Tables (admin users, reports) use `overflow-x: auto` for horizontal scrolling on small screens.
