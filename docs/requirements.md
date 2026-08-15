# Onboarding Diary — Requirements

A responsive web application that lets new recruits document their onboarding journey (tasks, issues,
feedback, notes), gives managers oversight of their recruits, and gives admins full visibility plus
reporting.

- Frontend: React 18 + TypeScript + Vite, React Router, TanStack Query, MUI, react-hook-form + zod.
- Backend: .NET 8 Web API, EF Core 8, SQLite, JWT bearer auth, FluentValidation, Serilog.

---

## 1. Roles and personas

| Role | Description | Scope of data |
| --- | --- | --- |
| `NewRecruit` | A new employee documenting their onboarding journey. | Own entries only (full CRUD). |
| `Manager` | Oversees a set of recruits. | Own entries (CRUD) + read-only access to overseen recruits' entries and reports. |
| `Admin` | System administrator. | All users and all entries (read), user management, reports for anyone. |

Oversight relationship: `User.ManagerId` (self-referencing FK). A manager's "overseen set" is every
user whose `ManagerId` equals the manager's id. Admins implicitly oversee everyone.

---

## 2. User stories

### New recruit
1. As a recruit, I can sign up with email/password and log in so that my diary is private to me.
2. As a recruit, I can log a daily task with date, title, description, category, status and priority so
   that my progress is documented.
3. As a recruit, I can filter my task log by date range, category and status so I can find entries fast.
4. As a recruit, I can edit and delete my own entries, with a confirmation before deletion.
5. As a recruit, I can record issues/blockers with a severity, status and resolution notes so blockers
   are visible to my manager.
6. As a recruit, I can submit feedback notes classified as Positive, Suggestion or Concern.
7. As a recruit, I can keep free-form additional notes with tags and filter my notes by tag.
8. As a recruit, I can see a dashboard summarising my counts, task completion progress, open issues and
   recent activity.
9. As a recruit, I can export my own entries as PDF or CSV for a given date range.

### Manager
10. As a manager, I can see the list of recruits I oversee.
11. As a manager, I can read (but not modify) the tasks, issues, feedback and notes of my recruits by
    passing `recruitId` to the list endpoints.
12. As a manager, I can view a dashboard summary for a specific overseen recruit.
13. As a manager, I can generate PDF/CSV reports for an overseen recruit; requesting a recruit outside my
    overseen set returns `403`.

### Admin
14. As an admin, I can list all users and their roles/managers.
15. As an admin, I can read any recruit's entries and generate reports for anyone.
16. As an admin, I sign in with the seeded credentials on a fresh database.

---

## 3. Domain model

```
User (Id, Email, PasswordHash, PasswordSalt, FullName, Role, Department, StartDate, ManagerId?, CreatedAtUtc)
  ManagerId -> User.Id (self reference, Restrict delete)

TaskEntry  (Id, UserId, Date, Title, Description?, Category, Status, Priority, CreatedAtUtc, UpdatedAtUtc)
IssueEntry (Id, UserId, Date, Title, Description?, Severity, Status, ResolutionNotes?, CreatedAtUtc, UpdatedAtUtc)
FeedbackNote (Id, UserId, Date, Subject, Type, Details?, CreatedAtUtc, UpdatedAtUtc)
AdditionalNote (Id, UserId, Date, Title, Content?, Tags (CSV column), CreatedAtUtc, UpdatedAtUtc)
```

All entry types cascade-delete with their owning `User`. All entities are owned by exactly one user via
`UserId`.

### Enums (shared contract, serialised as strings)

| Enum | Values |
| --- | --- |
| `UserRole` | `NewRecruit`, `Manager`, `Admin` |
| `TaskCategory` | `Training`, `Setup`, `Documentation`, `Meeting`, `Development`, `Other` |
| `TaskStatus` | `NotStarted`, `InProgress`, `Blocked`, `Completed` |
| `TaskPriority` | `Low`, `Medium`, `High` |
| `IssueSeverity` | `Low`, `Medium`, `High`, `Critical` |
| `IssueStatus` | `Open`, `InProgress`, `Resolved`, `Closed` |
| `FeedbackType` | `Positive`, `Suggestion`, `Concern` |

