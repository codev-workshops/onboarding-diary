# Progress

## How to use this file

This file is the living status record for the Onboarding Diary project and the shared place for
cross-session feedback.

- **At the END of every session, before ending it,** update this file: set the status of each phase
  you touched, add any decisions you made to the Decisions Log, record anything broken or deferred
  under Known Issues, and add notes for the next session under Feedback / Cross-session Notes.
- Keep entries short, dated, and factual. Prefer appending over rewriting history.
- Scope comes from [`SOURCE_REQUIREMENTS.md`](./SOURCE_REQUIREMENTS.md) (immutable) as elaborated in
  [`REQUIREMENTS.md`](./REQUIREMENTS.md). If work reveals a scope question, record it here and in
  the "Open Questions" section of `REQUIREMENTS.md` rather than silently deciding.
- Status values: `Not Started`, `In Progress`, `Blocked`, `Done`.

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| Phase 1 | Project scaffold - Spring Boot project, build config, database connection, base packages | Not Started | |
| Phase 2 | Auth + Profile - signup/login/logout, password hashing, roles, profile view/edit | Not Started | |
| Phase 3 | Task Log + Issue Log - CRUD, filters, ownership rules | Not Started | |
| Phase 4 | Feedback Notes + Additional Notes - feedback submission, notes CRUD with tags | Not Started | |
| Phase 5 | Dashboard - summary counts, task completion progress, open issues, recent entries | Not Started | |
| Phase 6 | Reports - date-range reports with PDF/CSV export, manager reporting on overseen recruits | Not Started | |

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-27 | Documentation-only baseline: `SOURCE_REQUIREMENTS.md`, `REQUIREMENTS.md`, `PROGRESS.md`. No application code or build tooling yet. | Requirements elaboration precedes implementation. |
| 2026-07-27 | Manager access to recruit data is strictly read-only; only New Recruits create feedback notes. | Product owner decision. |
| 2026-07-27 | Task categories are an Admin-maintained list seeded with Development, Documentation, Meetings, Training, Support, Other. | Product owner decision. |
| 2026-07-27 | Departments are an Admin-maintained list seeded with a basic set plus Other. | Product owner decision. |
| 2026-07-27 | Architecture: single layered Spring Boot monolith (controller/service/repository) with REST API + responsive web frontend, PostgreSQL. | Simplest design that covers the stated scope; see `REQUIREMENTS.md` section 3. |

## Known Issues

- Open items that block specific phases are tracked in `REQUIREMENTS.md` section 8.2.1 (first Admin
  bootstrap, local PostgreSQL setup, auth mechanism confirmation, frontend technology, PDF library,
  dashboard metric definitions).

## Feedback / Cross-session Notes

- 2026-07-27: Requirements documentation created. Next session starts with Phase 1 (project
  scaffold). Read `REQUIREMENTS.md` sections 2-6 before writing code, and check
  "Open Questions / Assumptions" for anything that needs confirmation before it is implemented.
