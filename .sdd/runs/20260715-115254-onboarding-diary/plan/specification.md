# Onboarding Diary Application Specification

- **run_id:** `20260715-115254-onboarding-diary`
- **spec_revision:** `null`
- **status:** `BLOCKED_CLARIFICATION`
- **source BRD:** `.sdd/runs/20260715-115254-onboarding-diary/input/Onboarding_Diary_App_Requirements.pdf`
- **source BRD SHA-256:** `afd140b884b1b029f7775e94a0c802a93a4db16c1f070e803369b191954d24c8`
- **approval policy:** Human approval required

## 1. Problem and outcomes

New recruits need one responsive web application in which to document their onboarding work, blockers, feedback, and notes. Managers need visibility into recruits they oversee and downloadable reports. Administrators need user-management capability and visibility across all data.

The intended outcomes are:

1. Recruits can maintain the diary information explicitly described by the BRD.
2. Authorized managers can review relevant diary information and generate reports.
3. Authorized administrators can manage users and view all application data.
4. Users can see a dashboard summarizing onboarding activity.
5. The application uses the mandated React/Vite/Tailwind, FastAPI, and in-memory SQLite stack.

## 2. Actors

| Actor | Explicit BRD capability | Unresolved boundary |
|---|---|---|
| New Recruit | Log tasks, issues, feedback, and notes | Whether access is restricted to owned records; who assigns the role |
| Manager | View recruit entries and generate reports for recruits they oversee | How oversight relationships are created; whether managers may edit data |
| Admin | Manage users and view all data | Exact user-management operations; whether admins may edit diary data |
| Unauthenticated visitor | Sign up and log in | Permitted sign-up roles and account activation policy |

## 3. Scope

### In scope from the BRD

- Email/password sign-up and login.
- User profile containing name, role, department, and start date.
- Task entries with create, edit, delete, and filtering behavior.
- Issue/blocker entries with filtering.
- Feedback entries.
- Additional free-form notes with tags.
- Dashboard summary counts, recent entries, task-completion progress, and open-issue visibility.
- Date-range reports for tasks, issues, feedback, or a combined report.
- PDF and CSV report downloads.
- Manager report access for recruits they oversee.
- Responsive web behavior.
- Database-backed data handling.
- Two additional features, after their identity and scope are approved.

### Mandated implementation constraints

- Frontend: React + Vite.
- Styling: Tailwind CSS.
- Backend: Python FastAPI.
- Database: SQLite configured as in-memory.
- Keep the solution simple and avoid over-engineering.

### Non-goals unless separately approved

- Production deployment, cloud infrastructure, distributed services, queues, caches, or microservices.
- External identity providers, email delivery, password reset, MFA, audit export, or third-party integrations.
- Tracker publication or implementation work during planning.
- Any extension feature not selected through clarification and approval.

## 4. Functional requirements summary

The normative requirement catalog is in `requirements.json`. The core behavior is divided into identity/access (`REQ-001`–`REQ-004`), diary records (`REQ-005`–`REQ-008`), dashboard (`REQ-009`–`REQ-010`), reporting (`REQ-011`–`REQ-013`), platform qualities (`REQ-014`–`REQ-017`), and extension scope (`REQ-018`).

No unresolved behavior is presented as approved. Stories that depend on an unresolved answer are explicitly blocked in `stories.json`.

## 5. Proposed system boundary

The mandated stack establishes a browser frontend, a FastAPI backend, and an in-memory SQLite database. The following details are deliberately not fixed pending clarification:

- Authentication session mechanism and password-security policy.
- REST resource paths and request/response contracts.
- Database lifetime, reset behavior, process model, and seed behavior.
- Role assignment and manager-to-recruit relationship model.
- Enumerated field values and field-level validation.
- Report schemas and dashboard calculations.

These decisions affect architecture, security, data, and acceptance behavior and therefore cannot be safely inferred under the invocation policy.

## 6. Data and integration contracts

### Explicit data shapes

- **User profile:** email, password credential, name, role, department, start date.
- **Task:** date, title, description, category, status, priority.
- **Issue:** date, title, description, severity, status, resolution notes.
- **Feedback:** date, subject, type (`Positive`, `Suggestion`, or `Concern`), details.
- **Note:** date, title, content, tags.
- **Report request:** date range and content selection of tasks, issues, feedback, or combined.