---

## 4. Shared API contracts

- Base path `/api`. All responses JSON, `camelCase`, enums as strings.
- Auth: `Authorization: Bearer <jwt>`. Token claims: `sub` (user id), `email`, `role`, `name`.
  Lifetime 8 hours (configurable via `Jwt:ExpiryMinutes`).
- Pagination envelope: `{ "items": [...], "page": 1, "pageSize": 20, "total": 137 }`.
  Query params `page` (>=1, default 1) and `pageSize` (1..100, default 20).
- Common filters: `from`, `to` (inclusive ISO dates), `search` (matches title/subject), `recruitId`.
- Dates: request/response as ISO 8601. Entry `date` values are date-only (`yyyy-MM-dd`), stored as UTC
  midnight. Audit stamps (`createdAtUtc`, `updatedAtUtc`) are full ISO 8601 UTC instants.
- Error envelope (every non-2xx):
  ```json
  { "error": { "code": "validation_error", "message": "Validation failed.", "details": ["Title is required."] } }
  ```
  Codes: `validation_error` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404),
  `conflict` (409), `internal_error` (500).

### Endpoint table

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | anonymous | Register a recruit; returns JWT + profile. |
| POST | `/api/auth/login` | anonymous | Email/password login; returns JWT + profile. |
| GET | `/api/auth/me` | any | Current user profile. |
| GET | `/api/users/recruits` | Manager, Admin | Overseen recruits (all users for Admin). |
| GET | `/api/users` | Admin | All users. |
| GET | `/api/tasks` | any | Paged task list. Filters: `recruitId`, `from`, `to`, `category`, `status`, `search`, `page`, `pageSize`. |
| GET | `/api/tasks/{id}` | any | Single task (ownership/oversight checked). |
| POST | `/api/tasks` | any | Create task for the caller. |
| PUT | `/api/tasks/{id}` | owner | Update own task. |
| DELETE | `/api/tasks/{id}` | owner | Delete own task. |
| GET | `/api/issues` | any | Paged issues. Filters: `recruitId`, `from`, `to`, `severity`, `status`, `search`, paging. |
| GET/POST/PUT/DELETE | `/api/issues[/{id}]` | as tasks | Same ownership rules. |
| GET | `/api/feedback` | any | Paged feedback. Filters: `recruitId`, `from`, `to`, `type`, `search`, paging. |
| GET/POST/PUT/DELETE | `/api/feedback[/{id}]` | as tasks | Same ownership rules. |
| GET | `/api/notes` | any | Paged notes. Filters: `recruitId`, `from`, `to`, `tag`, `search`, paging. |
| GET/POST/PUT/DELETE | `/api/notes[/{id}]` | as tasks | Same ownership rules. |
| GET | `/api/dashboard/summary` | any | Aggregates for the caller or `recruitId`. |
| GET | `/api/reports` | any | `type=tasks\|issues\|feedback\|combined`, `from`, `to`, `format=pdf\|csv`, `recruitId?`. Returns a file download. |

`GET /api/dashboard/summary` response:

```json
{
  "recruitId": 3, "recruitName": "Nina Recruit",
  "taskCounts": { "total": 12, "notStarted": 2, "inProgress": 3, "blocked": 1, "completed": 6 },
  "taskCompletionPercent": 50,
  "issueCounts": { "total": 4, "open": 2, "inProgress": 1, "resolved": 1, "closed": 0 },
  "feedbackCounts": { "total": 5, "positive": 3, "suggestion": 1, "concern": 1 },
  "notesCount": 7,
  "recentActivity": [ { "type": "Task", "id": 9, "title": "...", "date": "2026-08-14", "status": "Completed" } ]
}
```

---

## 5. Authorization rules (server-side, enforced in services)

- Every endpoint except `signup`/`login` requires a valid JWT.
- **Read**: allowed if the entry belongs to the caller, or the caller is an Admin, or the caller is a
  Manager and the entry owner's `ManagerId` is the caller. Otherwise `403`.
