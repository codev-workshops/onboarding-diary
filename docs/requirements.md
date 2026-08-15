# Onboarding Diary — Requirements

A responsive web application that lets new recruits document their onboarding journey (tasks, issues,
feedback, notes), gives managers oversight of their recruits, and gives admins full visibility plus
reporting.

- Frontend: React 18 + TypeScript + Vite, React Router, TanStack Query, MUI, react-hook-form + zod,
  Recharts for data visualisation.
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
10. As a recruit, I can see my candidate journey as a timeline of onboarding stages measured from my
    start date, so I understand how far along the programme I am.
11. As a recruit, I can see an onboarding checklist of my items grouped as completed / in progress /
    pending with an overall progress indicator.

### Any signed-in user
12. As any user, I can switch the application between light and dark theme; the choice is remembered
    between sessions and every screen, including charts, follows it.

### Manager
13. As a manager, I can see the list of recruits I oversee.
14. As a manager, I can read (but not modify) the tasks, issues, feedback and notes of my recruits by
    passing `recruitId` to the list endpoints.
15. As a manager, I can view a dashboard summary for a specific overseen recruit.
16. As a manager, I can generate PDF/CSV reports for an overseen recruit; requesting a recruit outside my
    overseen set returns `403`.
17. As a manager, my default dashboard compares my overseen recruits: task completion per recruit, open
    issues by severity and the feedback breakdown across the whole group.

