# Onboarding Diary Application Specification

- **run_id:** `20260715-115254-onboarding-diary`
- **spec_revision:** `null`
- **status:** `READY_FOR_APPROVAL`
- **source BRD:** `.sdd/runs/20260715-115254-onboarding-diary/input/Onboarding_Diary_App_Requirements.pdf`
- **source clarifications:** `.sdd/runs/20260715-115254-onboarding-diary/plan/clarifications.json`
- **approval policy:** Human approval required before generation

## 1. Problem and outcomes

New recruits need a responsive web application for recording onboarding tasks, issues, feedback, and notes. Managers need to maintain and report on diary entries for assigned recruits. Administrators need full diary access, user management, and assignment management.

The MVP outcomes are:

1. Recruits maintain only their own profile and diary entries.
2. Managers maintain diary entries and generate reports only for recruits assigned to them.
3. Administrators maintain users, assignments, and all diary entries.
4. Authorized users see scoped dashboard summaries.
5. Authorized users download scoped task, issue, feedback, or combined reports.
6. The application runs on React/Vite/Tailwind, FastAPI, and intentionally ephemeral in-memory SQLite.

## 2. Actors and authorization

| Actor | Account provisioning | Profile access | Diary access | Reporting |
|---|---|---|---|---|
| Recruit | Public sign-up always creates a Recruit | View/edit own name, email, department, and start date; cannot change role or assignments | Create/view/edit/delete own entries | Own records |
| Manager | Created by an Admin | Same self-profile rules; cannot change role or assignments | Create/view/edit/delete entries owned by assigned recruits | Assigned recruits |
| Admin | Initial Admin is bootstrapped from required environment variables; later Admin accounts are created by an Admin | View/edit users, roles, and assignments | Create/view/edit/delete all entries | Any recruit |
| Unauthenticated visitor | Sign up as Recruit or log in | None | None | None |

Admins create, replace, or remove manager-to-recruit assignments. A recruit may have zero or one assigned manager in the MVP. The backend enforces authorization on every resource and download; UI visibility is not an authorization control.

## 3. Scope

### MVP scope

- Email-as-username/password sign-up, login, logout, and eight-hour server-side sessions.
- Profiles containing name, email, role, department, and start date.
- Full CRUD for tasks, issues, feedback, and notes under the role rules above.
- Task filters by date, category, and status; issue filters by status and severity.
- Scoped dashboard counts, recent entries, task progress, and open issues.
- Inclusive date-range reports for tasks, issues, feedback, or combined data.
- PDF and CSV report downloads.
- Responsive Chromium behavior at mobile and desktop viewports.
- Consistent validation, authorization, empty, and failure states.

### Explicitly deferred post-MVP

`REQ-018`, `E006`, `E006-S001`, `E006-S002`, and `G-H` are retained as stable planning IDs but are not generation scope, are not prerequisites for MVP completion, and are absent from MVP execution waves. The two extension features will be selected and specified only after the core MVP is implemented, evaluated, and approved.

### Non-goals

- Production deployment, durable storage, microservices, queues, caches, scheduled reports, or third-party integrations.
- MFA, password reset, email verification, external identity providers, account lockout, or audit export.
- Search, charts, onboarding checklists, or any other extension until post-MVP planning.

## 4. Mandated architecture

