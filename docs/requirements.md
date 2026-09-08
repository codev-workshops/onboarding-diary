# Onboarding Diary Application — Elaborated Requirements

Version 0.3 — expands the original brief with user stories, domain model, API contract, UI
flows, validation rules, non-functional requirements, and proposed extensions, and is aligned
with every decision locked since v0.2 and with what is implemented in the repository.

**How to read this document.** Every requirement carries one of three provenance markers, and
§11 lists them in full:

| Marker | Meaning |
|---|---|
| **[SRC]** | Comes from the original customer brief. |
| **[DEC]** | An approved assumption or decision taken during elaboration (see §11.2 and the [ADRs](adr/README.md)). |
| **[OUT]** | Explicitly out of scope for the MVP (§11.3). |

Unmarked prose is elaboration of a marked requirement.

---

## 1. Product Summary

A responsive web application where new recruits document their onboarding journey (tasks,
issues, feedback, notes), managers monitor progress and generate reports, and admins manage
users and org-wide data.

**Primary outcomes**
- Recruits have one place to record daily onboarding work and blockers.
- Managers get visibility into recruit progress without status meetings.
- The organisation gets structured feedback to improve the onboarding programme.

---

## 2. Personas & Roles

| Role | Description | Scope of data access |
|---|---|---|
| **Recruit** | New hire in their onboarding period | Own entries only (full CRUD) |
| **Manager** | Owns one or more recruits | Strictly read-only on entries of assigned recruits; reports for those recruits |
| **Admin** | HR / platform owner | Full read on all data; manages users, manager assignments and department assignment |

Role is a single value per user (no multi-role in v1). Admin may act on any recruit's data but
does not author diary entries.

### Permission matrix

| Action | Recruit | Manager | Admin |
|---|---|---|---|
| Create/edit/delete own entries | Yes | n/a | No |
| Read own entries | Yes | n/a | Yes (all) |
| Read assigned recruits' entries | No | Yes (read-only) | Yes (all) |
| Generate report for self | Yes | n/a | Yes |
| Generate report for a recruit | No | Assigned only | Any |
| Create/deactivate users, assign managers | No | No | Yes |
| Assign departments to users | No | No | Yes |

---

## 3. User Stories (with acceptance criteria)

### Epic A — Authentication & Profile
- **A1** As a visitor, I can sign up with email + password so I can start my diary.
  - AC: email must be unique and valid; password ≥ 10 chars with at least one letter and one
    digit; on success I am logged in and land on the dashboard.
  - AC: self sign-up creates a `Recruit`; manager/admin accounts are created by an admin.
- **A2** As a user, I can log in and stay signed in across page refreshes. **[SRC]**
  - AC: login returns a JWT access token (60 minutes) in the response body; the SPA sends it
    back as `Authorization: Bearer <token>` **[DEC — ADR-006]**.
  - AC: no authentication cookie, no `/auth/refresh`, no refresh-token storage or rotation
    **[OUT]**.
  - AC: the SPA holds the token in auth state and mirrors it into `sessionStorage` so a page
    refresh keeps the session; `localStorage` is never used **[DEC — ADR-006]**.
  - AC: an expired or invalid token yields 401 and the user signs in again.
  - AC: invalid credentials return a generic "invalid email or password" (no user enumeration).
- **A3** As a user, I can view and edit my profile (name, department, start date; role is
  read-only unless admin). **[SRC]**
  - AC: department is selected from the managed `Department` list, not typed free-text
    **[DEC]**.
- **A4** As a user, I can log out. **[SRC]**
  - AC: logout is client-side — the SPA discards the access token; there is no server-side
    session or token revocation **[DEC — ADR-006]**.
- **A5** As a user, I can change my own password by supplying the current one. **[SRC]**
  - Out of scope: admin-issued temporary passwords, admin password reset, self-service password
    reset, email verification, any mailer **[OUT]**.

### Epic B — Task Log
- **B1** As a recruit, I can create a task entry with date, title, description, category,
  status, priority.
- **B2** As a recruit, I can edit or delete my own task entries.
  - AC: delete removes the row (hard delete); there is no global soft-delete mechanism. Any
    feature that needs different behaviour states it explicitly **[DEC]**.
- **B3** As a recruit, I can filter/sort my tasks by date range, category, status, priority and
  free-text search on title/description.
- **B4** As a recruit, I can mark a task `DONE` in one click from the list view.
- **B5** As a manager, I can view (not edit) tasks of my assigned recruits.

