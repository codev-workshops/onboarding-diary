# Onboarding Diary — Requirements & Acceptance Criteria

Source brief: `Onboarding_Diary_App_Requirements.pdf` (new recruits log tasks, issues, feedback and
notes; managers review and report; admins manage users) plus the elaborated engineering brief.

## 1. Roles

| Role | Capabilities |
|---|---|
| RECRUIT | Self-register, login/logout, own profile, full CRUD over own tasks/issues/feedback/notes, filter + cross-category search of own entries, own dashboard, own reports (CSV/PDF) |
| MANAGER | Login/logout, profile, list only recruits whose `manager_id` = self, read all diary categories of those recruits, reports for those recruits, manager analytics dashboard |
| ADMIN | Login/logout, create users (any role), activate/deactivate users, assign/reassign a manager to a recruit, view all data, reports for any user |

Public registration creates RECRUIT accounts only.

## 2. User stories

### Recruit
- US-R1: As a recruit I can sign up with name, email, password, department and start date so I can keep a diary.
- US-R2: As a recruit I can log in and out securely; a deactivated account cannot log in.
- US-R3: As a recruit I can view and update my profile (name, department, start date) and change my password.
- US-R4: As a recruit I can create/edit/delete a task with date, title, description, category, status, priority.
- US-R5: As a recruit I can filter tasks by date range, category and status.
- US-R6: As a recruit I can create/edit/delete an issue with severity, status and resolution notes, and filter by status/severity.
- US-R7: As a recruit I can create/edit/delete feedback (subject, type, details) and filter by type.
- US-R8: As a recruit I can create/edit/delete notes (title, content, tags) and filter by tag text.
- US-R9: As a recruit I see a dashboard with total/completed task counts, completion %, open issues, recent entries and charts.
- US-R10: As a recruit I can search across all four categories at once and jump to the source record.
- US-R11: As a recruit I can download CSV/PDF reports for a date range and report type.
- US-R12: As a recruit I can never see or modify another user's records (403).

### Manager
- US-M1: As a manager I see the list of recruits assigned to me with activity counts.
- US-M2: As a manager I can open one assigned recruit and review their tasks/issues/feedback/notes.
- US-M3: As a manager I can generate CSV/PDF reports for an assigned recruit.
- US-M4: As a manager I see a dashboard aggregating my team's tasks/issues (status + severity charts, recruit activity).
- US-M5: As a manager requesting a recruit that is not assigned to me I get 403.

### Admin
- US-A1: As an admin I can list/filter all users.
- US-A2: As an admin I can create a user with any role, department, start date and initial password.
- US-A3: As an admin I can activate/deactivate any user (except deactivating myself).
- US-A4: As an admin I can assign or reassign a manager for a recruit.
- US-A5: As an admin I can view any user's diary and generate reports for any user.

## 3. Domain model

See `docs/ARCHITECTURE.md` for the ERD. Entities: `User`, `Task`, `Issue`, `Feedback`, `Note`.

## 4. Validation table (enforced server-side with Bean Validation + service checks, mirrored in the UI)

| Field | Rule | Message |
|---|---|---|
| user.name | required, 2–100 chars | "Name must be between 2 and 100 characters" |
| user.email | required, RFC-valid, unique case-insensitively (stored lower-cased) | "Email is already registered" |
| user.password | required on create, min 8 chars, max 100 | "Password must be at least 8 characters" |
| user.department | optional, max 100 | |
| user.startDate | optional, not more than 1 year in the future | |
| user.role | enum RECRUIT/MANAGER/ADMIN; signup forces RECRUIT | |
| entry.date (all four) | required, not in the future | "Date cannot be in the future" |
| task.title | required, 3–150 | |
| task.description | max 4000 | |
| task.category | required, max 100 | "Category is required" |
| task.status | enum TODO/IN_PROGRESS/COMPLETED/BLOCKED | |
| task.priority | enum LOW/MEDIUM/HIGH/CRITICAL | |
| issue.title | required, 3–150 | |
| issue.description | max 4000 | |
| issue.resolutionNotes | max 4000 | |
| issue.severity | enum LOW/MEDIUM/HIGH/CRITICAL | |
| issue.status | enum OPEN/IN_PROGRESS/RESOLVED/WONT_FIX | |
| feedback.subject | required, 3–150 | |
| feedback.type | enum POSITIVE/SUGGESTION/CONCERN | |
| feedback.details | required, 3–5000 | |
| note.title | required, 3–150 | |
| note.content | required, 1–10000 | |
| note.tags | optional, max 500 | |
| report range | `from` <= `to`, both required | "Start date must be before end date" |

## 5. Authorization matrix

`own` = record's `user_id` equals principal id. `managed` = record owner's `manager_id` equals principal id.

| Action | RECRUIT | MANAGER | ADMIN |
|---|---|---|---|
| Read own diary record | ✔ own | ✔ own | ✔ own |
| Read other user's diary record | ✘ | ✔ only managed | ✔ all |
| Create/update/delete diary record | ✔ own only | ✔ own only | ✔ own only |
| List recruits | ✘ | ✔ assigned only | ✔ all users |
| Create user / activate / deactivate / assign manager | ✘ | ✘ | ✔ |
| Report for self | ✔ | ✔ | ✔ |
| Report for another user | ✘ | ✔ managed only | ✔ any |
| `/api/**` | own data only | own data only (manager views use `/manager/**`) | own data only |

Rules:
1. Every read/update/delete resolves the record by id and then asserts scope in `AuthorizationService`; a
   violation throws `AccessDeniedException` → HTTP 403 (HTML error page or JSON problem body).