- Frontend: React with Vite.
- Styling: Tailwind CSS.
- Backend: Python FastAPI exposing a JSON REST API under `/api`.
- Database: one SQLite in-memory database owned by the backend process.
- Data lifetime: all users, sessions, assignments, and diary records may be lost whenever the backend restarts.
- Process model: one backend process for the MVP; multi-worker operation is out of scope because independent in-memory databases would diverge.
- Initial Admin: on each empty startup, create one Admin from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`; fail startup with a clear configuration error if either is absent.

## 5. Authentication and security contract

- Email is the unique, case-insensitive login identifier.
- Public sign-up accepts Recruit profile fields and always assigns role `Recruit`; client-supplied role or assignment fields are rejected.
- Admin-created users require the same profile fields and password rules; the Admin selects the role.
- Passwords are 8–128 characters and stored using PBKDF2-HMAC-SHA256 with a per-password random salt and at least 310,000 iterations; plaintext passwords are never stored, returned, or logged.
- Login creates a cryptographically random opaque session ID stored server-side and sent in an `HttpOnly`, `SameSite=Lax` cookie. The cookie is `Secure` when HTTPS is used and expires after eight hours.
- Logout invalidates the server-side session and clears the cookie.
- Invalid credentials always return the same generic `401` response. No lockout is required for this local MVP.
- Mutating requests are same-origin. Cross-origin credentialed access is disabled; Vite development uses a same-origin proxy to FastAPI.

## 6. Data and validation contract

All IDs are backend-generated integer IDs. Dates use ISO `YYYY-MM-DD`; timestamps use UTC ISO-8601. Leading/trailing whitespace is trimmed before validation. Dates need only be valid calendar dates; past and future dates are allowed.

| Entity | Required fields and rules |
|---|---|
| User | email: valid basic email pattern, unique case-insensitively, max 254; name: 1–100; department: 1–100; start_date: valid date; role: `Recruit`, `Manager`, or `Admin`, server/admin controlled |
| Task | date; title 1–120; description 0–2000; category `Training`, `Setup`, `Meeting`, `Project`, or `Other`; status `Not Started`, `In Progress`, `Completed`, or `Blocked`; priority `Low`, `Medium`, or `High` |
| Issue | date; title 1–120; description 1–2000; severity `Low`, `Medium`, `High`, or `Critical`; status `Open`, `In Progress`, `Resolved`, or `Closed`; resolution_notes 0–2000 and required for `Resolved` or `Closed` |
| Feedback | date; subject 1–120; type `Positive`, `Suggestion`, or `Concern`; details 1–2000 |
| Note | date; title 1–120; content 1–5000; zero to ten tags; each tag trimmed, lowercased, case-insensitively unique, and 1–30 characters |

PATCH updates are partial. Unknown fields and immutable IDs/owner IDs are rejected. Deletion is permanent because the database is ephemeral and no audit requirement exists.

## 7. Minimal JSON REST API

Successful JSON responses return the resource directly; collections return arrays without pagination. Validation errors use `422`; unauthenticated requests `401`; authenticated but unauthorized requests `403`; absent resources `404`; duplicate email or invalid state conflicts `409`; successful deletion/logout `204`; unexpected failures `500`.

Errors use:

```json
{"error":{"code":"stable_code","message":"safe user-facing message","fields":{"field":"message"}}}
```

`fields` is optional. `500` responses never expose stack traces.

### Endpoints

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/profile`, `PATCH /api/profile`
- Admin: `GET/POST /api/admin/users`, `GET/PATCH/DELETE /api/admin/users/{user_id}`, `PUT/DELETE /api/admin/recruits/{recruit_id}/manager`
- CRUD: `/api/tasks`, `/api/issues`, `/api/feedback`, `/api/notes` with collection `GET/POST` and item `GET/PATCH/DELETE`
- `GET /api/dashboard`
- `GET /api/reports?recruit_id={id}&type={tasks|issues|feedback|combined}&start_date={date}&end_date={date}&format={pdf|csv}`

Recruit collection operations are implicitly scoped to self. Manager/Admin create requests include `owner_id`; manager ownership must be an assigned recruit. Manager/Admin dashboard requests may include `recruit_id`; recruit dashboards ignore/reject any other target. Collection results sort by `date DESC`, then `created_at DESC`, then `id DESC`. Task and issue filters are optional query parameters and combine with AND.

An Admin cannot delete the currently authenticated Admin or the last Admin account; either attempt returns `409`. Deleting any other user permanently deletes that user's owned diary records, sessions, and assignment links. Changing a role invalidates that user's sessions and removes assignment links that are no longer valid. Diary records otherwise remain owned by the user ID.

### UI flows