### Admin
18. As an admin, I can list all users and their roles/managers.
19. As an admin, I can read any recruit's entries and generate reports for anyone.
20. As an admin, I sign in with the seeded credentials on a fresh database.
21. As an admin, my default dashboard shows org-wide activity over recent weeks plus the user
    distribution by role and by department.

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
| GET | `/api/dashboard/summary` | any | Aggregates for the caller or `recruitId`, including journey and checklist data. |
| GET | `/api/dashboard/manager` | Manager, Admin | Aggregates across the caller's overseen recruits. |
| GET | `/api/dashboard/admin` | Admin | Org-wide aggregates (activity, users by role/department). |
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
  "recentActivity": [ { "type": "Task", "id": 9, "title": "...", "date": "2026-08-14", "status": "Completed" } ],
  "startDate": "2026-06-01",
  "journey": {
    "startDate": "2026-06-01",
    "daysSinceStart": 74,
    "stages": [
      {
        "key": "Setup", "label": "Setup",
        "total": 4, "notStarted": 0, "inProgress": 1, "blocked": 0, "completed": 3,
        "completionPercent": 75, "status": "InProgress",
        "firstActivityDate": "2026-06-02", "lastActivityDate": "2026-06-10", "dayOffset": 1
      }
    ]
  },
  "checklist": {
    "total": 12, "completed": 6, "inProgress": 4, "pending": 2, "progressPercent": 50,
    "items": [
      { "id": 9, "title": "Set up laptop", "category": "Setup", "date": "2026-06-02",
        "state": "Completed", "isBlocked": false }
    ]
  }
}
```

Journey and checklist data is derived from the recruit's existing task entries — no new entities:

- One journey **stage** per `TaskCategory` the recruit has entries for, ordered by the first entry date
  in the stage. `dayOffset` is whole days from the recruit's `startDate` to that first entry, so the
  timeline can be laid out chronologically from day 0.
- Stage `status`: `Completed` when every task in the stage is completed, `Blocked` when any task is
  blocked, `InProgress` when any task is in progress or completed, otherwise `NotStarted`.
- **Checklist** items are task entries mapped to three states: `Completed` (task status `Completed`),
  `InProgress` (`InProgress` or `Blocked`, the latter flagged via `isBlocked`) and `Pending`
  (`NotStarted`). `progressPercent` is completed / total, rounded. The item list is capped at the 25
  most recent entries while the counters always cover every entry.

`GET /api/dashboard/manager` response (recruits limited to the caller's overseen set; every recruit for
an Admin):

```json
{
  "recruitCount": 3,
  "recruits": [
    { "recruitId": 3, "recruitName": "Nina Recruit", "department": "Engineering",
      "startDate": "2026-06-01", "taskTotal": 12, "taskCompleted": 6, "taskCompletionPercent": 50,
      "openIssues": 2 }
  ],
  "openIssuesBySeverity": { "low": 1, "medium": 2, "high": 0, "critical": 1 },
  "feedbackCounts": { "total": 9, "positive": 5, "suggestion": 3, "concern": 1 },
  "totals": { "tasks": 30, "completedTasks": 14, "openIssues": 4, "notes": 12 }
}
```

"Open" issues are the ones with status `Open` or `InProgress`.

`GET /api/dashboard/admin` response:

```json
{
  "userCount": 12,
  "usersByRole": [ { "role": "NewRecruit", "count": 9 } ],
  "usersByDepartment": [ { "department": "Engineering", "count": 5 } ],
  "activityByWeek": [ { "weekStartDate": "2026-06-01", "tasks": 10, "issues": 2, "feedback": 3, "notes": 4 } ],
  "totals": { "tasks": 120, "issues": 18, "feedback": 22, "notes": 31 }
}
```

`activityByWeek` covers the last 8 Monday-started weeks, oldest first, including weeks with no entries.
Users without a department are grouped under `"Unassigned"`.

---

## 5. Authorization rules (server-side, enforced in services)

- Every endpoint except `signup`/`login` requires a valid JWT.
- **Read**: allowed if the entry belongs to the caller, or the caller is an Admin, or the caller is a
  Manager and the entry owner's `ManagerId` is the caller. Otherwise `403`.
- **Create**: always creates for the caller (`UserId` taken from the token, never from the body).
- **Update/Delete**: only the owner (Admin included for moderation) — managers get `403`.
- `recruitId` on list/dashboard/report endpoints is validated against the caller's overseen set.
- `/api/dashboard/manager` requires the `Manager` or `Admin` role and only aggregates the caller's
  overseen recruits; `/api/dashboard/admin` requires the `Admin` role. Neither accepts a caller-supplied
  user set — the scope always comes from the token.
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
- **Dashboard** (`/`): role-aware. A recruit (or a Manager/Admin who has selected a recruit) sees the
  recruit dashboard: summary cards (tasks by status + completion progress bar, open issues, feedback
  breakdown, notes count), the candidate-journey visualisation, the onboarding checklist and a
  recent-activity list. A Manager with no recruit selected sees the manager dashboard, an Admin with no
  recruit selected sees the admin dashboard (see section 8).
- **Theme toggle**: an icon button in the `AppLayout` app bar cycles light/dark; see section 8.
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

## 8. Theming and visualisations

### 8.1 Light/dark theme

- The app supports a light and a dark theme built from the same MUI theme factory; the dark palette is
  a first-class palette, not a filter over the light one.
- The preference is persisted in `localStorage` under `onboarding-diary.theme` with values `light`,
  `dark` or `system`. When no preference is stored the app follows the OS setting
  (`prefers-color-scheme`) and keeps tracking OS changes until the user picks a mode explicitly.
- The toggle lives in the app bar of the protected shell and is available to every role.
- The whole app — surfaces, text, borders and **every chart** — renders from the active theme. Charts
  must resolve their colours from the MUI theme (palette, text and divider colours) through a shared
  helper; hardcoded hex colours inside chart components are not allowed. Switching mode re-renders the
  charts with the new palette without a page reload.

### 8.2 Charting library

- **Recharts** is the charting library: it is lightweight, React-first, ships TypeScript types and works
  with Vite/React 19 without extra build configuration. It is added once as a frontend dependency and
  reused by every dashboard; no second charting library may be introduced.
- Charts are wrapped in a `ResponsiveContainer` so they resize with their card, and every chart takes
  its colours from the theme helper described above.

### 8.3 Recruit dashboard — candidate journey

- The candidate-journey visualisation is the **primary visual** of the recruit dashboard, rendered above
  the checklist and the activity list.
- It shows onboarding progression as a timeline/flow of stages from the recruit's start date: each stage
  is a node on the timeline positioned by its `dayOffset` (day 0 = start date) and annotated with the
  stage label, its completion percentage and its status (not started / in progress / blocked /
  completed).
- Data required (all from `GET /api/dashboard/summary`): recruit `startDate`, and per stage — `key`,
  `label`, `dayOffset`, `firstActivityDate`, `lastActivityDate`, per-status counts, `completionPercent`
  and `status`.
- Status colours come from the theme's semantic palette (`success`, `warning`, `error`, `text.disabled`)
  so the visualisation is legible in both modes.
- When the recruit has no task entries yet the component renders the shared `EmptyState` instead of an
  empty chart.

### 8.4 Recruit dashboard — onboarding checklist

- A visually engaging card listing checklist items grouped as **completed / in progress / pending**,
  each with a status icon, title, category chip and date, plus a blocked marker where applicable.
- The card header carries an overall progress indicator (progress bar plus `completed / total` and the
  percentage) driven by `checklist.progressPercent`.

### 8.5 Manager dashboard

Fed by `GET /api/dashboard/manager`:

- **Task completion per recruit** — horizontal bar chart of completed vs remaining tasks per overseen
  recruit, so a manager can spot who is falling behind.
- **Open issues by severity** — bar chart across `Low`/`Medium`/`High`/`Critical` using the theme's
  severity colours.
- **Feedback breakdown** — donut/pie chart of positive / suggestion / concern across all overseen
  recruits.
- Supporting headline numbers (recruit count, total tasks, open issues) as summary cards.

### 8.6 Admin dashboard

Fed by `GET /api/dashboard/admin`:

- **Org-wide activity** — stacked area/bar chart of tasks, issues, feedback and notes per week for the
  last 8 weeks.
- **Users by role** — small pie/donut chart of the role distribution.
- **Users by department** — bar chart of user counts per department.

### 8.7 Charting restraint

- Every chart must answer a question a user actually has. Decorative charts, charts that restate a
  single number, gauges, 3-D effects and animations that carry no information are explicitly out of
  scope — prefer a summary card or a progress bar when a single value is all there is to show.
- All dashboards stay responsive: charts collapse to a single column below the `md` breakpoint and stay
  readable on mobile.

---

## 9. Conventions

- **Repo layout**: `/backend` (solution + `OnboardingDiary.Api` + `OnboardingDiary.Api.Tests`),
  `/frontend`, `/docs`, root `README.md`, `.editorconfig`, dev scripts in `/scripts`.
- **Backend**: layered `Controllers` / `Services` / `Data` / `Models` / `Dtos` / `Validation`;
  async controllers returning DTOs (entities are never exposed); FluentValidation validators registered
  per DTO; global exception middleware producing the error envelope; Serilog console logging;
  nullable + analyzers enabled, warnings as errors.
- **Frontend**: feature folders `src/features/<slice>/` (`api.ts`, `schema.ts`, pages, components),
  shared code in `src/shared/` (`api-client.ts`, `ui/`, `types.ts`), auth in `src/features/auth/`.
  TanStack Query for all server state; no server data in React state. Theme mode state lives in
  `src/features/theme/`, and chart colour resolution in a single shared hook consumed by all charts.
- **Naming**: PascalCase C# types, camelCase TS symbols, kebab-case frontend files/folders, plural
  route segments.
- **Dates**: ISO 8601 everywhere; storage in UTC; formatting only at the render layer.
- **Tooling**: ESLint + Prettier + TypeScript strict on the frontend, `dotnet format`/analyzers on the
  backend, xUnit + FluentAssertions (unit + `WebApplicationFactory` integration tests), Vitest +
  Testing Library on the frontend.