### Epic C — Issue Log
- **C1** As a recruit, I can log an issue with date, title, description, severity, status,
  resolution notes.
- **C2** As a recruit, I can update an issue's status and add resolution notes.
  - AC: moving to `RESOLVED` or `CLOSED` requires non-empty resolution notes.
  - AC: `resolved_at` is set automatically on transition to `RESOLVED`.
- **C3** As a recruit/manager, I can filter issues by status and severity.
- **C4** As a manager, I can see open issues for my recruits ordered by severity then age.

### Epic D — Feedback Notes
- **D1** As a recruit, I can submit feedback with date, subject, type (Positive / Suggestion /
  Concern), details.
- **D2** As a manager/admin, I can browse feedback for my scope filtered by type and date.

### Epic E — Additional Notes
- **E1** As a recruit, I can capture free-form notes with date, title, content, tags.
- **E2** As a recruit, I can filter notes by tag and search note content.

### Epic F — Dashboard
- **F1** As a recruit, my dashboard shows: total/open/done task counts, task completion
  percentage, open issues by severity, counts of feedback and notes, and the 5 most recent
  entries across all categories.
  - AC: progress is `done tasks / total tasks`; there is no time-based onboarding period or
    end date anywhere in the product.
- **F2** As a manager, my dashboard lists my recruits with per-recruit completion %, open issue
  count, and days since last entry (a staleness signal).
- **F3** As an admin, the dashboard shows org-wide totals and per-department breakdown.

### Epic G — Reports
- **G1** As a recruit, I can generate a report for a date range covering tasks, issues,
  feedback, or a combined report.
- **G2** As a manager, I can generate the same report for any assigned recruit.
- **G3** I can download the report as **PDF** or **CSV**.
  - AC: CSV for a combined report is a zip of one CSV per section, or a single CSV with a
    `section` column (decision: single CSV with `section` column for simplicity).
  - AC: PDF includes header (recruit name, department, date range, generated timestamp),
    summary counts, and per-section tables.
- **G4** Reports respect role scoping.
  - AC: reports are generated synchronously on request; there are no persisted report jobs,
    queues or report history **[DEC]**.

---

## 4. Domain Model

```
Department      id, name(unique), is_active

User            id, email(unique), password_hash, full_name, role,
                department_id(FK Department), start_date,
                manager_id(FK User, nullable), is_active,
                created_at, updated_at

TaskEntry       id, user_id(FK), entry_date, title, description, category,
                status, priority, created_at, updated_at

IssueEntry      id, user_id(FK), entry_date, title, description, severity,
                status, resolution_notes, resolved_at,
                created_at, updated_at

FeedbackEntry   id, user_id(FK), entry_date, subject, type, details,
                created_at, updated_at

NoteEntry       id, user_id(FK), entry_date, title, content,
                created_at, updated_at

NoteTag         id, note_id(FK NoteEntry), tag        -- SQLite has no array type
```

`Department` is managed reference data — `Department(id, name, is_active)` — and `User`
references it through `department_id`. Department is never a free-text profile field **[DEC]**.
Tables arrive with the milestone that implements their slice (§10); only `User` and
`Department` exist today.

### Enumerations

The API serialises enums as their readable names, e.g. `"role": "Recruit"` **[DEC]**.

- `Role`: `Recruit | Manager | Admin`
- `TaskCategory`: `TRAINING | SETUP | MEETING | DOCUMENTATION | CODING | SHADOWING | OTHER`
- `TaskStatus`: `TODO | IN_PROGRESS | BLOCKED | DONE`
- `Priority`: `LOW | MEDIUM | HIGH`
- `IssueSeverity`: `LOW | MEDIUM | HIGH | CRITICAL`
- `IssueStatus`: `OPEN | IN_PROGRESS | RESOLVED | CLOSED`
- `FeedbackType`: `POSITIVE | SUGGESTION | CONCERN`

### Indexes
`(user_id, entry_date)` on every entry table; `(user_id, status)` on tasks and issues;
`(tag, note_id)` on `note_tags`; unique index on `users.email` (stored lower-cased, since SQLite
lacks a portable case-insensitive unique index).

---

## 5. Validation Rules

Applied on the server (source of truth) and mirrored in the client for UX.