2. IDs from the browser are never trusted; no query is executed with an unscoped id for mutation.
3. Managers and admins are read-only over other users' diary data (no editing of someone else's entries).
4. Passwords: BCrypt strength 12, never rendered, never logged, never serialized.
5. CSRF enabled for all browser form posts and for the `/api` endpoints (same session cookie auth).
6. Secrets come from environment variables (`.env.example` documents them).

## 6. UI flows (Thymeleaf + Bootstrap 5, shared layout with role-aware navbar)

| Path | Description |
|---|---|
| `/login` | Email + password, error/logout banners, link to signup |
| `/signup` | Recruit self-registration; on success redirect to `/login?registered` |
| `/dashboard` | Role-aware: recruit stats/charts, manager team view links, admin overview |
| `/profile` | Update name/department/start date; change password form |
| `/tasks` | Filter bar (from, to, category, status) + table + edit/delete actions + quick add |
| `/tasks/new`, `/tasks/edit/{id}` | Task form with inline field errors |
| `/issues`, `/issues/new`, `/issues/edit/{id}` | Same pattern; filters status + severity |
| `/feedback`, `/feedback/new`, `/feedback/edit/{id}` | Same pattern; filter type |
| `/notes`, `/notes/new`, `/notes/edit/{id}` | Same pattern; filter tag/text |
| `/search?q=` | Cross-category results: category badge, date, title, matching snippet, link to record |
| `/reports` | Date range + report type + CSV/PDF buttons; manager/admin may pick a target user |
| `/manager/recruits` | Table of assigned recruits: tasks, completion %, open issues, last activity |
| `/manager/recruits/{id}` | One recruit's diary (read-only tabs) + report shortcuts |
| `/admin/users` | User table with create form, activate/deactivate, manager assignment, view diary |

Every list page renders an explicit empty state; every destructive action uses a POST form with CSRF
and a confirmation dialog; validation errors are shown inline with `is-invalid` feedback text.

## 7. API contract (session-authenticated JSON under `/api`, DTOs only)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/me` | – | `{id,name,email,role,department,startDate,active,managerName}` |
| GET | `/api/dashboard` | – | `{totalTasks,completedTasks,completionPercentage,openIssues,tasksByStatus,issuesBySeverity,recentEntries[]}` |
| GET | `/api/tasks` | `from,to,category,status` | `TaskDto[]` |
| POST | `/api/tasks` | `TaskRequest` | 201 `TaskDto` |
| GET/PUT/DELETE | `/api/tasks/{id}` | `TaskRequest` on PUT | `TaskDto` / 204 |
| GET | `/api/issues` | `from,to,status,severity` | `IssueDto[]` |
| POST | `/api/issues` | `IssueRequest` | 201 `IssueDto` |
| GET/PUT/DELETE | `/api/issues/{id}` | | `IssueDto` / 204 |
| GET | `/api/feedback` | `from,to,type` | `FeedbackDto[]` |
| POST | `/api/feedback` | `FeedbackRequest` | 201 `FeedbackDto` |
| GET/PUT/DELETE | `/api/feedback/{id}` | | `FeedbackDto` / 204 |
| GET | `/api/notes` | `from,to,q` | `NoteDto[]` |
| POST | `/api/notes` | `NoteRequest` | 201 `NoteDto` |
| GET/PUT/DELETE | `/api/notes/{id}` | | `NoteDto` / 204 |
| GET | `/api/search?q=` | `q` | `SearchResultDto[]` = `{category,id,date,title,snippet,link}` |

Errors: `400` validation (`{timestamp,status,error,message,fieldErrors{}}`), `401` unauthenticated,
`403` out-of-scope id, `404` unknown id. No entity/password hash is ever serialized.

## 8. Reporting

- Inputs: `from`, `to`, `type` ∈ {TASKS, ISSUES, FEEDBACK, COMBINED}, optional `userId` (manager/admin).
- `GET /reports/download/csv` and `/reports/download/pdf` with `Content-Disposition: attachment`.
- CSV: one section per included category with a header row.
- PDF (PDFBox): title, user name/email, date range, report type, generated timestamp, summary counts and
  paginated entry tables with page numbers.

## 9. Extensions

1. **Cross-category search** — `/search` and `/api/search` over task title/description/category,
   issue title/description, feedback subject/details, note title/content/tags, scoped to the caller,
   returning category, date, title, snippet and deep link.
2. **Analytics dashboard** — Chart.js doughnut (task status) and bar (issue severity) on the recruit
   dashboard, plus a manager dashboard with per-recruit activity and team-wide charts.
3. **Overdue / stale highlighting** (optional third) — tasks older than 7 days still in TODO/IN_PROGRESS
   and issues open > 7 days are flagged on dashboards and list pages.

## 10. Acceptance criteria (gates)

- AC1 `docker compose up -d` starts PostgreSQL 17; app boots with Flyway migrations on an empty DB.
- AC2 Demo accounts (README) log in; deactivated demo user cannot.
- AC3 Recruit journey: signup → login → create task → edit task → dashboard counters update → search →
  CSV + PDF download → logout.
- AC4 Manager journey: login → `/manager/recruits` → open assigned recruit → report download; 403 for
  an unassigned recruit.
- AC5 Admin journey: login → create user → deactivate/activate → reassign manager → view any diary.
- AC6 All validation rules rejected server-side with field-level messages.
- AC7 `mvn -B verify` green; security/authorization tests cover the matrix above.
- AC8 No password hash appears in any HTML or JSON response; no secret committed.
