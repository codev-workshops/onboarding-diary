# Business Requirements Document — Onboarding Diary Application

Status: Approved for v1 scope
Last updated: 2026-07-26

## 1. Project Overview

The Onboarding Diary is a responsive web application that lets new recruits document
their onboarding journey in one place. A recruit logs the tasks they complete, the
issues and blockers they hit, feedback about the onboarding process itself, and
free-form notes. Managers get visibility into the recruits they oversee and can
generate downloadable reports over a date range. Admins manage users and can see all
data.

Today this information lives in scattered spreadsheets, chat threads, and private
documents, so managers have no reliable view of a recruit's progress and the
organisation loses the feedback that new joiners are best placed to give.

## 2. Goals

### 2.1 Business goals
- **G1** — Give managers a single, current view of each recruit's onboarding progress
  without needing status-update meetings.
- **G2** — Capture onboarding friction (issues, blockers, suggestions) as structured
  data so the onboarding process can be improved over time.
- **G3** — Produce shareable, downloadable records (PDF/CSV) of an onboarding period
  for review and HR record-keeping.

### 2.2 Product goals
- **G4** — A recruit can log a day's activity in under two minutes.
- **G5** — A manager can answer "how is this recruit doing?" from a single dashboard
  screen.

### 2.3 Non-goals for v1
See [Section 8 — Out of Scope](#8-out-of-scope).

### 2.4 Success metrics
| ID | Metric | Target |
|----|--------|--------|
| M1 | Recruits with at least one entry logged in their first week | ≥ 80% |
| M2 | Median time to create a task entry | ≤ 2 min |
| M3 | Managers generating at least one report per recruit onboarding period | ≥ 50% |
| M4 | Open issues older than 5 days | trending down month over month |

## 3. User Personas

### P1 — Nadia, New Recruit
- Joined two weeks ago; unfamiliar with internal tooling and terminology.
- Needs to remember what she has done, what is blocking her, and who unblocked her.
- Wants a low-friction daily log, not a project-management tool.
- Cares about: speed of entry, being able to correct yesterday's entry, seeing her
  own progress.

### P2 — Marcus, Manager
- Oversees three to six recruits at a time alongside his own delivery work.
- Needs to spot blockers early and to show evidence of progress at review time.
- Reviews entries asynchronously, typically once every few days.
- Cares about: a per-recruit at-a-glance view, filtering by open issues, exporting a
  date-range report.

### P3 — Priya, Admin (HR / People Ops)
- Owns the onboarding programme across the company.
- Creates and deactivates accounts, assigns roles and manager relationships.
- Needs cross-recruit visibility to find systemic problems in onboarding.
- Cares about: correct user data, access to all entries, aggregate reporting.

## 4. Functional Requirements

Priority key: **MUST** = required for v1 release, **SHOULD** = desirable in v1,
**COULD** = only if time permits.

### 4.1 Authentication & Accounts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A1 | A visitor can sign up with full name, email, and password. Email must be unique and validated for format. | MUST |
| FR-A2 | Self-signed-up users receive the `RECRUIT` role. Only an Admin can grant `MANAGER` or `ADMIN`. | MUST |
| FR-A3 | Passwords must be at least 10 characters and are stored only as a salted hash. | MUST |
| FR-A4 | A registered user can log in with email and password and receives an authenticated session. | MUST |
| FR-A5 | A user can log out, invalidating their session on the client and refresh token server-side. | MUST |
| FR-A6 | A user can view and edit their own profile: name, department, start date. Role and email are not self-editable. | MUST |
| FR-A7 | An inactive (deactivated) user cannot log in and receives a generic failure message. | MUST |
| FR-A8 | Session expiry logs the user out gracefully and returns them to the login screen with their intended destination preserved. | SHOULD |

### 4.2 Task Log

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-T1 | A recruit can create a task entry with: date (required), title (required), description, category, status, priority. | MUST |
| FR-T2 | A recruit can edit any of their own task entries. | MUST |
| FR-T3 | A recruit can delete their own task entries, with a confirmation step. | MUST |
| FR-T4 | A recruit can list their task entries, newest date first, paginated. | MUST |
| FR-T5 | A recruit can filter the task list by date range, category, and status, in any combination. | MUST |
| FR-T6 | Category is one of: Setup, Training, Meeting, Documentation, Development, Other. | MUST |
| FR-T7 | Status is one of: Not Started, In Progress, Blocked, Done. Default: Not Started. | MUST |
| FR-T8 | Priority is one of: Low, Medium, High. Default: Medium. | MUST |
| FR-T9 | Entry date may be today or in the past; future dates are rejected with a clear message. | SHOULD |

### 4.3 Issue Log

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-I1 | A recruit can create an issue entry with: date (required), title (required), description, severity, status, resolution notes. | MUST |
| FR-I2 | A recruit can edit and delete their own issue entries. | MUST |
| FR-I3 | A recruit can list their issue entries, newest date first, paginated. | MUST |
| FR-I4 | A recruit can filter the issue list by status and severity, and by date range. | MUST |
| FR-I5 | Severity is one of: Low, Medium, High, Critical. Default: Medium. | MUST |
| FR-I6 | Status is one of: Open, In Progress, Resolved, Won't Fix. Default: Open. | MUST |
| FR-I7 | Resolution notes are optional but expected when status becomes Resolved or Won't Fix; the UI prompts for them. | SHOULD |

### 4.4 Feedback Notes

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-F1 | A recruit can submit a feedback note with: date (required), subject (required), type, details. | MUST |
| FR-F2 | Type is one of: Positive, Suggestion, Concern. | MUST |
| FR-F3 | A recruit can edit and delete their own feedback notes. | MUST |
| FR-F4 | A recruit can list and filter their feedback notes by type and date range. | MUST |

### 4.5 Additional Notes

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-N1 | A recruit can create a free-form note with: date (required), title (required), content, tags. | MUST |
| FR-N2 | Tags are a free-text list, normalised to lowercase and de-duplicated per note. | MUST |
| FR-N3 | A recruit can edit and delete their own notes. | MUST |
| FR-N4 | A recruit can filter notes by tag and date range. | MUST |

### 4.6 Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-D1 | A recruit's dashboard shows total counts for tasks, issues, feedback notes, and notes. | MUST |
| FR-D2 | The dashboard shows task completion progress: count and percentage of tasks by status. | MUST |
| FR-D3 | The dashboard shows open issues (status Open or In Progress) with severity breakdown. | MUST |
| FR-D4 | The dashboard shows the most recent five entries across all four categories, combined and date-ordered. | MUST |
| FR-D5 | A manager's dashboard lists their direct reports with per-recruit summary tiles (task progress, open issue count, last activity date). | MUST |
| FR-D6 | A manager can drill into a single recruit's read-only diary from their dashboard. | MUST |
| FR-D7 | An admin's dashboard shows organisation-wide counts and a searchable list of all users. | SHOULD |

### 4.7 Reports

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-R1 | A user can generate a report for a date range, selecting sections: tasks, issues, feedback, or combined. | MUST |
| FR-R2 | Reports can be downloaded as CSV (flat rows per section) and PDF (tabular summary with counts). | MUST |
| FR-R3 | A recruit can only generate reports over their own data. | MUST |
| FR-R4 | A manager can generate a report for any recruit they directly oversee. | MUST |
| FR-R5 | An admin can generate a report for any user. | MUST |
| FR-R6 | Report generation is server-side; the response is a file download with a descriptive filename, e.g. `onboarding-diary_nadia-khan_2026-07-01_2026-07-31.pdf`. | MUST |
| FR-R7 | An empty date range produces a valid report stating that there are no entries, not an error. | SHOULD |

### 4.8 User Management (Admin)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-U1 | An admin can list, search, and filter all users by role, department, and active state. | MUST |
| FR-U2 | An admin can change a user's role. | MUST |
| FR-U3 | An admin can assign or clear a user's manager. | MUST |
| FR-U4 | An admin can deactivate and reactivate a user. Deactivation preserves their entries. | MUST |
| FR-U5 | An admin cannot remove their own admin role or deactivate their own account. | MUST |
| FR-U6 | Manager assignment must not create a cycle, and a user cannot be their own manager. | MUST |
| FR-U7 | An admin can set or clear any user's department, subject to the same length limit as the self-service profile field. | MUST |

### 4.9 Cross-cutting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-X1 | Every entry belongs to exactly one owner (a recruit). Ownership is set from the session, never from client input. | MUST |
| FR-X2 | Managers have read-only access to their reports' entries; they cannot create, edit, or delete them. | MUST |
| FR-X3 | Admins have full read access to all data and may correct or delete entries. | MUST |
| FR-X4 | All list endpoints are paginated with a default page size of 20 and a maximum of 100. | MUST |
| FR-X5 | The UI is responsive and usable at 360 px width and above. | MUST |
| FR-X6 | All validation errors are surfaced inline, field by field. | MUST |
| FR-X7 | Entry `date` is a plain calendar date supplied by the user and is independent of the record's `createdAt` timestamp. Timestamps are stored in UTC. | MUST |

## 5. User Flows

### UF-1 Sign up and first entry (Recruit)
1. Visitor opens the app and lands on the login screen; chooses "Create an account".
2. Enters name, email, password; submits.
3. Account is created with role `RECRUIT`; the user is logged in and taken to a
   profile-completion prompt (department, start date), which is skippable.
4. Dashboard renders in an empty state with a primary "Log your first task" action.
5. User creates a task entry; on save they return to the dashboard, which now shows
   updated counts and the entry under recent activity.

### UF-2 Daily logging (Recruit)
1. Recruit logs in; dashboard shows current progress and open issues.
2. Navigates to Task Log, adds one or more tasks for today.
3. Navigates to Issue Log, logs a blocker with severity High, status Open.
4. Next day, the recruit edits that issue: status Resolved, resolution notes filled in.
5. Dashboard open-issue count decreases accordingly.

### UF-3 Reviewing and filtering own entries (Recruit)
1. Recruit opens Task Log and sets a date range plus status = Blocked.
2. The list refreshes with the filtered result set and a result count.
3. Recruit clears filters via a single "Reset" action.

### UF-4 Manager reviews a recruit
1. Manager logs in; dashboard lists their direct reports with summary tiles.
2. Manager sees that Nadia has two Critical open issues and clicks her tile.
3. The recruit's diary opens read-only; manager filters issues by severity Critical.
4. All create/edit/delete affordances are absent.

### UF-5 Manager generates a report
1. From a recruit's view, the manager opens Reports.
2. Selects the date range, chooses "Combined", and the PDF format.
3. Server generates the file; the browser downloads it with a descriptive filename.
4. Manager repeats with CSV to get the raw rows for a spreadsheet.

### UF-6 Admin onboards a manager relationship
1. Admin opens User Management and searches for a newly signed-up user.
2. Sets that user's role to `MANAGER`.
3. Opens each recruit's record and assigns the new manager.
4. The manager's next dashboard load shows the assigned recruits.

### UF-7 Session expiry
1. A user's session token expires while a form is open.
2. The next request returns 401; the client clears session state and redirects to
   login, preserving the intended destination.
3. After a successful login the user returns to that destination.

## 6. Acceptance Criteria

Written as Given/When/Then. Each criterion maps to the functional requirements it
verifies.

### AC-1 Signup and role assignment (FR-A1, FR-A2, FR-A3)
- Given a unique email and a 10+ character password, when the visitor submits the
  signup form, then an account is created with role `RECRUIT` and they are logged in.
- Given an email that already exists, when signup is submitted, then a field-level
  error "That email is already registered" is shown and no account is created.
- Given a password shorter than 10 characters, when signup is submitted, then a
  field-level validation error is shown.
- Given any created account, when the stored record is inspected, then the password
  is a hash and never the plaintext value.

### AC-2 Login and logout (FR-A4, FR-A5, FR-A7)
- Given valid credentials for an active user, when they log in, then they land on the
  dashboard for their role.
- Given invalid credentials, when they log in, then a generic "Invalid email or
  password" message is shown, identical for unknown emails and wrong passwords.
- Given a deactivated user with correct credentials, when they log in, then login is
  refused with the same generic message.
- Given a logged-in user, when they log out, then protected routes redirect to login
  and the refresh token no longer works.

### AC-3 Task CRUD and validation (FR-T1, FR-T2, FR-T3, FR-T9)
- Given a recruit on the task form, when they submit with a date and title, then the
  task is created and appears at the top of the list for that date.
- Given a submitted form with an empty title, when they save, then an inline error
  appears and no request is persisted.
- Given a future date, when they save, then the request is rejected with "Date cannot
  be in the future".
- Given an existing task, when the recruit changes its status and saves, then the list
  and dashboard progress reflect the new status without a full page reload.
- Given a delete action, when the recruit confirms, then the task is gone from the
  list; when they cancel, then nothing changes.

### AC-4 Task filtering (FR-T5, FR-X4)
- Given 30 tasks across three categories, when the recruit filters by category
  Training and status In Progress, then only tasks matching both are listed and the
  result count is accurate.
- Given more than 20 matching tasks, when the list loads, then 20 are shown with
  working pagination and filters preserved across pages.

### AC-5 Issue lifecycle (FR-I1, FR-I4, FR-I6, FR-I7)
- Given a new issue, when saved without an explicit status, then its status is Open
  and it is counted as an open issue on the dashboard.
- Given an open issue, when its status is set to Resolved, then the UI prompts for
  resolution notes and the dashboard open-issue count decreases by one.
- Given issues of mixed severity, when filtering by severity Critical, then only
  Critical issues are returned.

### AC-6 Feedback and notes (FR-F1, FR-F2, FR-N1, FR-N2, FR-N4)
- Given a feedback note with type Suggestion, when saved, then it appears in the
  feedback list and is filterable by that type.
- Given a note saved with tags "Setup, setup , VPN", when stored, then its tags are
  exactly `setup` and `vpn`.
- Given notes with various tags, when filtering by tag `vpn`, then only notes carrying
  that tag are listed.

### AC-7 Recruit dashboard (FR-D1, FR-D2, FR-D3, FR-D4)
- Given a recruit with 10 tasks of which 4 are Done, when the dashboard loads, then
  task completion shows 4/10 and 40%.
- Given three issues with statuses Open, In Progress, and Resolved, when the dashboard
  loads, then the open-issue count is 2.
- Given entries across all four categories, when the dashboard loads, then recent
  activity lists the five most recent items, each labelled with its category.
- Given a brand-new account, when the dashboard loads, then zero counts and empty
  states with clear calls to action are shown, not errors.

### AC-8 Manager visibility and read-only enforcement (FR-D5, FR-D6, FR-X2)
- Given a manager with three direct reports, when the dashboard loads, then exactly
  those three recruits are listed with task progress, open-issue count, and last
  activity date.
- Given a recruit who is not their direct report, when the manager requests that
  recruit's entries by ID, then the API responds 403 and no data is returned.
- Given a manager viewing a recruit's diary, when the page renders, then no create,
  edit, or delete controls are present, and a direct write request to the API responds
  403.

### AC-9 Reports (FR-R1 to FR-R7)
- Given a date range containing entries, when a combined CSV is generated, then the
  file contains one clearly delimited section per category with a header row and one
  row per entry, and every entry within the range is present exactly once.
- Given the same range, when a PDF is generated, then it opens in a standard viewer
  and contains the recruit's name, the date range, summary counts, and a table per
  selected section.
- Given a date range with no entries, when a report is generated, then a valid file is
  returned stating that there are no entries for the range.
- Given a manager, when they request a report for a recruit they do not oversee, then
  the API responds 403.
- Given a recruit, when they request a report scoped to another user, then the API
  responds 403.
- Given an invalid range where the start date is after the end date, then a 422
  validation error is returned.

### AC-10 Admin user management (FR-U1 to FR-U7)
- Given an admin on User Management, when they search by partial name or email, then
  matching users are listed with role, department, manager, and active state.
- Given a user with role `RECRUIT`, when an admin sets the role to `MANAGER`, then that
  user's next login shows the manager dashboard.
- Given an admin, when they attempt to remove their own admin role or deactivate their
  own account, then the action is refused with an explanatory message.
- Given a proposed manager assignment that would create a cycle, when submitted, then
  it is refused with a validation error.
- Given an admin editing a user's department, when they save a new value, then it is
  trimmed and stored; when they save an empty value, then the department is cleared.
- Given a deactivated user, when their record is viewed, then all their entries are
  still present and included in reports.

### AC-11 Access control baseline (FR-X1, FR-X3)
- Given any authenticated request that creates an entry, when the client supplies a
  different `ownerId`, then that field is ignored and the session user is the owner.
- Given an unauthenticated request to any data endpoint, then the API responds 401.
- Given an admin, when they read or delete any user's entry, then the operation
  succeeds.

### AC-12 Responsiveness and accessibility baseline (FR-X5, FR-X6)
- Given a 360 px viewport, when each main screen loads, then no horizontal scrolling
  is required and all primary actions are reachable.
- Given a keyboard-only user, when they traverse a form, then all fields and the
  submit action are focusable in a logical order with visible focus styling.

## 7. Assumptions and Confirmed Decisions

| ID | Decision |
|----|----------|
| D1 | Stack: React + TypeScript + Vite frontend, Node/Express + TypeScript API, PostgreSQL via Prisma, single repository, Docker Compose for local development. |
| D2 | Open self-serve signup; new users are Recruits; role changes are Admin-only; JWT-based sessions. |
| D3 | Email verification and password reset are out of scope for v1. |
| D4 | The manager relationship is a single optional `managerId` on the user record, assigned by an Admin. Managers see only direct reports. |
| D5 | Managers have read-only access to recruit entries. Admins have full CRUD. No commenting feature in v1. |
| D6 | Reports are generated server-side. CSV is flat rows per section; PDF is a tabular summary with counts. |
| D7 | Enumerations are fixed as listed in Sections 4.2 to 4.4 and are not user-configurable in v1. |
| D8 | Attachments, notifications/email, global search, audit log, and i18n are out of scope. |
| D9 | Testing: unit tests plus API integration tests, run locally alongside lint and typecheck via root npm scripts. No hosted CI pipeline and no end-to-end browser tests in v1. |
| D10 | Entry `date` is a plain calendar date; timestamps are stored in UTC. |
| D11 | Single-tenant deployment for one organisation. |

## 8. Out of Scope

The following are explicitly excluded from v1:

- Email verification, password reset, and any outbound email or notifications.
- Third-party or SSO login (Google, Microsoft, SAML, OIDC).
- File or image attachments on entries.
- Comments, threads, approvals, or any two-way conversation on entries.
- Full-text or global cross-category search; only the filters in Section 4 are in
  scope.
- Audit logging and change history for records.
- Internationalisation and localisation; English only.
- Native mobile or offline-capable applications; responsive web only.
- Scheduled or emailed reports; reports are generated on demand.
- Onboarding templates, checklists, or task assignment by managers.
- Analytics across cohorts, trend charts beyond the dashboard tiles described.
- Multi-tenancy or organisation-level data isolation.
- Calendar, HRIS, ticketing, or chat integrations.
- End-to-end browser test automation.