**Common to all entries**
- `entry_date`: required, ISO date, not in the future, not more than 365 days in the past.
- `title` / `subject`: required, 3–120 chars, trimmed.
- `description` / `details` / `content`: optional except where noted, ≤ 5000 chars.
- Ownership: a recruit may only write entries where `user_id == current_user.id`.

**Tasks** — `category`, `status`, `priority` must be valid enum values; default
`status=TODO`, `priority=MEDIUM`.

**Issues** — `severity` required; `resolution_notes` required (≥ 10 chars) when status is
`RESOLVED` or `CLOSED`; status transitions restricted to
`OPEN → IN_PROGRESS → RESOLVED → CLOSED` (plus reopen `RESOLVED|CLOSED → OPEN`).

**Feedback** — `details` required, 10–5000 chars; `type` required.

**Notes** — `content` required; `tags` ≤ 10 items, each 1–24 chars, lowercased and
de-duplicated server-side.

**Users** — email RFC-5322-ish + unique (case-insensitive); password ≥ 10 chars, must contain a
letter and a digit, checked against a small common-password denylist; `start_date` required for
recruits; `department_id` must reference an active department; a manager cannot be their own
manager and manager chains may not form cycles.

**Departments** — seeded reference data: `name` required, 2–60 chars, unique
(case-insensitive); only active departments may be assigned to a user.

**Reports** — `from` ≤ `to`; range ≤ 366 days; `format ∈ {pdf, csv}`;
`sections ⊆ {tasks, issues, feedback, notes}` (default: all).

---

## 6. API Specification

Base path `/api/v1`. JSON, `Authorization: Bearer <access_token>` unless noted; enum-valued
fields are readable strings (`"Recruit"`, `"Manager"`, `"Admin"`).
Errors use RFC 7807 problem+json (ASP.NET Core `ProblemDetails`):
`{type, title, status, detail, errors{}}`.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | public — `{email, password, full_name, department_id, start_date}` |
| POST | `/auth/login` | public — returns `{access_token, expires_at, user}` in the response body |
| POST | `/auth/change-password` | authenticated — `{current_password, new_password}` |
| GET | `/me` | current profile |
| PATCH | `/me` | update `full_name`, `department_id` (and `start_date` for recruits) |

There is no logout endpoint: logout discards the token in the client **[DEC — ADR-006]**.

### Entries (identical shape for `tasks`, `issues`, `feedback`, `notes`)
| Method | Path | Notes |
|---|---|---|
| GET | `/tasks` | filters: `from`, `to`, `category`, `status`, `priority`, `q`, `user_id` (manager/admin), `page`, `page_size` (≤100), `sort` (`-entry_date` default) |
| POST | `/tasks` | recruit only |
| GET | `/tasks/{id}` | owner, assigned manager (read-only), or admin |
| PATCH | `/tasks/{id}` | owner only |
| DELETE | `/tasks/{id}` | owner only, hard delete |

`/issues` filters: `from`, `to`, `status`, `severity`, `q`, `user_id`.
`/feedback` filters: `from`, `to`, `type`, `user_id`.
`/notes` filters: `from`, `to`, `tag`, `q`, `user_id`.

List responses: `{items: [...], page, page_size, total}`.

### Dashboard
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard` | role-aware payload (recruit summary, manager roster, or admin org view); optional `user_id` for manager/admin |

### Reports
| Method | Path | Notes |
|---|---|---|
| GET | `/reports/preview` | `?user_id&from&to&sections=` → JSON used to render the on-screen preview |
| GET | `/reports/download` | same params + `format=pdf|csv` → binary stream with `Content-Disposition` |

### Admin
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/users` | filters: `role`, `department_id`, `is_active`, `q` |
| POST | `/admin/users` | create user with role and department |
| PATCH | `/admin/users/{id}` | role, `department_id`, `manager_id`, `is_active` |
| GET | `/admin/stats` | org-wide counts |

`GET /departments` is available to any authenticated user (and unauthenticated for the signup
form) so department pickers can be populated.

**Status codes**: 200/201 success, 204 delete, 400 validation, 401 unauthenticated,
403 out-of-scope, 404 not found (also used instead of 403 when leaking existence would be
sensitive), 409 conflict (duplicate email), 422 semantic validation, 429 rate limited.

---

## 7. UI Flows & Screens

**Navigation** — top bar (app name, user menu) + left sidebar: Dashboard, Tasks, Issues,
Feedback, Notes, Reports, plus Team (manager) and Admin (admin). Collapses to a bottom nav on
mobile (≤ 640 px).

