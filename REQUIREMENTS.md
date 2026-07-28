# Onboarding Diary - Elaborated Requirements

Elaboration of [`SOURCE_REQUIREMENTS.md`](./SOURCE_REQUIREMENTS.md), which is the authoritative
scope. Nothing here adds features beyond the source; ideas that go beyond it are listed only in
[Section 8 - Open Questions / Assumptions](#8-open-questions--assumptions).

Roles referenced throughout: **New Recruit**, **Manager**, **Admin**.

**Decision (2026-07-28, spec extension):** [Section 9 - Extension: Search](#9-extension-search) is
new scope elaborated *beyond* `SOURCE_REQUIREMENTS.md` and beyond the original seven phases. It was
added after Phase 7 at the product owner's request, so "full-text search across all entry types",
previously listed as out of scope in Section 8.3, is now an approved extension with its own
requirements. Sections 1-8 are unchanged by it; nothing in Section 9 is implemented yet.

## Contents

1. [User Stories](#1-user-stories)
2. [Data Model](#2-data-model)
3. [Implementation Architecture](#3-implementation-architecture)
4. [REST API Endpoints](#4-rest-api-endpoints)
5. [UI Flows](#5-ui-flows)
6. [Validation Rules](#6-validation-rules)
7. [Non-Functional Notes](#7-non-functional-notes)
8. [Open Questions / Assumptions](#8-open-questions--assumptions)
9. [Extension: Search](#9-extension-search)

---

## 1. User Stories

### 1.1 New Recruit

**US-R01 - Sign up**
As a New Recruit, I want to sign up with my email and password, so that I can start recording my
onboarding journey.

- Sign-up form collects name, email, password, department, and start date.
- Email must be unique; a duplicate email returns a clear field-level error.
- Password is stored only as a hash, never in plain text.
- Role defaults to New Recruit on self sign-up.
- On success the user is authenticated and lands on the dashboard.

**US-R02 - Log in / log out**
As a New Recruit, I want to log in with my email and password, so that only I can see my entries.

- Valid credentials establish an authenticated session and redirect to the dashboard.
- Invalid credentials show a generic "invalid email or password" message (no user enumeration).
- Logging out ends the session and returns to the login page.
- Unauthenticated access to any diary page redirects to login.

**US-R03 - Manage my profile**
As a New Recruit, I want to view and edit my profile (name, role, department, start date), so that
my diary reflects accurate details about me.

- Profile page shows name, email, role, department, start date.
- Name, department, and start date are editable; email is read-only.
- Role is read-only for New Recruit and Manager; only an Admin can change a role.
- Validation errors are shown inline and no partial update is saved.

**US-R04 - Task Log CRUD**
As a New Recruit, I want to create, view, update, and delete task entries (date, title,
description, category, status, priority), so that I can track what I work on during onboarding.

- Create requires date, title, category, status, priority; description is optional.
- Category is chosen from the Admin-maintained category list (see US-A04).
- The list shows my own tasks only, most recent date first.
- Update preserves the owner and allows editing every field except the owner.
- Delete asks for confirmation and removes the entry permanently.
- Any attempt to read/edit/delete another user's task returns 403.

**US-R05 - Filter tasks**
As a New Recruit, I want to filter my task log by date, category, and status, so that I can find
relevant tasks quickly.

- Filters can be combined (AND semantics) and applied via a date range (from/to), category, status.
- The category filter offers the Admin-maintained category list.
- An empty result set shows an explanatory empty state, not an error.
- Active filters are reflected in the URL query string so a filtered view can be shared/bookmarked.

**US-R06 - Issue Log CRUD**
As a New Recruit, I want to create, view, update, and delete issue entries (date, title,
description, severity, status, resolution notes), so that blockers I hit are documented.

- Create requires date, title, severity, status; description and resolution notes are optional.
- Resolution notes are editable at any time and expected when status becomes Resolved/Closed.
- The list shows my own issues only, most recent date first.
- Update/delete restricted to the owner (and Admin); delete asks for confirmation.

**US-R07 - Filter issues**
As a New Recruit, I want to filter my issue log by status and severity, so that I can focus on
what is still open or most severe.

- Filters can be combined; results respect ownership rules.
- Active filters are reflected in the URL query string.

**US-R08 - Submit feedback notes**
As a New Recruit, I want to submit feedback notes (date, subject, type, details), so that I can
share what is going well and what could improve.

- Type must be one of Positive, Suggestion, Concern.
- Date, subject, type, and details are required.
- Submitted feedback appears in my feedback list and in dashboard counts.
- Feedback is visible to me, my overseeing Manager, and Admins.
- Only recruits author feedback: Managers and Admins can read feedback but cannot create it, and
  neither can comment on or annotate a recruit's entries.

**US-R09 - Additional notes CRUD with tags**
As a New Recruit, I want to create, view, update, and delete additional notes with tags (date,
title, content, tags), so that I can capture anything that does not fit the other logs.

- Create requires date, title, content; tags are optional and entered as a free-form list.
- Tags are normalised (trimmed, lower-cased, de-duplicated) before saving.
- Notes can be filtered/searched by tag.
- Update/delete restricted to the owner (and Admin).

**US-R10 - Dashboard summary**
As a New Recruit, I want a dashboard summarising my onboarding, so that I can see my progress at a
glance.

- Shows summary counts of tasks, issues, feedback notes, and additional notes.
- Shows task completion progress as completed tasks / total tasks over all time, with the
  percentage rounded to a whole number (0% when there are no tasks).
- Shows a list of open issues (status `OPEN` or `IN_PROGRESS`).
- Shows the 10 most recent entries across all four entry types, latest entry date first (ties
  broken by creation timestamp).
- Reflects only my own data.

**US-R11 - Generate and download my reports**
As a New Recruit, I want to generate a report for a date range and download it, so that I can share
my onboarding progress.

- The user selects a from/to date range and a format (PDF or CSV).
- The report contains tasks, issues, feedback, and notes whose entry date falls within the range.
- The file downloads with a descriptive filename including the recruit name and date range.
- An empty range produces a report with a "no entries" indication rather than an error.

### 1.2 Manager

**US-M01 - See my recruits**
As a Manager, I want to see the list of recruits I oversee, so that I know whose onboarding I am
responsible for.

- The list shows each recruit's name, department, start date, and last entry date.
- Recruits I do not oversee are never listed.

**US-M02 - View a recruit's entries**
As a Manager, I want to view the task, issue, feedback, and note entries of the recruits I oversee,
so that I can support them.

- Entry lists for an overseen recruit are read-only and support the same filters as the owner's view.
- Requesting entries of a recruit I do not oversee returns 403.

**US-M03 - View a recruit's dashboard**
As a Manager, I want to see the dashboard summary of a recruit I oversee, so that I can judge
progress without reading every entry.

- Same summary content as the recruit's own dashboard, scoped to that recruit, read-only.

**US-M04 - Generate reports for my recruits**
As a Manager, I want to generate and download date-range reports for the recruits I oversee, so
that I can review or share their progress.

- Report request specifies the recruit, the date range, and PDF or CSV.
- Reporting on a recruit I do not oversee returns 403.

**US-M05 - My own diary and profile**
As a Manager, I want the same profile management as any other user, so that my own details stay
accurate.

- Manager can view/edit own profile fields (name, department, start date) but not own role.

### 1.3 Admin

**US-A00 - Bootstrap Admin account**
As an Admin, I want an initial Admin account to exist on first startup, so that user management is
possible before any Admin can be created through the UI.

- On startup the application creates an Admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`,
  `ADMIN_DEPARTMENT`, `ADMIN_START_DATE` if no user with that email exists.
- The password is hashed like any other; it is never logged.
- If the variables are absent and no Admin exists, startup logs a clear warning.
- Re-running startup does not duplicate or overwrite the account.

**US-A01 - Manage users**
As an Admin, I want to create, view, edit, and deactivate user accounts, so that the right people
have the right access.

- Admin can set name, email, role, department (chosen from the department list), and start date on
  any user.
- Admin can change a user's role between New Recruit, Manager, and Admin.
- Deactivated users cannot log in; their entries are retained.
- Admin cannot remove their own Admin role if they are the last active Admin.

**US-A02 - Assign recruits to managers**
As an Admin, I want to assign and unassign recruits to managers, so that oversight relationships
are correct.

- A recruit may be overseen by zero or more managers; a manager may oversee zero or more recruits.
- Assignment changes take effect immediately for the manager's access.

**US-A03 - View all data**
As an Admin, I want to view all entries, dashboards, and reports across all users, so that I can
support and audit the onboarding process.

- Admin can list and read entries of any user with the same filters.
- Admin can generate any user's report in PDF or CSV.
- Admin can edit or delete any entry (used for correction/cleanup).

**US-A04 - Maintain task categories and departments**
As an Admin, I want to maintain the list of task categories and the list of departments, so that
recruits and user profiles select from consistent, meaningful values.

- Task categories start as: Development, Documentation, Meetings, Training, Support, Other.
- Departments start as: Engineering, Product, Design, Quality Assurance, IT / Operations, Human
  Resources, Finance, Sales, Marketing, Customer Support, Other.
- Admin can add new categories and departments; both lists are visible to all users as selectable
  options and only editable by Admin.
- A category or department that is already referenced by a task or user cannot be deleted; it can
  be deactivated so it no longer appears in selection lists while existing records keep their
  value.
- Names are unique (case-insensitive) within each list.

---

## 2. Data Model

Conceptual model - field names below are logical, not final column names. Every entity has a
surrogate primary key `id`, plus `created_at` / `updated_at` audit timestamps.

### 2.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | PK | surrogate key |
| `name` | text | required |
| `email` | text | required, unique, login identifier |
| `password_hash` | text | required, hashed (never plain text) |
| `role` | enum | `NEW_RECRUIT` \| `MANAGER` \| `ADMIN` |
| `department_id` | FK -> Department.id | required, from the Admin-maintained list |
| `start_date` | date | onboarding start date |
| `active` | boolean | deactivated users cannot log in |

### 2.2 TaskEntry

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `owner_id` | FK -> User.id | required, the recruit the entry belongs to |
| `entry_date` | date | required ("date" in source) |
| `title` | text | required |
| `description` | text | optional, long text |
| `category_id` | FK -> TaskCategory.id | required, from the Admin-maintained list |
| `status` | enum | `NOT_STARTED` \| `IN_PROGRESS` \| `BLOCKED` \| `COMPLETED` |
| `priority` | enum | `LOW` \| `MEDIUM` \| `HIGH` |

### 2.3 IssueEntry

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `owner_id` | FK -> User.id | required |
| `entry_date` | date | required |
| `title` | text | required |
| `description` | text | optional, long text |
| `severity` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `status` | enum | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` \| `CLOSED` |
| `resolution_notes` | text | optional, expected once resolved/closed |

### 2.4 FeedbackNote

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `owner_id` | FK -> User.id | required, author of the feedback |
| `entry_date` | date | required |
| `subject` | text | required |
| `type` | enum | `POSITIVE` \| `SUGGESTION` \| `CONCERN` |
| `details` | text | required, long text |

### 2.5 AdditionalNote

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `owner_id` | FK -> User.id | required |
| `entry_date` | date | required |
| `title` | text | required |
| `content` | text | required, long text |
| `tags` | set of text | optional; stored in a `note_tag` child table keyed by `note_id` |

**Delivery status (2026-07-28):** delivered in Phase 4. The child table is named `note_tag` (as in
the diagram in Section 2.9) with primary key (`note_id`, `tag`), so a note cannot hold the same
normalised tag twice.

### 2.6 TaskCategory (Admin-maintained lookup)

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `name` | text | required, unique (case-insensitive) |
| `active` | boolean | inactive categories are hidden from selection but keep existing references |

Seeded with: Development, Documentation, Meetings, Training, Support, Other.

### 2.7 Department (Admin-maintained lookup)

| Field | Type | Notes |
|---|---|---|
| `id` | PK | |
| `name` | text | required, unique (case-insensitive) |
| `active` | boolean | inactive departments are hidden from selection but keep existing references |

Seeded with: Engineering, Product, Design, Quality Assurance, IT / Operations, Human Resources,
Finance, Sales, Marketing, Customer Support, Other.

### 2.8 ManagerAssignment (join entity for oversight)

Needed because the Manager-to-Recruit oversight relationship is many-to-many.

| Field | Type | Notes |
|---|---|---|
| `id` | PK | (or composite PK of the two FKs) |
| `manager_id` | FK -> User.id | user with role `MANAGER` |
| `recruit_id` | FK -> User.id | user with role `NEW_RECRUIT` |
| `assigned_at` | timestamp | audit |

Unique constraint on (`manager_id`, `recruit_id`).

**Delivery status:** the table, entity and repository are delivered in Phase 3 as a read-only
dependency of the Manager-overseen read rules in Sections 4.2, 4.3 and 6.2. The Admin endpoints
that create and remove assignments (Section 4.8) are deferred to the admin phase.

### 2.9 Relationships

- `User` 1 - * `TaskEntry`, `IssueEntry`, `FeedbackNote`, `AdditionalNote` (via `owner_id`).
  Deleting a user cascades to their entries; in practice users are deactivated, not deleted.
- `AdditionalNote` 1 - * tag values.
- `TaskCategory` 1 - * `TaskEntry`; `Department` 1 - * `User`. Lookup rows are deactivated, not
  deleted, once referenced.
- `User` (Manager) * - * `User` (New Recruit) through `ManagerAssignment`.

```mermaid
erDiagram
    USER ||--o{ TASK_ENTRY : "owns"
    USER ||--o{ ISSUE_ENTRY : "owns"
    USER ||--o{ FEEDBACK_NOTE : "owns"
    USER ||--o{ ADDITIONAL_NOTE : "owns"
    ADDITIONAL_NOTE ||--o{ NOTE_TAG : "has"
    TASK_CATEGORY ||--o{ TASK_ENTRY : "classifies"
    DEPARTMENT ||--o{ USER : "groups"
    USER ||--o{ MANAGER_ASSIGNMENT : "manager of"
    USER ||--o{ MANAGER_ASSIGNMENT : "recruit in"
```

---

## 3. Implementation Architecture

**Recommendation:** a single standard layered Spring Boot monolith exposing a REST API plus a
responsive server-delivered web frontend, backed by PostgreSQL.

- **Runtime/stack:** Java 17, Spring Boot 3.2, Spring Web, Spring Data JPA, Spring Security,
  Maven, PostgreSQL.
- **Layers:** `controller` (HTTP, DTO mapping, validation) -> `service` (business rules,
  authorization decisions, transactions) -> `repository` (Spring Data JPA interfaces) -> `entity`
  (JPA models). DTOs cross the controller boundary; entities never leave the service layer.
- **Frontend:** server-rendered Thymeleaf templates served by the same application, styled
  responsively. Controllers render pages; the REST API under `/api` backs both the pages and
  programmatic clients. No separate JavaScript build pipeline.
- **Authentication:** email/password with BCrypt hashing; login issues a JWT bearer token, and
  Spring Security validates it on every request (see Section 7 for how pages carry the token).
- **Reports:** generated in the service layer and streamed to the client as a file download. The
  libraries are decided (D6, 2026-07-28): PDF via Apache PDFBox (`org.apache.pdfbox:pdfbox`,
  Apache-2.0) and CSV via Apache Commons CSV (`org.apache.commons:commons-csv`, Apache-2.0). Both
  are Apache-2.0, so the licence preference stated here is met directly.
- **Persistence:** PostgreSQL with schema managed by versioned migration scripts so schema changes
  are reviewable and repeatable. Local development runs PostgreSQL via Docker Compose; automated
  tests run against an in-memory database, never the dev instance.
- **Bootstrap Admin:** on startup the application ensures an Admin account exists, created from
  environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_DEPARTMENT`,
  `ADMIN_START_DATE`). Existing accounts are left untouched.
- **Rationale:** the domain is a handful of CRUD aggregates with role-based read scopes and a
  reporting endpoint. A layered monolith gives clear separation of concerns with one build, one
  deployment, and one database - no service boundaries, message brokers, caches, or client-side
  build pipeline to justify. Spring Data JPA removes most persistence boilerplate, and Spring
  Security covers email/password auth and role checks out of the box.

---

## 4. REST API Endpoints

All paths are prefixed `/api`. Request/response shapes are described at a high level. Unless noted,
responses are JSON, `401` is returned when unauthenticated and `403` when the role/ownership check
fails.

Authorization shorthand:

- **Owner** - the authenticated user acting on their own data (any role).
- **Manager (overseen)** - a Manager acting on a recruit assigned to them; read-only.
- **Admin** - any user, any data.

### 4.1 Authentication and Profile

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| POST | `/api/auth/signup` | name, email, password, department, startDate | created user summary | Public |
| POST | `/api/auth/login` | email, password | user summary + JWT bearer token | Public |
| POST | `/api/auth/logout` | - | 204 (client discards the token; page sessions clear the token cookie) | Any authenticated |
| GET | `/api/me` | - | profile (name, email, role, department, startDate) | Any authenticated |
| PUT | `/api/me` | name, department, startDate | updated profile | Any authenticated (self) |

### 4.2 Task Log

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/tasks` | query: `userId?`, `dateFrom`, `dateTo`, `category`, `status`, paging | list of task summaries | Owner; Manager (overseen) and Admin may pass `userId` |
| POST | `/api/tasks` | date, title, description, category, status, priority | created task | Owner |
| GET | `/api/tasks/{id}` | - | task detail | Owner, Manager (overseen), Admin |
| PUT | `/api/tasks/{id}` | full task fields | updated task | Owner, Admin |
| DELETE | `/api/tasks/{id}` | - | 204 | Owner, Admin |

### 4.3 Issue Log

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/issues` | query: `userId?`, `status`, `severity`, `dateFrom?`, `dateTo?`, paging | list of issue summaries | Owner; Manager (overseen) and Admin may pass `userId` |
| POST | `/api/issues` | date, title, description, severity, status, resolutionNotes | created issue | Owner |
| GET | `/api/issues/{id}` | - | issue detail | Owner, Manager (overseen), Admin |
| PUT | `/api/issues/{id}` | full issue fields | updated issue | Owner, Admin |
| DELETE | `/api/issues/{id}` | - | 204 | Owner, Admin |

### 4.4 Feedback Notes

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/feedback` | query: `userId?`, `type?`, `dateFrom?`, `dateTo?`, paging | list of feedback summaries | Owner; Manager (overseen) and Admin may pass `userId` |
| POST | `/api/feedback` | date, subject, type, details | created feedback note | Owner, and only when the caller's role is New Recruit |
| GET | `/api/feedback/{id}` | - | feedback detail | Owner, Manager (overseen), Admin |
| PUT | `/api/feedback/{id}` | full feedback fields | updated feedback note | Owner, Admin |
| DELETE | `/api/feedback/{id}` | - | 204 | Owner, Admin |

**Delivery status (2026-07-28):** delivered in Phase 4 without paging; `GET /api/feedback` returns
the full filtered list ordered by entry date descending. The recruit-only create rule (Section 6.2)
is enforced in the service layer and returns `403` for Managers and Admins.

### 4.5 Additional Notes

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/notes` | query: `userId?`, `tag?`, `dateFrom?`, `dateTo?`, paging | list of note summaries | Owner; Manager (overseen) and Admin may pass `userId` |
| POST | `/api/notes` | date, title, content, tags[] | created note | Owner |
| GET | `/api/notes/{id}` | - | note detail incl. tags | Owner, Manager (overseen), Admin |
| PUT | `/api/notes/{id}` | full note fields incl. tags[] | updated note | Owner, Admin |
| DELETE | `/api/notes/{id}` | - | 204 | Owner, Admin |

**Delivery status (2026-07-28):** delivered in Phase 4 without paging. Unlike feedback, notes are
not role-restricted on create: any authenticated user may create their own notes. Tag count and tag
length are validated after normalisation and reported as a single `tags` field error, and the `tag`
filter is normalised the same way as stored tags so a search matches whatever case or padding the
caller types. The `/feedback` and `/notes` pages in Section 5.1 are not built yet; both entry types
are API-only so far.

**Correction (2026-07-28, Phase 6 audit):** the tag *count* limit is in fact enforced twice and the
first check runs before de-duplication - `@Size(max = 10)` on `NoteRequest.tags` rejects any request
carrying more than 10 raw tags, so 11 tags that would de-duplicate to 10 distinct values are
rejected with `$.errors.tags` instead of being accepted. The service-level check that counts after
de-duplication is therefore unreachable for lists longer than 10. Section 6.1 counts tags after
de-duplication, so the stricter raw-list check is a known deviation, not the documented rule.

### 4.6 Dashboard

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/dashboard` | query: `userId?` (defaults to self) | summary counts, task completion progress (completed / total tasks overall), open issues, 10 most recent entries (latest first) | Owner; Manager (overseen) and Admin may pass `userId` |

**Delivery status (2026-07-28):** delivered in Phase 5. The response carries `userId`, `counts`
(`tasks`, `issues`, `feedbackNotes`, `additionalNotes`), `taskCompletion` (`completedTasks`,
`totalTasks`, `percentComplete` rounded half-up to a whole number and `0` when there are no tasks),
`openIssues` (the same issue shape as Section 4.3, statuses `OPEN` and `IN_PROGRESS`) and
`recentEntries` (`type` of `TASK`/`ISSUE`/`FEEDBACK`/`NOTE`, `id`, `entryDate`, `title` - the
subject for feedback notes - and `createdAt`). Recent entries are ordered by entry date descending,
then creation timestamp, then id, so the order is stable when both timestamps tie. The `/dashboard`
page in Section 5.1 is still not built; the dashboard is API-only so far.

### 4.7 Reports

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/reports` | query: `userId?`, `dateFrom`, `dateTo`, `format=pdf\|csv` | file download (`application/pdf` or `text/csv`) with `Content-Disposition: attachment` | Owner; Manager (overseen) and Admin may pass `userId` |
| GET | `/api/reports/preview` | query: same as above, no `format` | JSON preview of report contents | Same as above |

**Delivery status (2026-07-28):** delivered in Phase 6. `dateFrom` and `dateTo` are required on both
endpoints and validated in `ReportService` as field errors (`$.errors.dateFrom` / `$.errors.dateTo`)
for a missing, badly formatted, reversed or future-reaching range; `format` is required for
downloads and must be `pdf` or `csv` (case-insensitive), otherwise `400` with `$.errors.format`.
The report covers the recruit's tasks, issues, feedback notes and additional notes whose
`entry_date` falls inside the inclusive range, taken from the same repository `search` methods the
entry lists use, and authorization is the shared `EntryAccessService.resolveListTarget` rule, so an
unknown `userId` is a `403` like everywhere else. Downloads carry
`Content-Disposition: attachment` with a descriptive filename
(`onboarding-report-<recruit-name>-<dateFrom>-to-<dateTo>.<pdf|csv>`). An empty range is a valid
report carrying "No entries in the selected date range" in both formats, never an error or an empty
body. The preview returns the same content as JSON plus a `totalEntries` count. The `/reports` page
in Section 5.1 is not built; reports are API-only.

### 4.8 Admin - User Management

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/users` | query: `role?`, `department?`, `active?`, paging | list of user summaries | Admin (Manager: restricted to overseen recruits via `/api/users/me/recruits`) |
| POST | `/api/users` | name, email, password, role, department, startDate | created user | Admin |
| GET | `/api/users/{id}` | - | user detail | Admin; Manager (overseen) |
| PUT | `/api/users/{id}` | name, role, department, startDate, active | updated user | Admin |
| GET | `/api/users/me/recruits` | - | list of recruits overseen by caller | Manager, Admin |
| POST | `/api/users/{managerId}/recruits` | recruitId | 201 assignment created | Admin |
| DELETE | `/api/users/{managerId}/recruits/{recruitId}` | - | 204 | Admin |

**Delivery status:** none of Section 4.8 is implemented yet. Admin user management and
assignment maintenance are deferred to the admin phase; Phase 3 only reads existing
`ManagerAssignment` rows (see Section 2.8).

**Decision (2026-07-28, Phase 7):** the Admin UI is deferred to a later dedicated phase together
with these endpoints. Phase 7 built the six recruit/manager pages only and deliberately added no
admin backend logic, so `manager_assignment` rows stay seeded directly in the database.

### 4.9 Reference Data (task categories and departments)

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/categories` | query: `active?` | list of task categories | Any authenticated |
| POST | `/api/categories` | name | created category | Admin |
| PUT | `/api/categories/{id}` | name, active | updated category | Admin |
| GET | `/api/departments` | query: `active?` | list of departments | Public (needed by signup) |
| POST | `/api/departments` | name | created department | Admin |
| PUT | `/api/departments/{id}` | name, active | updated department | Admin |

---

## 5. UI Flows

### 5.1 Pages and role authorization

| Page | Path | New Recruit | Manager | Admin |
|---|---|---|---|---|
| Login | `/login` | Yes (public) | Yes (public) | Yes (public) |
| Sign up | `/signup` | Yes (public) | Yes (public) | Yes (public) |
| Dashboard (own) | `/dashboard` | Yes | Yes | Yes |
| Profile | `/profile` | Yes | Yes | Yes |
| Task Log (own) | `/tasks` | Yes | Yes | Yes |
| Task detail/edit | `/tasks/{id}` | Own only | Own; read-only for overseen recruits | Any |
| Issue Log (own) | `/issues` | Yes | Yes | Yes |
| Issue detail/edit | `/issues/{id}` | Own only | Own; read-only for overseen recruits | Any |
| Feedback Notes | `/feedback` | Yes (create/edit own) | Read-only (own + overseen recruits) | Read-only (any) |
| Additional Notes | `/notes` | Yes | Yes | Yes |
| Reports | `/reports` | Own data only | Own + overseen recruits | Any user |
| My Recruits | `/recruits` | No | Yes | Yes |
| Recruit detail (read-only entries + dashboard) | `/recruits/{id}` | No | Overseen only | Any |
| User Management | `/admin/users` | No | No | Yes |
| Reference Data (categories, departments) | `/admin/reference-data` | No | No | Yes |

Unauthorized page access redirects to the caller's dashboard with an explanatory message;
unauthenticated access redirects to `/login`.

**Delivery status (2026-07-28, Phase 7):** six pages were built on top of the existing REST API -
`/dashboard`, `/tasks`, `/issues`, `/feedback`, `/notes` and `/reports` - alongside the `/login`,
`/signup` and `/profile` pages from Phase 2. Every page is a Thymeleaf shell that shares one
navigation fragment (`templates/fragments/layout.html`) and fetches its data from `/api/**` with
the HttpOnly `ACCESS_TOKEN` cookie (decision D4); no backend query, authorization or endpoint code
was added. `/` and a successful sign-up or login now land on `/dashboard` instead of `/profile`.
The Task Log page fills its category dropdown from `GET /api/categories`, and the Reports page
offers a date range with a JSON preview plus PDF and CSV downloads (one recruit per report).
Role gating follows the table above: the six pages are open to all three roles, the feedback
create/edit form is rendered only for New Recruits (Section 6.2), row actions appear only for the
owner or an Admin, and Managers and Admins get a recruit-id field that passes `userId` to the
list, dashboard and report endpoints.

**Not built in Phase 7:** `/recruits`, `/recruits/{id}`, `/admin/users` and
`/admin/reference-data`. The two admin pages are deferred with their backend (see Section 4.8), and
the My Recruits pages need `GET /api/users/me/recruits`, which is part of that same deferred admin
work - so the navigation has no Admin or My Recruits entry, and Managers reach an overseen
recruit's data by entering the recruit's user id. Entry lists are still unpaginated, so no paging
controls exist. Unauthorized page access is not redirected to the dashboard with a message: the
pages themselves are open to every role, and a forbidden `userId` surfaces as the API's `403`
message on the page.

### 5.2 Navigation

- **Login/Sign up** -> Dashboard on success.
- **Dashboard** is the hub: top navigation links to Task Log, Issue Log, Feedback, Notes, Reports,
  Profile; Managers/Admins also see My Recruits; Admins also see User Management and Reference
  Data.
- **Each log page** lists entries with filters, a "New entry" action opening a create form, and
  row actions for view/edit/delete (delete confirms first). Saving or cancelling returns to the
  list with filters preserved.
- **Reports page** takes a date range plus format and triggers a file download; Manager/Admin
  additionally pick the target user.
- **My Recruits** -> Recruit detail -> that recruit's read-only entry lists and dashboard, with a
  shortcut into Reports pre-filled for that recruit.

```mermaid
flowchart TD
    L["Login / Sign up"] --> D["Dashboard"]
    D --> P["Profile"]
    D --> T["Task Log"]
    D --> I["Issue Log"]
    D --> F["Feedback Notes"]
    D --> N["Additional Notes"]
    D --> R["Reports"]
    D --> MR["My Recruits (Manager, Admin)"]
    D --> AU["User Management (Admin)"]
    D --> AR["Reference Data (Admin)"]
    T --> TD["Task detail / edit"]
    I --> ID["Issue detail / edit"]
    F --> FD["Feedback detail"]
    N --> ND["Note detail / edit"]
    MR --> RD["Recruit detail (read-only)"]
    RD --> R
```

---

## 6. Validation Rules

### 6.1 Field-level

**User / profile**

- `name`: required, 1-100 characters.
- `email`: required, valid email format, unique, max 255 characters, stored lower-case.
- `password`: required on signup, minimum 8 characters; never returned by the API.
- `role`: required, one of `NEW_RECRUIT`, `MANAGER`, `ADMIN`.
- `department`: required, must reference an active department from the Admin-maintained list.
- `start_date`: required, valid date.

**TaskEntry**

- `entry_date`: required, valid date.
- `title`: required, 1-150 characters.
- `description`: optional, max 5000 characters.
- `category`: required, must reference an active task category from the Admin-maintained list.
- `status`: required, one of `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`.
- `priority`: required, one of `LOW`, `MEDIUM`, `HIGH`.

**IssueEntry**

- `entry_date`: required, valid date.
- `title`: required, 1-150 characters.
- `description`: optional, max 5000 characters.
- `severity`: required, one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `status`: required, one of `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
- `resolution_notes`: optional, max 5000 characters.

**FeedbackNote**

- `entry_date`: required, valid date.
- `subject`: required, 1-150 characters.
- `type`: required, one of `POSITIVE`, `SUGGESTION`, `CONCERN`.
- `details`: required, 1-5000 characters.

**AdditionalNote**

- `entry_date`: required, valid date.
- `title`: required, 1-150 characters.
- `content`: required, 1-10000 characters.
- `tags`: optional, at most 10 tags, each 1-30 characters, trimmed, lower-cased, de-duplicated.

**TaskCategory / Department (reference data)**

- `name`: required, 1-50 characters, unique case-insensitively within its list.
- `active`: required boolean; a referenced row may be deactivated but not deleted.

**Report / filter parameters**

- `dateFrom` and `dateTo`: required for reports, valid dates, `dateFrom <= dateTo`.
- `format`: required for downloads, one of `pdf`, `csv`.
- Enum filters must match the allowed values above; unknown values return `400`.

### 6.2 Business rules

- Only the owner of an entry, or an Admin, may update or delete it. Managers have strictly
  read-only access to their recruits' data and cannot comment on entries.
- Only users with role New Recruit may create feedback notes.
- Only an Admin may create, rename, or deactivate task categories and departments.
- A Manager may read entries, dashboards, and reports only for recruits assigned to them; any other
  target returns `403`.
- A New Recruit may only ever access their own data.
- `userId` on list/dashboard/report endpoints defaults to the caller; supplying another user's id
  requires Manager (overseen) or Admin rights.
- Only an Admin may change a user's role, activate/deactivate accounts, or create/remove
  manager-to-recruit assignments.
- A user cannot be assigned as manager of themselves; assignments must be unique per
  (manager, recruit) pair.
- The last active Admin cannot be deactivated or demoted.
- Deactivated users cannot log in; their existing entries remain readable by Managers/Admins.
- Date sanity: entry dates may not be in the future; entry dates should not precede the owner's
  start date (rejected as a validation error). Report ranges may not exceed the current date.
- Issue status `RESOLVED` or `CLOSED` requires non-empty `resolution_notes`.
- Email is immutable after creation for non-Admin users.

---

## 7. Non-Functional Notes

- **Responsive web:** the UI is responsive and usable on phone, tablet, and desktop widths; all
  pages including tables and forms remain operable on small screens.
- **Authentication mechanism (decided):** email/password authentication with server-side password
  hashing (BCrypt) and a stateless JWT bearer token issued on login. API clients send
  `Authorization: Bearer <token>`; Thymeleaf pages carry the same token in an HttpOnly, SameSite
  cookie set at login and cleared at logout. Tokens are short-lived (assumed 8 hours) and signed
  with a secret supplied by environment variable. Role-based authorization is enforced server-side
  on every endpoint; client-side checks are cosmetic only.
- **Environment:** local development is the deployment target - one Spring Boot process plus a
  PostgreSQL container started with Docker Compose (standard naming: service `db`, database
  `onboarding_diary`, user `onboarding_diary`, port `5432`, credentials from environment
  variables). Configuration lives in `application.yml` plus environment variables, including the
  bootstrap Admin variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_DEPARTMENT`,
  `ADMIN_START_DATE`) and the JWT signing secret. No cloud, container orchestration, or CI/CD
  requirements are assumed.
- **Reporting library:** PDF export uses Apache PDFBox and CSV export uses Apache Commons CSV, both
  Apache-2.0 and licence-verified before they were added (D6, 2026-07-28).
- **Testing expectations:**
  - Unit tests for service-layer business logic: validation rules, authorization decisions
    (ownership and oversight), dashboard aggregation, report content assembly.
  - Integration tests for REST endpoints covering happy paths, validation failures (`400`),
    unauthenticated (`401`) and forbidden (`403`) cases, and report downloads (content type and
    disposition).
  - Tests run against an in-memory database (H2 in PostgreSQL compatibility mode) so the suite
    needs no external setup and never touches the Docker Compose dev database.
- **Observability/performance:** standard application logging; entry lists are paginated and
  filtered in the database. No specific latency or scale targets are stated in the source.

---

## 8. Open Questions / Assumptions

### 8.1 Assumptions made

1. Enum values for task status/priority, issue status/severity are not enumerated in the source;
   the sets in Section 6 are assumed.
2. Task `category` is a fixed, Admin-maintained list seeded with Development, Documentation,
   Meetings, Training, Support, Other (confirmed by the product owner). `department` is likewise
   an Admin-maintained list seeded with a basic set plus Other, and Manager access to recruit data
   is strictly read-only with only New Recruits creating feedback (both confirmed). Reference-data
   rows are deactivated rather than deleted once referenced (assumed).
3. Self sign-up creates a New Recruit; Manager and Admin accounts are created or promoted by an
   Admin.
4. Manager-to-Recruit oversight is many-to-many and maintained by Admins.
5. Authentication is JWT-based (confirmed by the product owner, see Section 7). Token lifetime
   (8 hours) and delivery to Thymeleaf pages via an HttpOnly cookie are assumed.
6. Feedback notes are authored by recruits about their onboarding and are visible to their Manager
   and Admins; the source does not state visibility explicitly.
7. Reports cover all four entry types for one user over a date range; PDF is a formatted document,
   CSV is one section/row set per entry type.
8. Entry dates are not allowed in the future and not before the owner's start date.
9. `resolution_notes` is required once an issue is Resolved/Closed.
10. Admins may edit/delete any entry for correction purposes; the source only states they can view
    all data.
11. Users are deactivated rather than deleted, so historical entries survive.
12. Tags are free-form strings, normalised to lower case; there is no managed tag vocabulary.
13. Timestamps/dates use the server's local date; no multi-timezone handling is assumed.
14. Only `ADMIN_EMAIL` and `ADMIN_PASSWORD` are strictly required to bootstrap the first Admin;
    `ADMIN_NAME`, `ADMIN_DEPARTMENT`, and `ADMIN_START_DATE` fall back to sensible defaults.
15. "Standard naming conventions" for local PostgreSQL are read as database/user
    `onboarding_diary` on port `5432` via Docker Compose service `db`.
16. The in-memory test database is H2 in PostgreSQL compatibility mode; if a feature needs
    PostgreSQL-specific SQL, that test moves to a throwaway container instead.

### 8.2 Open questions

1. Can a recruit have more than one Manager, and does a Manager also have a Manager?
2. Should reports be available for multiple recruits at once (e.g. a whole department), or one
   recruit per report?
3. Is email verification or password reset expected for the email/password flow?
4. Should deleting an entry be a soft delete for auditability?
5. Any data retention rules once onboarding completes?

**Answered (2026-07-28):** former question 6, "Which specific PDF library is licence-approved?", is
resolved and moved out of this list - PDF uses Apache PDFBox and CSV uses Apache Commons CSV, both
Apache-2.0 (decision D6 below). Questions 1-5 above are still open at the end of the project.

### 8.2.1 Resolved blockers (decisions)

All blockers previously listed here are resolved; coding can start.

| ID | Blocker | Decision | Reflected in |
|---|---|---|---|
| D1 | First Admin account | Created on startup from environment variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_DEPARTMENT`, `ADMIN_START_DATE`; idempotent, never overwrites an existing account | US-A00, Sections 3, 7 |
| D2 | Local database | PostgreSQL via Docker Compose with standard naming (service `db`, database/user `onboarding_diary`, port `5432`, credentials from environment variables) | Sections 3, 7 |
| D3 | Test database | Automated tests run against an in-memory database (H2 in PostgreSQL compatibility mode), never the Docker Compose dev instance | Section 7 |
| D4 | Auth mechanism | JWT bearer tokens (BCrypt password hashing); API clients use `Authorization: Bearer`, pages use an HttpOnly cookie holding the same token | Sections 3, 4.1, 7 |
| D5 | Frontend technology | Server-rendered Thymeleaf templates styled responsively; no separate JavaScript build | Sections 3, 5 |
| D6 | PDF/CSV library | PDF via Apache PDFBox (`org.apache.pdfbox:pdfbox`, Apache-2.0) and CSV via Apache Commons CSV (`org.apache.commons:commons-csv`, Apache-2.0); both licence-verified on 2026-07-28 and added to `pom.xml` in Phase 6 | Sections 3, 4.7, 7 |
| D7 | Dashboard definitions | Task completion progress = completed tasks / total tasks over all time; recent entries = the 10 most recent entries, latest first | US-R10, Section 4.6 |

### 8.3 Proposed but out of scope

These are ideas that go beyond `SOURCE_REQUIREMENTS.md`. They are recorded here only and are not
part of the scope unless explicitly added to the source requirements.

- Email or in-app notifications (e.g. reminders for overdue tasks, alerts on critical issues).
- Comment threads or manager replies on entries.
- File/screenshot attachments on entries.
- ~~Full-text search across all entry types.~~ **Promoted to approved scope on 2026-07-28** - see
  [Section 9 - Extension: Search](#9-extension-search). Elaboration only; no code exists yet.
- Onboarding checklist templates auto-generating tasks for new recruits.
- Department- or cohort-level analytics for Admins.
- SSO / OAuth login, password reset by email, and multi-factor authentication.
- Calendar integration or a timeline visualisation of the onboarding journey.
- Bulk import/export of entries beyond the specified PDF/CSV reports.
- Audit log of who viewed a recruit's data.

---

## 9. Extension: Search

New scope beyond `SOURCE_REQUIREMENTS.md` and beyond the original seven phases, elaborated on
2026-07-28. This section is specification only - no search entity, migration, endpoint, query or
page exists yet. It follows the structure of Sections 1-8: user stories with acceptance criteria,
data model impact, API, UI, validation and assumptions. Everything here reuses the ownership and
scope model of Sections 4 and 6.2 (owner scope, Manager-overseen scope, Admin full scope, `403` for
anything out of scope).

### 9.1 User Stories

#### 9.1.1 New Recruit

**US-S01 - Search my own entries**
As a New Recruit, I want to type words into a search box and see every entry of mine that contains
them, so that I can find something I wrote without remembering which log it went into.

- The search covers my Task Log, Issue Log, Feedback Notes and Additional Notes (Section 9.2).
- Matching is case-insensitive and matches anywhere inside a field, not only at the start of a word.
- Results are grouped by entry type and, inside a group, ordered by entry date descending with the
  same tie-break as everywhere else (creation timestamp, then id).
- Only my own entries are ever returned; another user's matching entry is never shown, even when it
  contains the exact search term.
- Searching with a scope I am not allowed (any `userId` other than my own) returns `403`, matching
  Section 6.2.
- A query that matches nothing returns an empty result with a friendly "no results" state, not an
  error.
- Each result shows enough context to identify the entry (type, entry date, title/subject and a
  short excerpt of the matched text) and links to that entry on its existing page.

#### 9.1.2 Manager

**US-S02 - Search my own and my recruits' entries**
As a Manager, I want to search across my own entries and the entries of the recruits I oversee, so
that I can find a specific task, blocker, feedback note or note without opening each recruit's
lists.

- Without a target, the search covers my own entries only, exactly like US-S01.
- Supplying the user id of a recruit assigned to me via `ManagerAssignment` scopes the search to
  that recruit's entries; results are read-only, consistent with US-M02.
- Supplying the user id of a user not assigned to me - or an unknown user id - returns `403`, never
  `404`, matching the existing `EntryAccessService.resolveListTarget` behaviour (Sections 4.6, 4.7).
- Results from a recruit carry no action links that a Manager may not perform: view only, no edit or
  delete.

#### 9.1.3 Admin

**US-S03 - Search everything**
As an Admin, I want to search across all users' entries, so that I can locate any record in the
system for support or audit purposes.

- With no target, the search covers the Admin's own entries.
- With any user id, the search covers that user's entries; no assignment is required (US-A03).
- Results carry the same grouping, ordering and excerpt shape as for the other roles.

### 9.2 Scope of Search

Searchable entities and the fields matched in each:

| Entity | Fields searched |
|---|---|
| Task Log (`TaskEntry`) | `title`, `description` |
| Issue Log (`IssueEntry`) | `title`, `description`, `resolution_notes` |
| Feedback Notes (`FeedbackNote`) | `subject`, `details` |
| Additional Notes (`AdditionalNote`) | `title`, `content`, tag values (`note_tag.tag`) |

- A row matches when **any** one of its searched fields contains the query text
  (case-insensitively). `NULL` optional fields (task/issue `description`, `resolution_notes`) simply
  do not match.
- Issue `resolution_notes` and additional-note tags are in scope (product owner, 2026-07-28). A note
  matches when any one of its tags contains the query as a substring, so the note reached through
  the tag join is returned once however many of its tags match. This is looser than the existing
  `tag` filter on `GET /api/notes` (Section 4.5), which stays an exact match after normalisation;
  the two coexist, and because stored tags are already normalised to lower case, the query is
  lower-cased before it is compared with them.
- Not searched: enum values (`status`, `category`, `severity`, `type`, `priority`), dates, and user
  fields such as name or email.

**DESIGN DECISION - free-text only.** Search is *free text only* for the first iteration. It is
deliberately **not** combined with the existing enum filters (task `status`/`category`, issue
`status`/`severity`, feedback `type`) or with date ranges. The search endpoint accepts a query
string and an optional scope target, nothing else. Combining free text with the existing per-entity
enum filters is deferred as possible future scope (Assumption A4, Section 9.7): it multiplies the
parameter surface by four entity types on a single global endpoint and there is no stated need for
it yet, while the per-entity list endpoints already offer those filters on their own.

### 9.3 Data Model Impact

**No new tables, no new columns, no new entities.** Search reads the existing `task_entry`,
`issue_entry`, `feedback_note`, `additional_note` and `note_tag` tables through the existing
repositories, so there is nothing to migrate on the entity side. `note_tag` is already mapped as an
`@ElementCollection` on `AdditionalNote` and is already joined by the existing `tag` filter, so the
tag half of the note query is a `join` over that same collection with `distinct` applied so a note
whose tags match several times is returned once.

**Recommended architecture - plain SQL `LIKE`/`ILIKE` against the existing tables.** Each of the
four repositories gains one query in the same style as the existing null-tolerant `search` methods
(Phases 3-4), of the form `lower(field) like lower(concat('%', :q, '%'))` across the entity's
searched fields OR-combined, plus the existing owner predicate. Case-insensitivity is expressed with
`lower(...)` on both sides rather than PostgreSQL's `ILIKE`, so the same JPQL keeps working on the
H2 test database (D3) exactly as the current queries do. Result assembly, grouping and the
authorization call live in a new `SearchService`, mirroring how `DashboardService` and
`ReportService` compose the four repositories.

**Indexing.** A leading-wildcard `LIKE` cannot use a standard B-tree index, so the recommendation
for PostgreSQL is a **trigram GIN index** per searched text column (`CREATE EXTENSION pg_trgm;` then
`CREATE INDEX ... USING gin (lower(title) gin_trgm_ops)` and the equivalent for the other searched
columns, `note_tag.tag` included), delivered as one new Flyway migration. Because the extension and the index type are
PostgreSQL-only while migrations have so far been deliberately portable ANSI SQL, the migration must
either be guarded so the H2 test database skips it, or the index creation must live in a
PostgreSQL-only migration path; the build phase decides which, and the decision is recorded then.

**Build note (2026-07-28).** The PostgreSQL-only migration path was chosen over guarding the SQL:
migration `V8__create_search_trigram_indexes.sql` lives in `db/migration-postgresql`, a sibling of
`db/migration` (Flyway scans a location recursively, so a subdirectory would not be skipped), and
only the application's `spring.flyway.locations` lists both paths. The H2 test database keeps
scanning `db/migration` alone and therefore never sees the extension or the GIN indexes.

Standard (non-trigram) indexes on the searched columns are the fallback if `pg_trgm` is unavailable:
they do not accelerate a leading wildcard, which is acceptable at the data volumes this application
targets (Section 7 states no scale targets).

**Explicitly NOT Elasticsearch (or any separate search engine).** Justification:

- **Volume.** The corpus is one department's onboarding diary - thousands of short rows, not
  millions of documents. PostgreSQL with trigram indexes answers this comfortably; a search cluster
  is orders of magnitude more capacity than the data needs.
- **Operational cost.** Elasticsearch adds a second datastore to run, secure, back up and version,
  against a stated deployment target of "local development - one Spring Boot process plus a
  PostgreSQL container" (Section 7). Section 3 explicitly rejects extra service boundaries, brokers
  and caches for exactly this reason.
- **Consistency.** A separate engine needs an indexing pipeline and becomes eventually consistent
  with the database, so a recruit could save an entry and not find it a second later. A SQL query
  is read-your-writes correct for free.
- **Authorization.** Ownership and Manager-oversight scoping (Section 6.2) are already SQL
  predicates joined against `manager_assignment`. Reproducing that scoping inside an external index
  means duplicating the authorization model - the most security-sensitive part of the system - in a
  second place.
- **Feature need.** The requirement is substring matching over eight short text columns. Ranking,
  stemming, fuzzy matching, synonyms and faceting - the reasons to adopt a search engine - are not
  asked for. If they are ever needed, PostgreSQL's built-in full-text search (`tsvector`/`tsquery`)
  is the next step before any external engine.

### 9.4 REST API Endpoints

Same conventions as Section 4: prefixed `/api`, JSON, `401` unauthenticated, `403` when the
role/ownership check fails.

**DESIGN DECISION - one global search endpoint.** A single endpoint queries all four entity types
and returns results grouped by type, rather than adding a `q` parameter to each of the four existing
list endpoints. One endpoint means one authorization call, one place for the minimum-length and
trimming rules, and one round trip for the global search bar (Section 9.5). No per-entity enum
filter parameters are accepted (Section 9.2).

| Method | Path | Request | Response | Auth / Role |
|---|---|---|---|---|
| GET | `/api/search` | query: `q` (required), `userId?` (defaults to the caller) | results grouped by entity type plus per-type and total counts | Owner; Manager (overseen) and Admin may pass `userId` |

Response shape (illustrative):

```json
{
  "query": "onboarding",
  "userId": 42,
  "totalResults": 3,
  "results": {
    "tasks":    [ { "id": 7, "entryDate": "2026-02-03", "title": "...", "excerpt": "..." } ],
    "issues":   [],
    "feedback": [ { "id": 2, "entryDate": "2026-02-01", "title": "...", "excerpt": "..." } ],
    "notes":    [ { "id": 9, "entryDate": "2026-01-28", "title": "...", "excerpt": "..." } ]
  }
}
```

**Build note (2026-07-28).** The illustrative shape above is refined by the implementation: each
group is an object rather than a bare array, `{ "count": n, "truncated": false, "items": [ ... ] }`,
so the per-type count and the per-group truncation flag required below travel with the group they
describe. `query` carries the trimmed, whitespace-collapsed query, and each item is
`{ type, id, entryDate, title, excerpt }`.

- `title` carries the entity's headline field (`subject` for feedback notes), matching the
  `recentEntries` convention of Section 4.6, so clients render one result shape for all four types.
- `excerpt` is a short snippet of the matched text; the matched term is not highlighted server-side.
- Every group is always present, empty when it has no matches, so clients need no null handling.
- `userId` is resolved by the existing `EntryAccessService.resolveListTarget`, so behaviour is
  identical to `/api/dashboard` and `/api/reports`: the caller's own id by default, an overseen
  recruit or any user for an Admin, and `403` for anything else including an unknown id.
- `401` when unauthenticated; `400` with `$.errors.q` when the query fails the Section 9.6 rules.
- Not paginated in this iteration, consistent with every other list in the application (Section 9.6
  caps the result count instead).

### 9.5 UI

**DESIGN DECISION - one global search bar, not per-page search.** The search input lives in the
shared navigation fragment (`templates/fragments/layout.html`), so it is available on every
authenticated page, and it uses the existing nav styling and spacing rather than introducing a new
component style. Per-page search boxes are rejected: they would duplicate the control on six pages,
each one scoped to a single entity type, which contradicts the point of a global search, and the
existing per-page filters (Section 5.1) already handle per-entity narrowing.

| Page | Path | New Recruit | Manager | Admin |
|---|---|---|---|---|
| Search results | `/search` | Yes (own entries) | Yes (own + overseen recruits) | Yes (any user) |

- Submitting the nav search bar navigates to `/search?q=<query>` (plus `&userId=<id>` when a
  Manager or Admin has entered a target), so a search is shareable and bookmarkable exactly like the
  filtered list views of US-R05.
- `/search` is a Thymeleaf page in the Phase 7 style: a shell that shares the nav fragment and
  fetches `GET /api/search` with the `ACCESS_TOKEN` cookie (D4/D5). No new backend page logic beyond
  resolving the caller's profile for the navigation.
- Results are rendered as four labelled groups - Tasks, Issues, Feedback Notes, Additional Notes -
  each showing its count, with the group's rows listing entry date, title/subject and the excerpt.
  A group with no matches renders a short "No matching …" line rather than disappearing, so the
  covered scope stays visible.
- Every row links to the owning page (`/tasks`, `/issues`, `/feedback`, `/notes`) for the entry, and
  rows for another user's entries carry no edit or delete action.
- The search bar keeps the submitted query visible after navigation so the user can refine it.
- Manager/Admin targeting reuses the existing recruit-user-id field pattern of Phase 7 rather than a
  recruit picker, because `GET /api/users/me/recruits` is still part of the deferred admin phase
  (Section 4.8).
- Empty result state: a single friendly message ("No entries match \"<query>\"." plus a hint to try
  fewer or shorter words), never an error banner.
- Responsive like every other page (Section 7): the nav search bar collapses with the rest of the
  navigation on small screens.

### 9.6 Validation Rules

**Search parameters**

- `q`: required. Missing, empty or whitespace-only `q` is a `400` with `$.errors.q`, in the
  `FieldValidationException` shape used by the rest of the API.
- `q` is trimmed before anything else, and internal runs of whitespace are collapsed to a single
  space, so `"  onboarding  "` and `"onboarding"` are the same search.
- Minimum length **2 characters after trimming**. A shorter query is a `400` with `$.errors.q`
  ("Search query must be at least 2 characters"), because a single character matches almost every
  row through a leading-wildcard `LIKE` and is never a useful search. The nav search bar disables
  submission below the same threshold so the common case never reaches the server.
- Maximum length 100 characters after trimming; longer is a `400` with `$.errors.q`.
- The whole trimmed query is matched as one literal substring - it is not split into words, and
  there are no operators (no `AND`/`OR`/quoting/wildcards). The SQL wildcards `%` and `_` and the
  escape character in a user's query are escaped so they match literally rather than acting as
  wildcards.
- `userId`: optional, defaults to the caller; validated by the existing scope rules, `403` when out
  of scope (Sections 6.2, 9.4).
- No enum, date, category, severity or type parameters are accepted; supplying one is ignored rather
  than rejected, so adding them later is not a breaking change.

**Results**

- An empty result set is a `200` with all four groups empty and `totalResults: 0` - never a `404`
  and never an error (US-S01).
- Each entity group is capped at 50 rows and the response reports whether a group was truncated, so
  a very broad query cannot return an unbounded payload while the application remains unpaginated
  (Assumption A5).
- Excerpts are capped at roughly 200 characters and taken around the first match in the first
  matching field.

### 9.7 Open Questions / Assumptions (Search)

Following the Section 8 pattern.

**Assumptions made**

- **A1** - Search results respect exactly the same scope model as the entry lists: owner scope by
  default, Manager access only to assigned recruits, Admin access to everyone, `403` otherwise. No
  new authorization concept is introduced.
- **A2** - Substring (`LIKE '%q%'`) semantics are what users expect here, rather than word/stemmed
  matching. The source requirements say nothing about search semantics.
- **A3** - Matching is case-insensitive and accent-sensitive; no locale-specific collation or
  accent folding is assumed.
- **A4** - **Combining free text with the existing enum filters (task `status`/`category`, issue
  `status`/`severity`, feedback `type`) and with date ranges is deferred as possible future scope.**
  The first iteration is free-text only (Section 9.2). When it is picked up, the natural shape is
  either per-entity filter parameters on `/api/search` or a `q` parameter added to the four existing
  list endpoints; that choice is deliberately not made now.
- **A5** - Result sets are small enough that a per-type cap (50) is an acceptable substitute for
  paging, matching the unpaginated state of every other list endpoint. If paging is added
  application-wide (the standing Phase 3-7 known issue), `/api/search` adopts the same mechanism -
  most likely per-group paging, since one global page number across four heterogeneous groups is
  ambiguous.
- **A6** - Relevance ranking is not required: results are ordered by entry date descending within
  each group, like every other list, rather than by a match score.
- **A7** - Searching is a read-only operation and is not audited; there is no saved-search or
  search-history feature.
- **A8** - Trigram (`pg_trgm`) indexes are available on the PostgreSQL deployment. If the extension
  cannot be enabled, the fallback is plain indexes and unindexed substring scans (Section 9.3).
- **A9** (product owner, 2026-07-28, answers former Q1) - Issue `resolution_notes` and
  additional-note tag values **are** in scope and are part of the field set in Section 9.2. Tags are
  matched as substrings through the existing `note_tag` join, which is deliberately looser than the
  exact-match `tag` filter on `GET /api/notes`; both behaviours coexist.
- **A10** (product owner, 2026-07-28, answers former Q2) - A search targets **one user at a time**.
  A Manager searches their own entries by default and one overseen recruit at a time by passing that
  recruit's `userId`; there is no "all my recruits at once" mode. A cross-recruit search with results
  labelled by recruit is deferred as possible future scope (Q6 below).

**Answered - not being built now**

These are decided; they simply require no work in the first iteration. They are recorded here rather
than as open questions so the build session does not re-open them.

- **Q3 - Highlighting the matched term in the excerpt: no** (product owner, 2026-07-28). Search
  stays simple: the excerpt is plain text, with no server-side markup and no client-side
  highlighting, so nothing about the pages' text-only rendering has to change.
- **Q4 - Threshold for moving to PostgreSQL full-text search (`tsvector`): none set** (product
  owner, 2026-07-28). Initial data volume is not expected to be large enough to cause a performance
  problem, so substring matching with the Section 9.3 indexing stands until a performance issue is
  actually observed; the question is parked, not scheduled.
- **Q5 - Soft-deleted entries: no special handling** (product owner, 2026-07-28). Soft delete does
  not exist (Section 8.2 question 4 is still open), so search simply returns whatever rows the
  tables hold. If soft delete is ever introduced, the exclusion belongs to that change and applies
  to search along with every other list.

**Open questions**

- **Q6** - Should a Manager eventually be able to search across *all* of their overseen recruits at
  once (no `userId`, results labelled by recruit)? Deferred to future scope by A10; nothing is built
  for it now.