### Contracts requiring approval

- Identifier type and representation.
- Required/optional fields, length limits, date/timezone handling, uniqueness rules, and enumerated values other than feedback type.
- Ownership fields and manager-to-recruit assignment representation.
- API endpoints, error envelope, pagination, sort order, and filtering query syntax.
- CSV columns/escaping/encoding and PDF layout/content.

## 7. Security and privacy

The BRD establishes roles but does not fully define authorization. Planning is blocked until role assignment, record ownership, manager oversight, admin powers, and authentication/session behavior are clarified. At minimum, approval must make it possible to verify:

- Unauthenticated users cannot access protected diary or reporting data.
- Each role can access only the data and operations authorized for that role.
- Passwords are not stored or returned in plaintext.
- Report downloads enforce the same visibility rules as on-screen data.

No specific hashing library, token format, cookie policy, or session duration is selected in this draft.

## 8. Failure and recovery behavior

The BRD does not define validation errors, authentication failures, missing records, unauthorized operations, report-generation failures, database reset behavior, or recovery after a backend restart. `REQ-017` and `E005-S003` capture the need for approved, testable behavior without selecting it.

## 9. Observability

No production observability requirement is stated. For implementation evaluation, the minimum proposed evidence is backend request/error logging without credentials or diary content, deterministic automated tests, and visible user-facing error states. This remains unapproved because log retention, sensitive-data treatment, and operational environment are unspecified.

## 10. Deployment assumptions

No public deployment is in scope. The BRD calls the project greenfield and the invocation mandates an in-memory database. Whether the application is expected to retain data across process restarts is unresolved and materially affects acceptance.

## 11. Acceptance strategy

- API tests for authentication, authorization, validation, CRUD/filter behavior, dashboard calculations, and report generation.
- Frontend component/integration tests for forms, filtering, role-gated navigation, summaries, and errors.
- Playwright scenarios for each independently evaluable implementation group.
- Artifact-level checks for PDF/CSV downloads.
- Responsive checks at approved viewport breakpoints.
- Negative and authorization scenarios for every protected operation.

Specific expected results remain blocked where the BRD does not define the relevant rule.

## 12. Open clarification questions

1. **Q-001 — Persistence:** Must data survive a backend restart? If yes, the mandated in-memory SQLite database conflicts with that lifetime unless an approved snapshot/restore mechanism is added.
2. **Q-002 — Sign-up and roles:** Which role may a public sign-up select, if any? Are manager/admin accounts created only by an admin or seed process?
3. **Q-003 — Authorization:** Are recruits limited to their own records? Can managers only view, or also edit, records of assigned recruits? Can admins edit/delete diary records or only view them?
4. **Q-004 — Oversight relationship:** How is a manager linked to the recruits they oversee, and who may create or change that relationship?
5. **Q-005 — Profile management:** Who may edit name, department, start date, role, and email? Which fields are required and what validation applies?
6. **Q-006 — Diary lifecycle:** The BRD explicitly grants full CRUD only for tasks. May issues, feedback, and notes also be viewed, edited, or deleted after creation, and by whom?
7. **Q-007 — Field rules:** What are the allowed task categories/statuses/priorities and issue severities/statuses, and what length/date/tag validation is required?
8. **Q-008 — Dashboard:** What scope, ordering, “recent” limit, and task-completion formula should the dashboard use?
9. **Q-009 — Reports:** What rows/columns, ordering, summary calculations, timezone/date inclusivity, filenames, and formatting are required for each PDF/CSV report type?
10. **Q-010 — Authentication contract:** Should authentication use a server session/cookie or bearer token, and what password rules, session duration, logout, and failed-login behavior are required?
11. **Q-011 — API contract:** Is a JSON REST API the approved interface, and are there mandated endpoint names, status codes, pagination, or error shapes?
12. **Q-012 — Additional features:** Which two additional features are required, and are they part of this implementation plan or a later approved extension?
13. **Q-013 — Responsive/error acceptance:** Which browser/viewports must pass, and what user-visible behavior is required for validation, authorization, server, and report-generation failures?

## 13. Approval gate

This package is `BLOCKED_CLARIFICATION`. Human answers to the material questions above must be incorporated without renumbering existing IDs, followed by revalidation and approval before generation or tracker publication.