1. **Sign up → onboarding profile → dashboard.** After signup the user completes department and
   start date, then lands on an empty-state dashboard prompting "Log your first task".
2. **Task list.** Filter bar (date range, category, status, priority, search) + table on desktop
   / cards on mobile. "New task" opens a modal form; inline status dropdown per row; row click
   opens detail drawer with edit/delete.
3. **Issue list.** Same pattern; severity shown as a coloured chip; resolving an issue opens a
   dialog that requires resolution notes.
4. **Feedback.** Simple list plus a composer with a type selector.
5. **Notes.** Card grid, tag chips act as one-click filters, full-text search box.
6. **Dashboard.** Stat cards (tasks total/done/%, open issues by severity, feedback count),
   a 30-day activity chart, and a "recent activity" feed merging all four entry types.
7. **Reports.** Pick recruit (manager/admin), date range preset (this week / last 30 days /
   custom), section checkboxes, live preview, then Download PDF / Download CSV.
8. **Team (manager).** Roster table: recruit, department, completion %, open issues, last
   activity; click through to that recruit's read-only diary.
9. **Admin.** User table with create/edit drawer (role, department, manager assignment,
   activate/deactivate). Departments are seeded reference data; a Department CRUD UI is out of
   scope **[OUT]**.

**States** — every list has explicit loading (skeleton), empty (illustration + primary action),
and error (retry) states. Destructive actions require confirmation. Toasts confirm mutations.

**Accessibility** — WCAG 2.1 AA: keyboard-navigable forms and modals, focus trapping, labelled
inputs, colour contrast ≥ 4.5:1, severity/status conveyed by text as well as colour.

---

## 8. Proposed Additional Features

Recommended for Step 3 ("add at least two features"):

