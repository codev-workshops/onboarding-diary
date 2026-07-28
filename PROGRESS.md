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
| 2026-07-27 | D1 - First Admin is bootstrapped on startup from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_DEPARTMENT`, `ADMIN_START_DATE`. | Product owner decision. |
| 2026-07-27 | D2 - Local dev PostgreSQL runs via Docker Compose with standard naming (`db` / `onboarding_diary` / 5432). | Product owner decision. |
| 2026-07-27 | D3 - Automated tests run against an in-memory database, never the dev instance. | Product owner decision. |
| 2026-07-27 | D4 - Authentication uses JWT bearer tokens. | Product owner decision. |
| 2026-07-27 | D5 - Frontend is server-rendered Thymeleaf templates. | Product owner decision. |
| 2026-07-27 | D6 - PDF export uses a small, licence-cleared library (specific library still to be picked before Phase 6). | Product owner decision. |
| 2026-07-27 | D7 - Dashboard: task completion = completed / total tasks overall; recent entries = last 10, latest first. | Product owner decision. |

## Known Issues

- No blockers to starting Phase 1. The only decision still open within an agreed direction is the
  specific PDF library (D6), needed before Phase 6.
- Remaining non-blocking questions are listed in `REQUIREMENTS.md` section 8.2.

## Feedback / Cross-session Notes

- 2026-07-27: Requirements documentation created. Next session starts with Phase 1 (project
  scaffold). Read `REQUIREMENTS.md` sections 2-6 before writing code, and check
  "Open Questions / Assumptions" for anything that needs confirmation before it is implemented.
- 2026-07-27: Product owner answered the outstanding blockers; decisions D1-D7 are recorded above
  and in `REQUIREMENTS.md` section 8.2.1, with the details propagated into sections 1, 3, 4, 5,
  and 7. Phase 1 can begin: Spring Boot 3.2 + Thymeleaf + JPA scaffold, Docker Compose PostgreSQL,
  H2-backed tests, and the env-var Admin bootstrap.
