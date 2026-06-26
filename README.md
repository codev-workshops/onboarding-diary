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

## Authorization Policies

| Policy                | Requirement                                         |
|-----------------------|-----------------------------------------------------|
| `AdminOnly`           | Role = Admin                                        |
| `ManagerOrAdmin`      | Role = Manager or Admin                             |
| `AssignedRecruitOrSelf` | Caller is Admin, or owns the resource, or is a Manager assigned to the recruit |