1. **Onboarding checklist templates** — admin defines a per-department checklist (e.g. "Day 1:
   accounts, laptop, buddy intro"); a recruit applies one to themselves, which generates ordinary
   tasks dated from their start date, and the dashboard shows checklist completion separately from
   ad-hoc tasks. *(highest value — approved; the data model and rules are in the implementation
   plan, M7 Extension 1)*

   Approved boundaries: application is recruit-initiated (no manager or admin assignment in this
   extension); generated tasks are a snapshot, so later template edits never change them; a
   `ChecklistAssignment` row with a unique `(user_id, template_id)` index means the same template
   can never be applied twice, even if every generated task is deleted; progress counts the
   assignment's generated tasks, not the current template definition; and task CRUD is unchanged,
   so a deleted checklist task is never silently re-created.
2. **Analytics charts / enhanced manager visibility** — a `GET /api/v1/dashboard/trends` endpoint
   plus three hand-written SVG charts (entries per day, issues opened vs resolved, task
   completion status) on the recruit dashboard and read-only on the team recruit detail view.
   *(approved; the scope and date-basis rules are in the implementation plan, M7 Extension 2)*

   Approved boundaries: no new tables (only a nullable `completed_at` on `task_entries`), no
   charting library, no organisation-wide analytics, and no change to manager permissions.
   Diary counts bucket by the recruit-chosen `entry_date`; completion and resolution bucket by
   the UTC date of their lifecycle timestamp, because the application has no timezone model.
3. **Global search** — one search box across all four entry types. *(candidate extension,
   deliberately **out of scope** for this exercise; nothing is implemented)*
4. **Export** — full personal data export as JSON.
5. **In-app nudges** — "you haven't logged an entry in 3 days" banner (in-app only, no email).
6. **Attachments** — screenshots/files on issues (needs file storage; defer unless time).

Excluded by decision: manager comments/acknowledgement, weekly digest email, and anything
requiring outbound email.

---

## 9. Non-Functional Requirements

- **Backend**: .NET 10, ASP.NET Core **Minimal APIs**, EF Core, JWT bearer authentication.
  Endpoints grouped per feature (`MapTaskEndpoints`, `MapIssueEndpoints`, …) with typed results
  and FluentValidation-style request validation; PDF via QuestPDF, CSV via CsvHelper.
- **Frontend**: React + TypeScript + Vite + React Router (data router with route-level loaders
  and guards), Tailwind for styling.
- **Database**: **SQLite** (single file, `backend/data/onboardingdiary.db`) via EF Core; all
  schema changes through EF Core migrations; departments are seeded, users are not.
  Note the SQLite constraints already reflected above: no array columns (tags are a child
  table), case-insensitive uniqueness handled by storing lower-cased emails, and dates stored as
  ISO-8601 text.
- **Security**: ASP.NET Core Identity password hashing (`PasswordHasher<User>`, PBKDF2),
  bearer-only JWT access tokens with no refresh tokens and no authentication cookie (and
  therefore no credentialed CORS and no CSRF middleware), rate limiting on auth endpoints via
  the built-in rate limiter (5 attempts / 15 min / IP), server-side authorisation policies on
  every endpoint (`RecruitOnly`, `ManagerOrAdmin`, `AdminOnly`, plus per-entry ownership and
  assignment checks), EF Core parameterised queries only, CORS restricted to the app origin.
  No email-based flows exist, so no mail transport or reset-token storage is required.
- **Performance**: list endpoints paginated (default 20, max 100); p95 < 300 ms for list
  queries on 10k entries; report generation < 5 s for a 12-month range.
- **Testing**: xUnit unit tests for validation and permission rules, integration tests per
  endpoint using `WebApplicationFactory` against an in-memory/temp-file SQLite database, Vitest +
  React Testing Library on the front end, and end-to-end happy paths (signup → log task →
  generate report). Target ≥ 80% coverage on service/permission layers.
- **Quality gates**: lint + type check + tests in CI on every PR.
- **Observability**: structured JSON logs with request id; `/healthz` endpoint.
- **Responsive**: usable at 360 px width upward.

---

## 10. Delivery Plan (incremental)

| Milestone | Content |
|---|---|
| M0 | Repo scaffold (`/backend` .NET solution, `/frontend` Vite app), CI, SQLite + EF Core migrations, health check, seed data |
| M1 | Auth + profile + departments + role guards |
| M2 | Task log (API + UI + filters) + basic dashboard |
| M3 | Issue log, feedback, notes |
| M4 | Manager team view + admin user management |
| M5 | Reports: preview, CSV, PDF |
| M6 | Responsive UI polish + end-to-end verification |
| M7 | Extensions: checklist templates, analytics charts (global search out of scope) |

Work happens directly on `main`; each milestone lands with its tests. See
[implementation-plan.md](implementation-plan.md) for the detailed breakdown.

---

## 11. Provenance

### 11.1 Original source requirements **[SRC]**

From the customer brief: recruits log daily tasks, record issues, provide feedback and capture
notes; managers view recruits' entries and generate downloadable reports; authenticated,
role-based access; a dashboard summarising progress; a responsive web UI; persistent storage.

### 11.2 Approved assumptions and decisions **[DEC]**

1. **Stack** — Backend: .NET 10, ASP.NET Core Minimal APIs, EF Core. Frontend: React +
   TypeScript + Vite + React Router + Tailwind. Database: SQLite
   ([ADR-002](adr/ADR-002-frontend-and-backend-stack.md),
   [ADR-003](adr/ADR-003-database-choice.md)).
2. **Authentication** — JWT access token in the login response body, sent as
   `Authorization: Bearer`, 60-minute lifetime, client-side logout, token in memory mirrored to
   `sessionStorage` ([ADR-006](adr/ADR-006-bearer-token-transport.md), superseding
   [ADR-004](adr/ADR-004-authentication-strategy.md)).
3. **Managers are read-only** on assigned recruits' entries — no editing and no commenting.
4. **Department is managed reference data** — `Department(id, name, is_active)` referenced by
   `User.department_id`; seeded, and admins assign it to users.
5. **Deletes are hard deletes** — no global soft-delete architecture; per-feature behaviour is
   stated with the feature.
6. **Reports are synchronous** — generated on request as CSV or PDF, with no persisted report
   jobs or history.
7. **Enums are serialised as readable strings** in API payloads (`"Recruit"`, `"Manager"`,
   `"Admin"`).
8. **Progress is task completion percentage** — no fixed onboarding end date and no time-boxed
   onboarding period.
9. **No SSO** — email + password only.
10. **Work happens on `main`**, with schema arriving per milestone.

### 11.3 Out of scope **[OUT]**

- Refresh tokens, refresh-token storage, rotation, reuse detection, token-family revocation.
- Authentication cookies, credentialed CORS, CSRF middleware.
- Admin-issued temporary passwords, admin password reset, self-service password reset, email
  verification, weekly digests, any mailer or outbound email.
- SSO.
- Anonymous feedback.
- Global soft delete.
- Department CRUD UI.
- Manager comments or edits on recruit entries.
