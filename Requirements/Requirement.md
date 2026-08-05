# Onboarding Diary Application — Requirements

> Elaborated from `Requirements/Onboarding_Diary_App_Requirements (1).pdf`.
> This document expands the original one-pager into detailed requirements: user stories,
> data model, API endpoints, UI flows, and validation rules, to be used as the basis for
> incremental implementation.

## 1. Overview

A responsive web application that lets new recruits document their onboarding journey by
logging daily tasks, issues/blockers, feedback, and free-form notes. Managers can review the
entries of the recruits they oversee and generate downloadable reports. Admins manage users
and have visibility into all data.

## 2. Proposed Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (TypeScript), responsive layout |
| Backend API | ASP.NET Core Web API (C#) |
| Database | PostgreSQL (accessed via EF Core) |
| Auth | Email/password with hashed passwords (BCrypt/ASP.NET Identity), JWT bearer tokens for API access |
| Reports | Server-side generation of PDF (e.g. QuestPDF/iText) and CSV |

This stack is a recommendation to give the rest of this document concrete conventions
(REST routes, relational schema, JWT auth). It can be revisited before implementation begins.

## 3. User Roles & Permissions

| Role | Description | Permissions |
|---|---|---|
| **New Recruit** | Onboarding employee | CRUD on their own tasks, issues, feedback, notes. View their own dashboard. |
| **Manager** | Oversees one or more recruits | Read-only access to entries of recruits they oversee. Generate reports for their recruits. View their own dashboard/profile. |
| **Admin** | System administrator | Full CRUD on users (create/edit/deactivate, assign roles, assign recruits to managers). Read access to all data across all users. Generate reports for anyone. |

Each `User` has exactly one `Role`. A recruit is optionally assigned to one `Manager` via a
`ManagerId` reference, established by an Admin (or a Manager, if self-service assignment is
desired — TBD, default: Admin-only).

## 4. Data Model (Entities)

### 4.1 User
| Field | Type | Notes |
|---|---|---|
| Id | Guid/int | PK |
| Email | string | unique, required |
| PasswordHash | string | required, never returned by API |
| FullName | string | required |
| Role | enum: NewRecruit, Manager, Admin | required |
| Department | string | required |
| StartDate | date | required (onboarding start date) |
| ManagerId | FK → User.Id, nullable | set for NewRecruit users |
| CreatedAt / UpdatedAt | datetime | audit fields |

### 4.2 TaskEntry
| Field | Type | Notes |
|---|---|---|
| Id | Guid/int | PK |
| UserId | FK → User.Id | owner (recruit) |
| Date | date | required |
| Title | string | required, max 200 chars |
| Description | string | optional, max 2000 chars |
| Category | string/enum | e.g. Training, Setup, Meeting, Project Work, Documentation, Other |
| Status | enum: Not Started, In Progress, Completed, Blocked | required |
| Priority | enum: Low, Medium, High | required |
| CreatedAt / UpdatedAt | datetime | audit fields |

### 4.3 IssueEntry
| Field | Type | Notes |
|---|---|---|
| Id | Guid/int | PK |
| UserId | FK → User.Id | owner (recruit) |
| Date | date | required |
| Title | string | required, max 200 chars |
| Description | string | required, max 2000 chars |
| Severity | enum: Low, Medium, High, Critical | required |
| Status | enum: Open, In Progress, Resolved, Closed | required |
| ResolutionNotes | string | optional, max 2000 chars; required when Status = Resolved/Closed |
| CreatedAt / UpdatedAt | datetime | audit fields |

### 4.4 FeedbackNote
| Field | Type | Notes |
|---|---|---|
| Id | Guid/int | PK |
| UserId | FK → User.Id | owner (recruit) |
| Date | date | required |
| Subject | string | required, max 200 chars |
| Type | enum: Positive, Suggestion, Concern | required |
| Details | string | required, max 2000 chars |
| CreatedAt / UpdatedAt | datetime | audit fields |

### 4.5 Note (Additional Notes)
| Field | Type | Notes |
|---|---|---|
| Id | Guid/int | PK |
| UserId | FK → User.Id | owner (recruit) |
| Date | date | required |
| Title | string | required, max 200 chars |
| Content | string | required, max 5000 chars |
| Tags | string[] | optional, free-form, max 10 tags, each max 30 chars |
| CreatedAt / UpdatedAt | datetime | audit fields |

## 5. User Stories

### Authentication & Profile
- As a **new user**, I can sign up with my email, password, full name, department, and start
  date, so that I can start logging my onboarding activity.
- As a **user**, I can log in with my email and password and stay authenticated across
  sessions (via a stored JWT) until I log out or my session expires.
- As a **user**, I can view and edit my profile (name, department, start date) but not my
  role, so that my information stays accurate.
- As an **admin**, I can change any user's role and manager assignment, so that access
  control reflects the org structure.

### Task Log (New Recruit)
- As a **recruit**, I can create a task entry with date, title, description, category,
  status, and priority, so that I can track my daily work.
- As a **recruit**, I can edit or delete a task entry I created, so that I can correct
  mistakes.
- As a **recruit**, I can filter my task list by date, category, or status, so that I can
  quickly find relevant entries.
- As a **recruit**, I can see my tasks sorted by date (most recent first) by default.

### Issue Log (New Recruit)
- As a **recruit**, I can log an issue/blocker with date, title, description, severity, and
  status, so that I can document obstacles during onboarding.
- As a **recruit**, I can add resolution notes and update the status once an issue is
  addressed.
- As a **recruit**, I can filter issues by status or severity.

### Feedback Notes (New Recruit)
- As a **recruit**, I can submit feedback about the onboarding process with a subject, type
  (Positive/Suggestion/Concern), and details, so that I can share my experience.
- As a **recruit**, I can view a history of my submitted feedback.

### Additional Notes (New Recruit)
- As a **recruit**, I can create free-form notes with a title, content, and tags, so that I
  can capture anything not covered by the other logs.
- As a **recruit**, I can search/filter notes by tag.

### Dashboard
- As a **recruit**, I can see a dashboard summarizing my counts of tasks/issues/feedback/notes,
  my task completion progress, and my open issues at a glance.
- As a **manager**, I can see an aggregated dashboard across the recruits I oversee (e.g.
  total open issues, task completion rates per recruit).
- As an **admin**, I can see system-wide summary metrics across all users.

### Manager Views & Reports
- As a **manager**, I can see a list of the recruits assigned to me.
- As a **manager**, I can view (read-only) a specific recruit's tasks, issues, feedback, and
  notes.
- As a **manager**, I can generate a report (tasks, issues, feedback, or combined) for a
  chosen recruit and date range, downloadable as PDF or CSV.
- As an **admin**, I can generate the same reports for any user.
- As a **recruit**, I can generate a report of my own entries for a chosen date range.

### Admin
- As an **admin**, I can view, create, edit, and deactivate user accounts.
- As an **admin**, I can assign/reassign a recruit to a manager.
- As an **admin**, I can view any user's tasks, issues, feedback, and notes.

## 6. API Endpoints

Conventions: JSON REST API under `/api`, JWT bearer auth on all endpoints except
signup/login, standard status codes (200/201/204/400/401/403/404), pagination via
`?page=&pageSize=` on list endpoints, filtering via query params.

### Auth
| Method | Route | Description | Access |
|---|---|---|---|
| POST | `/api/auth/signup` | Create account (Email, Password, FullName, Department, StartDate) → default role NewRecruit | Public |
| POST | `/api/auth/login` | Authenticate, returns JWT + user profile | Public |
| POST | `/api/auth/logout` | Invalidate/blacklist token (or client-side discard, if stateless) | Authenticated |
| GET | `/api/auth/me` | Get current authenticated user's profile | Authenticated |

### Users
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/users` | List users, filter by role/department/manager | Admin |
| GET | `/api/users/{id}` | Get a user by id | Admin, or Manager for own recruit, or self |
| PUT | `/api/users/me` | Update own profile (name, department, start date) | Self |
| PUT | `/api/users/{id}` | Update any user (incl. role, managerId, active flag) | Admin |
| DELETE | `/api/users/{id}` | Deactivate/delete a user | Admin |
| GET | `/api/users/{id}/recruits` | List recruits managed by this user | Admin, or self (Manager) |

### Task Log
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/tasks?date=&category=&status=&userId=` | List task entries (own, or `userId` for Manager/Admin viewing a recruit) | Recruit (own), Manager (assigned recruit), Admin (any) |
| POST | `/api/tasks` | Create a task entry (own) | Recruit |
| GET | `/api/tasks/{id}` | Get a task entry | Owner, Manager (of owner), Admin |
| PUT | `/api/tasks/{id}` | Update a task entry | Owner |
| DELETE | `/api/tasks/{id}` | Delete a task entry | Owner |

### Issue Log
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/issues?status=&severity=&userId=` | List issue entries | Recruit (own), Manager (assigned), Admin (any) |
| POST | `/api/issues` | Create an issue entry | Recruit |
| GET | `/api/issues/{id}` | Get an issue entry | Owner, Manager (of owner), Admin |
| PUT | `/api/issues/{id}` | Update an issue entry | Owner |
| DELETE | `/api/issues/{id}` | Delete an issue entry | Owner |

### Feedback Notes
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/feedback?type=&userId=` | List feedback entries | Recruit (own), Manager (assigned), Admin (any) |
| POST | `/api/feedback` | Submit feedback | Recruit |
| GET | `/api/feedback/{id}` | Get a feedback entry | Owner, Manager (of owner), Admin |
| PUT | `/api/feedback/{id}` | Edit own feedback | Owner |
| DELETE | `/api/feedback/{id}` | Delete own feedback | Owner |

### Additional Notes
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/notes?tag=&userId=` | List notes, filterable by tag | Recruit (own), Manager (assigned), Admin (any) |
| POST | `/api/notes` | Create a note | Recruit |
| GET | `/api/notes/{id}` | Get a note | Owner, Manager (of owner), Admin |
| PUT | `/api/notes/{id}` | Update a note | Owner |
| DELETE | `/api/notes/{id}` | Delete a note | Owner |

### Dashboard
| Method | Route | Description | Access |
|---|---|---|---|
| GET | `/api/dashboard/summary?userId=` | Counts per category, task completion %, open issue count, recent entries for the given/own user | Recruit (own), Manager (assigned recruit), Admin (any) |
| GET | `/api/dashboard/team-summary` | Aggregated summary across all recruits managed by the caller | Manager |

### Reports
| Method | Route | Description | Access |
|---|---|---|---|
| POST | `/api/reports` | Generate a report. Body: `{ userId, type: tasks\|issues\|feedback\|combined, startDate, endDate, format: pdf\|csv }` → returns report id/status | Recruit (own), Manager (assigned recruit), Admin (any) |
| GET | `/api/reports/{id}/download` | Download the generated report file | Requestor who generated it |

## 7. UI Flows

### 7.1 Navigation Structure
- **Public:** Login, Sign Up
- **Authenticated shell:** persistent nav with Dashboard, Task Log, Issue Log, Feedback,
  Notes, Reports, Profile, and (role-gated) Team View (Manager) / Admin (Admin).

### 7.2 Sign Up / Login
1. User lands on Login page; link to Sign Up.
2. Sign Up form: Email, Password, Confirm Password, Full Name, Department, Start Date →
   on submit, create account, auto-login, redirect to Dashboard.
3. Login form: Email, Password → on submit, redirect to Dashboard. Inline error on invalid
   credentials.

### 7.3 Dashboard
- Recruit: cards for Task count / Issue count / Feedback count / Notes count; a progress bar
  for task completion (% Completed of total tasks); an "Open Issues" callout; a "Recent
  Activity" list (latest N entries across all categories, each linking to its detail/edit
  view).
- Manager: same as above plus a "My Recruits" list with per-recruit mini-summary
  (completion %, open issues) linking into a read-only recruit detail view.
- Admin: system-wide totals plus a link into User Management.

### 7.4 Task Log
- List view: table/cards with Date, Title, Category, Status, Priority; filter bar (Date
  range, Category dropdown, Status dropdown); "New Task" button.
- Create/Edit view: form/modal with Date (defaults to today), Title, Description, Category
  (dropdown), Status (dropdown), Priority (dropdown); Save / Cancel; Delete on edit view
  (with confirmation dialog).

### 7.5 Issue Log
- List view: table/cards with Date, Title, Severity, Status; filter bar (Severity, Status);
  "New Issue" button; visual severity/status badges (color-coded).
- Create/Edit view: Date, Title, Description, Severity (dropdown), Status (dropdown),
  Resolution Notes (shown/required once Status is Resolved/Closed); Save / Cancel; Delete
  (with confirmation dialog).

### 7.6 Feedback Notes
- List view: Date, Subject, Type (badge); "New Feedback" button.
- Create/Edit view: Date, Subject, Type (Positive/Suggestion/Concern radio or dropdown),
  Details (textarea); Save / Cancel; Delete (with confirmation).

### 7.7 Additional Notes
- List view: Date, Title, Tags (chips); tag filter; search box (title/content); "New Note"
  button.
- Create/Edit view: Date, Title, Content (rich text or plain textarea), Tags (chip input);
  Save / Cancel; Delete (with confirmation).

### 7.8 Reports
- Form: Scope (self, or pick a recruit if Manager/Admin), Report Type
  (Tasks/Issues/Feedback/Combined), Date Range (start/end date pickers), Format
  (PDF/CSV) → "Generate" button.
- On success: show a download link/button and (optionally) a report history list of
  previously generated reports for that session/user.

### 7.9 Manager — Recruit View
- "My Recruits" list → selecting a recruit opens a read-only tabbed view (Tasks / Issues /
  Feedback / Notes) reusing the list components from 7.4–7.7 in read-only mode, plus a
  "Generate Report" shortcut pre-filled with that recruit.

### 7.10 Admin — User Management
- Users table: Name, Email, Role, Department, Manager, Active/Inactive; search/filter by
  role or department.
- Create/Edit user modal: Full Name, Email, Department, Start Date, Role (dropdown),
  Manager (dropdown, only relevant for NewRecruit role), Active toggle.
- Deactivate action requires confirmation; deactivated users cannot log in but their data is
  retained.

## 8. Validation Rules

### General
- All date fields must be valid calendar dates; entry dates (Task/Issue/Feedback/Note)
  cannot be more than 1 day in the future (allows for time zone edge cases) and cannot
  predate the user's `StartDate`.
- Free-text fields are trimmed of leading/trailing whitespace; empty-after-trim values are
  rejected for required fields.
- All list/filter endpoints validate enum query params against the allowed set and return
  `400 Bad Request` on invalid values.

### Authentication
- Email: required, valid email format, unique (case-insensitive) across users.
- Password: required, minimum 8 characters, at least one letter and one number.
- Confirm Password (sign-up form only): must match Password.
- Login lockout: after 5 consecutive failed attempts, lock the account for 15 minutes
  (brute-force protection).

### User Profile
- FullName: required, 2–100 characters.
- Department: required, 2–100 characters.
- StartDate: required, valid date, not in the future beyond a reasonable admin-configured
  bound (e.g. can't be more than 1 year ahead).
- Role: one of `NewRecruit`, `Manager`, `Admin`; only Admin can set/change this field.
- ManagerId: if set, must reference an existing user with Role = Manager; only meaningful
  when Role = NewRecruit.

### Task Entry
- Date: required.
- Title: required, 1–200 characters.
- Description: optional, ≤ 2000 characters.
- Category: required, one of the configured category values.
- Status: required, one of `Not Started`, `In Progress`, `Completed`, `Blocked`.
- Priority: required, one of `Low`, `Medium`, `High`.

### Issue Entry
- Date: required.
- Title: required, 1–200 characters.
- Description: required, 1–2000 characters.
- Severity: required, one of `Low`, `Medium`, `High`, `Critical`.
- Status: required, one of `Open`, `In Progress`, `Resolved`, `Closed`.
- ResolutionNotes: required (non-empty) when Status is `Resolved` or `Closed`; otherwise
  optional, ≤ 2000 characters.

### Feedback Note
- Date: required.
- Subject: required, 1–200 characters.
- Type: required, one of `Positive`, `Suggestion`, `Concern`.
- Details: required, 1–2000 characters.

### Additional Note
- Date: required.
- Title: required, 1–200 characters.
- Content: required, 1–5000 characters.
- Tags: optional, up to 10 tags, each 1–30 characters, alphanumeric/hyphen only,
  de-duplicated case-insensitively.

### Reports
- StartDate/EndDate: both required, valid dates, `StartDate <= EndDate`, range not to
  exceed a configurable maximum (e.g. 1 year) to bound report size.
- Type: required, one of `tasks`, `issues`, `feedback`, `combined`.
- Format: required, one of `pdf`, `csv`.
- `userId` (when generating for someone else): required to be either the requestor
  themself, a recruit assigned to the requesting Manager, or any user if requestor is Admin;
  otherwise `403 Forbidden`.

## 9. Non-Functional Requirements

- **Responsive design:** usable on desktop, tablet, and mobile breakpoints.
- **Security:** passwords hashed (never stored/returned in plaintext); JWT-based
  authentication; role-based authorization enforced server-side on every endpoint (not just
  hidden in the UI); HTTPS in production.
- **Data persistence:** all data stored in PostgreSQL; migrations managed via EF Core.
- **Performance:** list endpoints paginated; database indexes on frequently filtered
  columns (`UserId`, `Date`, `Status`, `Category`, `Severity`, `Type`).
- **Auditability:** `CreatedAt`/`UpdatedAt` timestamps retained on all entries.
- **Accessibility:** forms and interactive elements should be keyboard-navigable and use
  semantic HTML/ARIA labels where applicable.

## 10. Assumptions & Out of Scope (for initial build)

- Password reset via email, multi-factor auth, and SSO are out of scope initially.
- Real-time notifications/websockets are out of scope initially.
- A recruit has at most one manager at a time; a manager can oversee multiple recruits.
- Feedback and Notes are not routed through any approval workflow — they are visible to the
  owning recruit and their manager/admin immediately upon submission.
- Additional feature suggestions (e.g. search, charts, checklists) are intentionally
  deferred to a later extension phase, per the exercise instructions, and are not detailed
  in this document.
