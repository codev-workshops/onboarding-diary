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

## Frontend Auth

- **Token storage**: access token in memory, refresh token in localStorage (trade-off: simpler setup vs. XSS risk; httpOnly cookies recommended for production).
- **401 interceptor**: on 401, the API client automatically attempts one refresh; on failure, clears tokens and redirects to `/login`.
- **Protected routes**: wrap pages with `<ProtectedRoute>` to enforce authentication.
- **Pages**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`, `/team`.

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

## Dashboard Endpoints (`/api/dashboard/`) — Phase 8

| Method | Path        | Auth              | Description                                               |
|--------|-------------|-------------------|-----------------------------------------------------------|
| GET    | `/`         | Bearer            | Per-user dashboard summary (stats, recent entries, open issues) -> 200 |
| GET    | `/team`     | ManagerOrAdmin    | Team recruit progress (completion %, open/escalated issues) -> 200 |

### GET `/api/dashboard`

Returns for the authenticated user:
- `taskStats` — total/completed/inProgress/pending/completionRate (reuses Phase 4 `GetStatsAsync`)
- `issueStats` — total/open/inProgress/resolved/closed/critical/escalated
- `feedbackStats` — total/positive/suggestion/concern
- `noteStats` — total/pinned
- `recentEntries` — last 5 entries per category (tasks/issues/feedback/notes) with badge
- `openIssues` — all open/in-progress issues sorted Critical-first

### GET `/api/dashboard/team`

Query: `?department=` (optional, honored for admins; managers always scoped to assigned recruits).

Returns `{ recruits: [...] }` with per-recruit: id, name, department, startDate, daysSinceStart, completionPercentage, openIssueCount, escalatedIssueCount.

### Frontend routes

| Route        | Description                                                    |
|--------------|----------------------------------------------------------------|
| `/dashboard` | Recruit dashboard — progress bar, stat tiles, recent entries, open issues, quick actions |
| `/team`      | Manager/Admin team dashboard — recruit cards with progress, issue badges |

## Authorization Policies

| Policy                | Requirement                                         |
|-----------------------|-----------------------------------------------------|
| `AdminOnly`           | Role = Admin                                        |
| `ManagerOrAdmin`      | Role = Manager or Admin                             |
| `AssignedRecruitOrSelf` | Caller is Admin, or owns the resource, or is a Manager assigned to the recruit |