- **Create**: always creates for the caller (`UserId` taken from the token, never from the body).
- **Update/Delete**: only the owner (Admin included for moderation) — managers get `403`.
- `recruitId` on list/dashboard/report endpoints is validated against the caller's overseen set.
- UI hiding is cosmetic only; the same checks run server-side.

---

## 6. Validation rules

Shared:
- `date` is required and may not be more than 1 day in the future; not before 2000-01-01.
- Enum values must be one of the allowed values (400 with `validation_error` otherwise).

| Field | Rule |
| --- | --- |
| Task/Issue/Note `title`, Feedback `subject` | required, trimmed, 1..200 chars |
| Task/Issue `description`, Feedback `details` | optional, max 2000 chars |
| Note `content` | optional, max 5000 chars |
| Issue `resolutionNotes` | optional, max 2000 chars |
| Note `tags` | max 10 tags, each 1..30 chars, no commas |
| Auth `email` | required, valid email, max 200, unique (409 `conflict` on duplicate signup) |
| Auth `password` | required, 8..100 chars |
| `fullName` | required, max 150 |
| `department` | optional, max 100 |
| Reports | `from` and `to` required, `from <= to`, range <= 366 days; `type`/`format` must match allowed values; `recruitId` authorization-checked |
| Pagination | `page >= 1`, `1 <= pageSize <= 100` |

---

## 7. UI flows

- **Login / Signup** (`/login`, `/signup`): unauthenticated only; on success the JWT + profile are
  stored in `localStorage` and the user is redirected to `/` (dashboard).
- **Protected shell**: `AppLayout` with responsive nav (permanent drawer >= md, temporary drawer on
  mobile), user menu with logout. `ProtectedRoute` redirects unauthenticated users to `/login`;
  `roles` prop restricts routes (e.g. `/recruits` is Manager/Admin only) and renders a "not authorised"
  state otherwise.
- **Recruit context**: Managers/Admins get a recruit selector in the header; selecting a recruit sets
  `recruitId` on every list/dashboard query and switches the UI to read-only for that recruit.
- **Dashboard** (`/`): summary cards (tasks by status + completion progress bar, open issues, feedback
  breakdown, notes count) and a recent-activity list.
- **Task log** (`/tasks`): filter bar (date range, category, status, search), paginated table on desktop
  / stacked cards on mobile, "New task" dialog with react-hook-form + zod, edit dialog, delete
  confirmation dialog.
- **Issue log** (`/issues`), **Feedback** (`/feedback`), **Notes** (`/notes`): same list/form/confirm
  pattern with slice-specific fields and filters (notes filter by tag chip).
- **Reports** (`/reports`): builder form (type, date range, format, recruit for Manager/Admin) that
  downloads the generated file via a blob response.
- Shared UI states: `LoadingState` (spinner), `EmptyState` (icon + message + optional action),
  `ErrorState` (message + retry). A 401 from the API clears the session and redirects to `/login`.

---

## 8. Conventions

- **Repo layout**: `/backend` (solution + `OnboardingDiary.Api` + `OnboardingDiary.Api.Tests`),
  `/frontend`, `/docs`, root `README.md`, `.editorconfig`, dev scripts in `/scripts`.
- **Backend**: layered `Controllers` / `Services` / `Data` / `Models` / `Dtos` / `Validation`;
  async controllers returning DTOs (entities are never exposed); FluentValidation validators registered
  per DTO; global exception middleware producing the error envelope; Serilog console logging;
  nullable + analyzers enabled, warnings as errors.
- **Frontend**: feature folders `src/features/<slice>/` (`api.ts`, `schema.ts`, pages, components),
  shared code in `src/shared/` (`api-client.ts`, `ui/`, `types.ts`), auth in `src/features/auth/`.
  TanStack Query for all server state; no server data in React state.
- **Naming**: PascalCase C# types, camelCase TS symbols, kebab-case frontend files/folders, plural
  route segments.
- **Dates**: ISO 8601 everywhere; storage in UTC; formatting only at the render layer.
- **Tooling**: ESLint + Prettier + TypeScript strict on the frontend, `dotnet format`/analyzers on the
  backend, xUnit + FluentAssertions (unit + `WebApplicationFactory` integration tests), Vitest +
  Testing Library on the frontend.
