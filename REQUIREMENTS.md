# Requirements — Onboarding Diary

## 1. Overview

The **Onboarding Diary** is a web application that lets new recruits document
their onboarding journey through dated diary entries, track onboarding
milestones, and reflect on their first weeks/months at the company. Managers and
HR/People-team members can follow a recruit's progress, leave feedback, and
ensure the onboarding process is on track.

This document defines the functional and non-functional requirements,
validation rules, and acceptance criteria for the system. It is the source of
truth that the other design documents (user stories, API, schema, UI, and
architecture) elaborate on.

## 2. Goals & Non-Goals

### Goals
- Give recruits a simple, private space to record daily/weekly onboarding notes.
- Make onboarding **measurable** through milestones with completion state.
- Give managers/HR visibility into recruit progress and sentiment (mood).
- Be lightweight, fast, and accessible from any modern browser.

### Non-Goals (v1)
- Not an HRIS / payroll / benefits system.
- No deep integration with applicant tracking systems (ATS) in v1.
- No native mobile apps in v1 (responsive web only).
- No real-time chat/messaging between users.

## 3. Personas / Roles

| Role | Description | Key capabilities |
|------|-------------|------------------|
| **Recruit** | A newly hired employee in their onboarding period. | Create/edit own diary entries & milestones, view own dashboard. |
| **Manager** | Direct manager of one or more recruits. | View assigned recruits' entries/milestones, leave feedback, mark milestones. |
| **HR / Admin** | People-team member administering the program. | Manage recruits, manage milestone templates and tags, view all data, manage users. |

> Roles are hierarchical for read access: Admin ⊇ Manager (for assigned
> recruits) ⊇ Recruit (self only).

## 4. Domain Concepts

- **Recruit** — the person onboarding. Has profile data (name, email,
  department, join date) and owns diary entries and milestones.
- **Diary Entry** — a dated, titled, free-text reflection with an optional
  *mood* and a set of *tags*.