- Unauthenticated users see Login and Recruit Sign-up. Successful authentication opens the Dashboard.
- The authenticated shell exposes Dashboard, Tasks, Issues, Feedback, Notes, Reports, Profile, and Logout; Admin additionally sees Users & Assignments.
- Recruit diary pages show the user's own sorted list, supported filters, an Add form, and Edit/Delete actions.
- Manager/Admin diary and dashboard pages first require a permitted recruit selection; all lists/forms then remain scoped to that recruit.
- Create/Edit uses one page or modal with inline validation. Delete requires confirmation and returns to the refreshed list.
- Profile displays role read-only for self-service and allows only name, email, department, and start date edits.
- Admin Users & Assignments supports user create/edit/delete and manager assignment replacement/removal with the section 7 safeguards.
- Reports requires recruit selection where applicable, report type, inclusive dates, and PDF/CSV format before download.
- Empty lists/dashboard/report results show explicit empty states; authentication and failure navigation follows section 10.

## 8. Dashboard contract

- Scope is one recruit: self for Recruit, a selected assigned recruit for Manager, and a selected recruit for Admin.
- Summary counts show total tasks, issues, feedback entries, and notes in scope.
- Recent activity contains the latest ten records across all four diary types, ordered by `date DESC`, `created_at DESC`, then `id DESC`.
- Task completion is `Completed tasks / all tasks * 100`, rounded to the nearest whole percent; zero tasks displays `0%`.
- Open issues are those with status `Open` or `In Progress`.
- Empty scope displays zero counts and a clear empty state.

## 9. Report contract

- Reports target exactly one recruit and apply the same authorization scope as dashboard/diary access.
- Start and end dates are inclusive; start after end is `422`.
- Type-specific reports contain:
  - Tasks: date, title, description, category, status, priority.
  - Issues: date, title, description, severity, status, resolution notes.
  - Feedback: date, subject, type, details.
- Combined reports use the superset columns: date, record_type, title_or_subject, details, category, status, priority, severity, resolution_notes, feedback_type.
- Rows sort by `date ASC`, then `record_type ASC`, then `id ASC`.
- CSV is UTF-8 with a header row and RFC 4180 quoting.
- PDF contains the app/report title, recruit name, inclusive date range, generation timestamp, and a readable table using the same logical columns.
- Empty results still download a valid artifact with headers/metadata and `No records found` in PDF.
- Filename: `onboarding-diary-{recruit-id}-{type}-{start-date}-to-{end-date}.{pdf|csv}`.

## 10. Responsive and failure behavior

- Required browser: current Playwright Chromium.
- Required viewports: mobile `390x844` and desktop `1280x720`.
- Core pages must have no page-level horizontal overflow; required controls remain reachable. Wide data tables may use a clearly bounded horizontal scroll region or mobile cards.
- Field validation appears next to the field and preserves other entered values.
- `401` clears local user state and sends the user to login; `403` shows an access-denied state; `404` shows a not-found state.
- Network or `500` failures show a generic retryable banner without clearing successful persisted state.
- Report failure produces no partial download and leaves report criteria available for retry.

## 11. Observability and recovery

The backend logs request method, route, status, and an opaque request ID. It must not log passwords, session IDs, report contents, or diary field values. Recovery from restart is to bootstrap a new empty database and Admin; durable restore is explicitly out of scope.

## 12. Acceptance strategy

- Backend integration tests for authentication, role/ownership authorization, validation, CRUD/filtering, dashboard calculations, restart loss, and report content.
- Frontend integration tests for forms, filters, role-gated navigation, empty states, and safe failures.
- Playwright scenarios for each active implementation group at both required viewports.
- Parser-based PDF/CSV content tests.
- Startup test proving missing bootstrap credentials fail clearly and configured startup creates an Admin.

Every normative requirement maps through epic, story, acceptance criterion, implementation group, and verification method in the JSON artifacts.

## 13. Decisions, assumptions, and approval

All material clarification questions are resolved in `clarifications.json`. Planner-selected details are limited to the expressly authorized simple judgments and are recorded in `decisions.md`. No undisclosed material assumption remains.

This package is `READY_FOR_APPROVAL`. Human plan approval is still required before generation, implementation, or tracker publication.