- **Milestone** — a discrete onboarding goal (e.g. "Complete security
  training") with a status, target date, and completion date.
- **Tag** — a reusable label applied to diary entries (e.g. `training`,
  `team`, `tools`, `blocker`) for categorization and filtering.
- **Feedback** *(v1.1)* — a manager/HR comment attached to a diary entry or
  milestone.

## 5. Functional Requirements

IDs use the prefix `FR-`. Priority: **M** = Must, **S** = Should, **C** = Could.

### 5.1 Authentication & Authorization
- **FR-1 (M)** Users can register / be invited and sign in with email + password.
- **FR-2 (M)** Sessions are authenticated via signed tokens (JWT) with expiry.
- **FR-3 (M)** Every API request is authorized against the caller's role and
  ownership of the resource.
- **FR-4 (S)** Admins can invite recruits and assign them to a manager.
- **FR-5 (C)** Support SSO (OIDC) for corporate identity providers.

### 5.2 Recruit Profile
- **FR-10 (M)** A recruit has a profile: name, email (unique), department,
  join date.
- **FR-11 (M)** Recruits can view and edit their own profile (except email/role,
  which are admin-controlled).
- **FR-12 (M)** Admins can create, update, and deactivate recruit profiles.

### 5.3 Diary Entries
- **FR-20 (M)** A recruit can create a diary entry with title, content,
  entry date, optional mood, and optional tags.
- **FR-21 (M)** A recruit can view a chronological list of their own entries.
- **FR-22 (M)** A recruit can edit and delete their own entries.
- **FR-23 (M)** Entries record `createdAt` and `updatedAt` timestamps.
- **FR-24 (S)** Entries can be filtered by date range, mood, and tag.
- **FR-25 (S)** Full-text search across entry title/content for the owner.
- **FR-26 (C)** Recruits can mark an entry as *private* (hidden from manager).

### 5.4 Milestones
- **FR-30 (M)** A milestone has a title, description, target date, status
  (`PENDING`, `IN_PROGRESS`, `COMPLETED`), and completion date.
- **FR-31 (M)** A recruit can create, update, and delete their own milestones.
- **FR-32 (M)** Completing a milestone sets `status=COMPLETED` and stamps
  `completedAt`.
- **FR-33 (S)** Admins can define **milestone templates** auto-applied to new
  recruits (e.g. standard 30/60/90-day milestones).
- **FR-34 (S)** Dashboard shows progress (e.g. "7 of 10 milestones complete").

### 5.5 Tags
- **FR-40 (M)** Tags can be created and reused across entries.
- **FR-41 (M)** An entry can have zero or more tags; a tag can apply to many
  entries (many-to-many).
- **FR-42 (S)** Admins can manage (rename/merge/delete) the global tag list.

### 5.6 Manager / HR Views
- **FR-50 (M)** A manager can list recruits assigned to them.
- **FR-51 (M)** A manager can view non-private entries and milestones of their
  recruits (read-only).
- **FR-52 (S)** A manager/HR can leave **feedback** on an entry or milestone
  (*v1.1*).
- **FR-53 (S)** HR/Admin can view aggregate reporting (completion rates,
  mood trends) across recruits.

### 5.7 Dashboard
- **FR-60 (M)** Recruit dashboard summarizes recent entries, milestone
  progress, and current streak.
- **FR-61 (S)** Mood timeline visualization over the onboarding period.

## 6. Non-Functional Requirements

IDs use the prefix `NFR-`.

### 6.1 Performance
- **NFR-1** P95 API latency < 300 ms for reads, < 500 ms for writes under
  nominal load (≤ 100 concurrent users).
- **NFR-2** List endpoints are paginated (default 20, max 100 per page).
- **NFR-3** Dashboard initial render (TTI) < 2.5 s on a typical broadband
  connection.

### 6.2 Scalability
- **NFR-4** Stateless API services horizontally scalable behind a load balancer.
- **NFR-5** Target capacity: 10k recruits, ~50 entries each, without redesign.

### 6.3 Availability & Reliability
- **NFR-6** Target 99.5% monthly availability.
- **NFR-7** Automated daily database backups with ≥ 7-day retention; documented
  restore procedure.
- **NFR-8** Graceful degradation: read paths remain available if optional
  features (search, reporting) are down.

### 6.4 Security (see ARCHITECTURE.md §Security for detail)
- **NFR-10** All traffic over HTTPS/TLS 1.2+.
- **NFR-11** Passwords hashed with bcrypt/argon2; never stored or logged in
  plaintext.
- **NFR-12** Authorization enforced server-side on every request (no trust in
  client).
- **NFR-13** Input validation and output encoding to prevent XSS/SQLi.
- **NFR-14** Audit log for admin actions and data deletions.
- **NFR-15** PII (name, email) encrypted at rest; access least-privilege.

### 6.5 Usability & Accessibility
- **NFR-20** Responsive layout for desktop, tablet, and mobile.
- **NFR-21** WCAG 2.1 AA compliance (contrast, keyboard nav, ARIA labels).
- **NFR-22** Clear, inline validation messages.

### 6.6 Maintainability & Observability
- **NFR-30** Layered architecture with clear separation (controller / service /
  repository).
- **NFR-31** ≥ 70% unit-test coverage on backend service layer.
- **NFR-32** Structured logging, request tracing, and health/readiness probes.
- **NFR-33** OpenAPI spec auto-generated and kept in sync with code.

### 6.7 Compliance & Privacy
- **NFR-40** Support data export and deletion for a recruit (GDPR-style "right
  to access / be forgotten").
- **NFR-41** Configurable data-retention policy for departed employees.

## 7. Validation Rules

| Field | Entity | Rule |
|-------|--------|------|
| `name` | Recruit | Required, 1–100 chars, trimmed. |
| `email` | Recruit | Required, valid RFC 5322 format, unique, ≤ 254 chars. |
| `department` | Recruit | Optional, ≤ 100 chars. |
| `joinDate` | Recruit | Optional, valid date, not > 1 year in the future. |
| `password` | User | ≥ 10 chars, mix of upper/lower/digit/symbol. |
| `title` | DiaryEntry | Required, 1–150 chars, trimmed, not blank. |
| `content` | DiaryEntry | Required, 1–20,000 chars, not blank. |
| `mood` | DiaryEntry | Optional, one of an allowed enum (e.g. `GREAT`, `GOOD`, `OKAY`, `LOW`, `STRESSED`). |
| `entryDate` | DiaryEntry | Required, valid date, not in the future. |
| `tags[]` | DiaryEntry | Optional, ≤ 10 tags per entry, each tag name 1–30 chars. |
| `title` | Milestone | Required, 1–150 chars. |
| `description` | Milestone | Optional, ≤ 2,000 chars. |
| `status` | Milestone | One of `PENDING`, `IN_PROGRESS`, `COMPLETED`. |
| `targetDate` | Milestone | Optional, valid date. |
| `completedAt` | Milestone | Set only when status transitions to `COMPLETED`; must be ≥ `createdAt`. |
| `name` | Tag | Required, unique (case-insensitive), 1–30 chars, `[a-z0-9-]`. |

General rules:
- All string inputs are trimmed; reject if blank after trimming when required.
- Reject unknown/extra fields (`400 Bad Request`).
- Reject payloads exceeding configured size limits.
- Dates are ISO-8601; times are UTC server-side.

## 8. Acceptance Criteria (representative, Gherkin-style)

### AC for FR-20 (Create diary entry)
```
Given an authenticated recruit
When they POST a valid entry (title, content, entryDate)
Then the entry is persisted with createdAt/updatedAt set
And it appears at the top of their entry list
And the response is 201 with the created entry body
```

### AC for FR-20 (Validation failure)
```
Given an authenticated recruit
When they POST an entry with a blank title
Then the API responds 400
And the body contains a field-level error for "title"
And nothing is persisted
```

### AC for FR-22 (Authorization on edit)
```
Given recruit A owns entry X
When recruit B attempts to PUT/DELETE entry X
Then the API responds 403 (or 404 to avoid existence disclosure)
And entry X is unchanged
```

### AC for FR-32 (Complete milestone)
```
Given a recruit's milestone in status IN_PROGRESS
When they mark it COMPLETED
Then status becomes COMPLETED and completedAt is set to now (UTC)
And the dashboard progress count increments
```

### AC for FR-51 (Manager read access)
```
Given a manager assigned to recruit R
When the manager requests R's entries
Then they receive R's non-private entries (read-only)
And attempting to modify any entry returns 403
```

### AC for FR-24 (Filtering)
```
Given a recruit with entries across several dates, moods, and tags
When they request entries filtered by tag="training" and mood="GOOD"
Then only entries matching both filters are returned, paginated and date-sorted
```

## 9. Assumptions & Open Questions
- **Assumption:** Single-tenant company deployment in v1 (no cross-company
  multi-tenancy).
- **Assumption:** Email is the unique login identity.
- **Open:** Should managers see *mood* data, or is mood recruit-private? (Default
  v1: managers see mood; revisit with People team.)
- **Open:** Are milestone templates company-wide or per-department?
- **Open:** Retention period for departed recruits' diaries.

## 10. Traceability
Each user story in `USER_STORIES.md` references the `FR-`/`NFR-` IDs above.
API endpoints in `API_SPEC.md` and tables in `DATABASE_SCHEMA.md` map back to
these requirements.
