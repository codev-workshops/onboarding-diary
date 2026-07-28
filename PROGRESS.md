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
| Phase 1 | Project scaffold - Spring Boot project, build config, database connection, base packages | Done | 2026-07-28: Maven/Spring Boot 3.2 scaffold, Flyway schema for `department` + `users`, Docker Compose Postgres, H2-backed tests, Admin bootstrap, public health check. |
| Phase 2 | Auth + Profile - signup/login/logout, password hashing, roles, profile view/edit | Done | 2026-07-28: JWT auth (jjwt), signup/login/logout REST + Thymeleaf pages, `/api/me` profile view/edit, public `/api/departments`, 30 tests green. |
| Phase 3 | Task Log + Issue Log - CRUD, filters, ownership rules | Done | 2026-07-28: `/api/tasks` and `/api/issues` CRUD + filters, `GET /api/categories`, Flyway `V3`-`V6` (`task_category` + seed, `task_entry`, `issue_entry`, `manager_assignment`), owner/Admin write and Manager-overseen read authorization, 55 tests green. |
| Phase 4 | Feedback Notes + Additional Notes - feedback submission, notes CRUD with tags | Done | 2026-07-28: `/api/feedback` and `/api/notes` CRUD + filters, Flyway `V7` (`feedback_note`, `additional_note`, `note_tag`), recruit-only feedback creation, tag normalisation and tag search, 85 tests green. |
| Phase 5 | Dashboard - summary counts, task completion progress, open issues, recent entries | Done | 2026-07-28: `GET /api/dashboard` with `userId?`, counts for all four entry types, task completion over all time, open issues (`OPEN`/`IN_PROGRESS`) and the 10 most recent entries; no new migration; 102 tests green. |
| Phase 6 | Reports - date-range reports with PDF/CSV export, manager reporting on overseen recruits | Done | 2026-07-28: `GET /api/reports` (PDF/CSV download) and `GET /api/reports/preview` (JSON), Apache PDFBox + Apache Commons CSV (D6), range validation, empty-range "no entries" reports, no new migration; 134 tests green (32 new). |

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
| 2026-07-28 | Root package `com.workshop.onboardingdiary` with layered packages `controller`, `service`, `repository`, `entity`, `dto`, `config`, `bootstrap`. | Matches the layering in `REQUIREMENTS.md` section 3. |
| 2026-07-28 | Flyway is the versioned-migration tool; Flyway pinned to 10.10.0 (`flyway-core` + `flyway-database-postgresql`) overriding the 9.x version managed by Spring Boot 3.2. | `flyway-database-postgresql` only exists from Flyway 10, and Boot 3.2 does not manage its version. |
| 2026-07-28 | Migration SQL is portable ANSI SQL (`GENERATED BY DEFAULT AS IDENTITY`, plain `UNIQUE`/`CHECK` constraints) with no Postgres-only syntax. | The same migrations must apply to Postgres and to H2 in PostgreSQL mode (D3). |
| 2026-07-28 | Case-insensitive uniqueness of `department.name` and `users.email` is enforced in application code; the database has plain `UNIQUE` constraints. | H2 does not support functional (`LOWER(name)`) unique indexes, so a functional index would break the test database. |
| 2026-07-28 | Only `Department` and `User` entities/tables exist so far; the remaining tables are created by the phase that needs them. | Phase 1 scope: scaffold plus the Admin bootstrap. |
| 2026-07-28 | Bootstrap Admin config is bound to `AdminBootstrapProperties` (`onboarding-diary.admin.*`) fed by the `ADMIN_*` environment variables. | Keeps environment wiring in configuration and makes the runner unit-testable. |
| 2026-07-28 | Test configuration lives in `src/test/resources/application-test.yml` and is activated with `@ActiveProfiles("test")`. | Keeps the H2 test datasource out of the production artifact (D3). |
| 2026-07-28 | Phase 2: JWT library is `io.jsonwebtoken:jjwt` 0.12.6 (`jjwt-api` compile, `jjwt-impl`/`jjwt-jackson` runtime), signed with HS256. | Small, Apache-2.0, no Spring-version coupling; the 0.12 API is the current one. |
| 2026-07-28 | Phase 2: tokens live 8 hours (`onboarding-diary.jwt.expiry`, default `PT8H`) and are bound with `JwtProperties` alongside the existing `jwt.secret`. | Matches the assumed lifetime in `REQUIREMENTS.md` section 7; keeps environment wiring in configuration. |
| 2026-07-28 | Phase 2: page authentication uses an HttpOnly, SameSite=Lax cookie named `ACCESS_TOKEN`, path `/`, `Secure` controlled by `JWT_COOKIE_SECURE` (false for local HTTP); API clients may instead send `Authorization: Bearer`. | Decision D4; the cookie keeps the token out of JavaScript while local development runs over plain HTTP. |
| 2026-07-28 | Phase 2: if `JWT_SECRET` is absent or shorter than 32 bytes the application logs a warning and generates a random signing key at startup instead of failing. | Keeps local startup frictionless; tokens simply do not survive a restart. |
| 2026-07-28 | Phase 2: department existence and `active` are enforced in `AuthService`/`ProfileService` (case-insensitive lookup), returning a field-level `department` error. | Closes the Phase 1 known issue that case-insensitive/active checks must live in the service layer. |
| 2026-07-28 | Phase 2: security is stateless (`SessionCreationPolicy.STATELESS`) with CSRF disabled; unauthenticated HTML requests redirect to `/login` while `/api/**` returns `401`. | Stateless JWT needs no CSRF token, and pages and API clients need different unauthenticated behaviour. |
| 2026-07-28 | Phase 2: login failures (wrong password, unknown email, deactivated account) all return the same `401` body "Invalid email or password". | US-R02: no user enumeration. |
| 2026-07-28 | Phase 3: `ManagerAssignment` (§2.8) is built as a minimal read-only dependency of the Manager-overseen read requirement - table, entity, repository and the `existsByManagerIdAndRecruitId` oversight check only. No admin endpoints create or delete assignments; tests seed rows through the repository. | The Manager read path in §4.2/§4.3/§6.2 cannot be implemented or tested without oversight data, but assignment management is admin work (§4.8) belonging to a later phase. |
| 2026-07-28 | Phase 3: admin task-category maintenance (`POST`/`PUT /api/categories`, §4.9) is deferred; only the authenticated read `GET /api/categories` is delivered. | US-A04 is admin maintenance and the Phase 3 notes did not include it; categories are seeded by migration `V4`. |
| 2026-07-28 | Phase 3: entry authorization lives in `EntryAccessService` (owner or Admin may write, Manager may read only assigned recruits) and raises `AccessDeniedException`, mapped to `403` by `ApiExceptionHandler`. | Keeps one authorization implementation shared by the Task and Issue logs (§6.2). |
| 2026-07-28 | Phase 3: filters are AND-combined in repository JPQL with null-tolerant parameters, and an unknown `category` filter is a field-level `400`. | Matches US-R05/US-R07; an empty result is an empty list, not an error. |
| 2026-07-28 | Phase 4: `FeedbackNote` and `AdditionalNote` mirror the Phase 3 structure (entity, repository with a null-tolerant JPQL `search`, service, controller, request/response records) and reuse `EntryAccessService` for ownership, Manager-overseen reads and the entry-date rules. | One authorization implementation for all four entry types (§6.2); no duplicated checks. |
| 2026-07-28 | Phase 4: the recruit-only feedback create rule (§6.2) is enforced in `FeedbackService` by raising `AccessDeniedException` (403) for any caller whose role is not `NEW_RECRUIT`; additional notes stay open to every role for their own data. | §4.4 restricts only the feedback create; §4.5 does not restrict notes by role. Keeping the check in the service keeps it testable and consistent with the rest of the authorization. |
| 2026-07-28 | Phase 4: tags are normalised (trim, lower-case, de-duplicate) in `NoteService` before saving, and the `tag` filter is normalised the same way; tag length (1-30) and tag count (max 10, counted after de-duplication) raise a single `tags` field error. | US-R09 requires normalised tags and tag search. Per-element bean validation would produce `tags[0]` error keys, which breaks the `$.errors.<field>` error shape used everywhere else. |
| 2026-07-28 | Phase 4: note tags live in `note_tag` (`note_id`, `tag`) as a JPA `@ElementCollection` with a composite primary key and `ON DELETE CASCADE`; `note_id` indexes the tag column for tag search. | §2.5/§2.9 model tags as a child table of values, not an entity; the composite key makes duplicate tags impossible in the database too. |
| 2026-07-28 | Phase 4: `feedback_note.details` and `additional_note.content` are `NOT NULL` (`VARCHAR(5000)` / `VARCHAR(10000)`), matching the required long-text fields in §6.1. | Both fields are required by §2.4/§2.5, unlike the optional task/issue descriptions. |
| 2026-07-28 | Phase 4: no §4.8 admin endpoints and no Thymeleaf pages for `/feedback` and `/notes`; oversight rows are still seeded through `ManagerAssignmentRepository` in tests. | §2.8/§4.8 delivery notes keep admin user management and assignment maintenance in the dedicated admin phase. |
| 2026-07-28 | Phase 2: CSRF stays disabled even though pages authenticate with the `ACCESS_TOKEN` cookie, which browsers send automatically. | Product owner decision after a review flagged it; `SameSite=Lax` plus HttpOnly covers the classic vectors and no CORS origins are allowed. Revisit if cross-site clients or non-Lax flows appear. |
| 2026-07-28 | Phase 5: the dashboard is assembled in `DashboardService` from counting queries (`countByOwnerId`, `countByOwnerIdAndStatus`) plus a top-10 query per entry type, merged and truncated to 10 in the service. | Counting in the database avoids loading whole entry lists, and each type can contribute at most 10 rows to a 10-row result, so four small queries are enough. |
| 2026-07-28 | Phase 5: recent entries are ordered by entry date, then creation timestamp, then id, all descending; the id is only a final stable tie-break. | D7 fixes date and creation timestamp; two entries created in the same instant still need a deterministic order for the API and its tests. |
| 2026-07-28 | Phase 5: `percentComplete` is an integer rounded half-up, returned next to the raw `completedTasks`/`totalTasks`. | US-R10 asks for a whole-number percentage; keeping the raw counts saves clients re-deriving them. |
| 2026-07-28 | Phase 5: dashboard authorization is delegated entirely to `EntryAccessService.resolveListTarget`, so an unknown `userId` is a `403` rather than a `404`, exactly like the entry lists. | One authorization implementation for lists and the dashboard (§6.2); it also avoids revealing whether a user id exists. |
| 2026-07-28 | Phase 5: the `/dashboard` Thymeleaf page is still not built, and the admin phase (§4.8) stays after Phase 6, as considered in the Phase 5 hand-off notes. | Phase 5 scope is the dashboard summary API; sign-up and login keep landing on `/profile` until the page work happens, and oversight data stays seeded through the database. |
| 2026-07-28 | D6 - PDF library = Apache PDFBox (`org.apache.pdfbox:pdfbox` 3.0.2). | PDF library = Apache PDFBox, Apache-2.0, chosen to satisfy the stated license preference without requiring an LGPL/MPL exception. |
| 2026-07-28 | D6 - CSV library = Apache Commons CSV (`org.apache.commons:commons-csv` 1.11.0), also Apache-2.0. | Same licence preference as the PDF choice; quoting and escaping are handled by the library instead of hand-written CSV. |
| 2026-07-28 | Phase 6: `ReportService` assembles one `ReportResponse` (recruit, range, `totalEntries` and the four entry lists) that the JSON preview, the CSV renderer and the PDF renderer all consume. | One content assembly and one authorization call for all three outputs; the preview is literally the same content the files carry. |
| 2026-07-28 | Phase 6: report content comes from the existing repository `search` methods with only the date bounds set, and authorization from `EntryAccessService.resolveListTarget`, exactly as `DashboardService` does. | No new authorization or query code for reports (§4.7, §6.2); an unknown `userId` stays a `403` rather than a `404`. |
| 2026-07-28 | Phase 6: `dateFrom`, `dateTo` and `format` are bound as raw strings in `ReportController` and validated in `ReportService`/`ReportFormat` as `FieldValidationException`s. | Keeps every report failure in the `$.errors.<field>` shape used by the rest of the API instead of Spring's generic binding failure for an unparseable query parameter. |
| 2026-07-28 | Phase 6: an empty range renders a complete report with a "No entries in the selected date range" line plus a "No entries" marker in each empty section, in both formats. | US-R11 requires an empty range to produce a report rather than an error, and a zero-byte file would look like a failed download. |
| 2026-07-28 | Phase 6: the download filename is `onboarding-report-<recruit-name>-<dateFrom>-to-<dateTo>.<pdf\|csv>`, with the name lower-cased and reduced to `a-z0-9-`. | US-R11 asks for a descriptive filename; restricting the character set keeps the `Content-Disposition` header and the saved file portable. |
| 2026-07-28 | Phase 6: the PDF is laid out as a paginated list of text lines (Helvetica, wrapped at 95 characters) rather than a table library. | PDFBox draws text, not tables; a line list keeps the renderer small and makes the content extractable with `PDFTextStripper` in tests. |

## Known Issues

- Resolved in Phase 6: D6 is decided and implemented - PDF via Apache PDFBox and CSV via Apache
  Commons CSV, both Apache-2.0. No decision is open any more.
- Remaining non-blocking questions are listed in `REQUIREMENTS.md` section 8.2 (questions 1-5;
  question 6 is resolved by D6).
- Resolved in Phase 2: `UserDetailsServiceImpl` + the JWT filter replace the generated default
  password, Thymeleaf pages exist for `/login`, `/signup` and `/profile`, and case-insensitive
  email uniqueness plus the active-department check are enforced in `AuthService`/`ProfileService`.
- Only the profile pages exist so far; `/dashboard` is a Phase 5 page, so sign-up and login
  currently land on `/profile` instead of the dashboard promised by US-R01/US-R02.
- There is no token refresh or revocation list: a JWT stays cryptographically valid for its full
  8 hours and logout only clears the cookie, so a token copied out of a browser stays usable until
  it expires. Deactivating a user does take effect immediately because the JWT filter reloads the
  account on every request and rejects disabled users.
- CSRF tokens are not issued: state-changing endpoints such as `PUT /api/me` and
  `POST /api/auth/logout` rely on the cookie's `SameSite=Lax` flag rather than a CSRF token.
  Accepted deliberately (see the Decisions Log); it is a hardening gap, not an open hole.
- Admin-only behaviour (role changes, deactivation, the last-active-admin rule, creating and
  removing manager assignments) and reference-data maintenance are not implemented; only the
  read-only `GET /api/departments` and `GET /api/categories` exist.
- Phase 3: `manager_assignment` rows can only be created directly in the database (or by a test)
  until the admin endpoints in §4.8 exist, so Manager oversight is not yet configurable from the
  application.
- Phase 3: entry lists are not paginated yet; §4.2/§4.3 mention paging and the endpoints return
  the full filtered list ordered by entry date descending.
- Phase 3: no Thymeleaf pages for `/tasks` and `/issues`; the REST API is the only interface so
  far.
- Phase 4: no Thymeleaf pages for `/feedback` and `/notes` either; all four entry types are
  API-only, so §5.1 still has only the login, signup and profile pages.
- Phase 4: feedback and note lists are not paginated, like the Phase 3 lists; §4.4/§4.5 mention
  paging and the endpoints return the full filtered list ordered by entry date descending.
- Phase 4: the `tag` filter matches one tag at a time (exact match after normalisation); §4.5 does
  not ask for multi-tag or partial-tag search, so neither is implemented.
- Phase 4: nothing consumes the new entry types yet - dashboard counts (§4.6) and reports (§4.7)
  come in Phases 5 and 6. Both halves are closed now: Phase 5 the dashboard, Phase 6 the reports.
- Phase 5: `/dashboard` has no Thymeleaf page, so sign-up and login keep landing on `/profile`
  instead of the dashboard promised by US-R01/US-R02, and the summary is reachable only through
  `GET /api/dashboard`.
- Phase 5: the dashboard is recomputed on every request with no caching, and nothing about it is
  configurable - the recent-entries limit of 10 and the open-issue statuses are fixed by §4.6/D7.
- Phase 5: `openIssues` returns every open issue with no cap or paging, so a recruit with many open
  issues gets a long list; §4.6 does not ask for a limit.
- Phase 5: dashboard oversight still depends on `manager_assignment` rows seeded directly in the
  database, like the Phase 3 and 4 read paths, until the §4.8 admin endpoints exist.
- Phase 6: reports are API-only - there is no `/reports` Thymeleaf page, so a browser user has to
  call `GET /api/reports` directly to download a file.
- Phase 6: a report always covers exactly one recruit; §8.2 question 2 (multi-recruit or
  department-wide reports) is still open and nothing was built for it.
- Phase 6: the whole report is assembled in memory and returned as a byte array rather than being
  streamed, and the range is not capped, so a very wide range for a very active recruit produces a
  correspondingly large response. §7 states no scale targets.
- Phase 6: the PDF uses the standard Helvetica font, so characters outside WinAnsi (for example
  non-Latin scripts or emoji in an entry title) are rendered as `?`. The CSV is UTF-8 and unaffected.
- Phase 6 audit finding (confirms the PR #76 review comment): note tags are *not* counted after
  de-duplication as §6.1 documents. `@Size(max = 10)` on `NoteRequest.tags` runs first and rejects
  any request with more than 10 raw tags, so 11 tags that de-duplicate to 10 distinct values are
  rejected with `400 $.errors.tags` - verified against the running endpoint during this phase. The
  service check that counts after de-duplication is therefore unreachable for longer lists. The
  deviation is documented in `REQUIREMENTS.md` §4.5; deciding which of the two rules wins is a
  product question and no code was changed for it in Phase 6.

## Feedback / Cross-session Notes

- 2026-07-27: Requirements documentation created. Next session starts with Phase 1 (project
  scaffold). Read `REQUIREMENTS.md` sections 2-6 before writing code, and check
  "Open Questions / Assumptions" for anything that needs confirmation before it is implemented.
- 2026-07-28: Phase 1 complete. Validated: `./mvnw clean verify` (8 tests, all green), Flyway V1/V2
  applied to a fresh Docker Compose Postgres and to fresh in-memory H2, `/health` and
  `/actuator/health` reachable unauthenticated, and the Admin bootstrap creating an Admin on a
  fresh database and reporting "already exists" on restart without duplicating. Phase 2+ features
  (auth endpoints, JWT issuance, entry CRUD, dashboard, reports) were deliberately not implemented
  or tested.
- 2026-07-28: Notes for Phase 2 - build on `SecurityConfig` (the `BCryptPasswordEncoder` bean is
  already there) by adding a `UserDetailsService`, the JWT filter, and the login/signup endpoints;
  read `JWT_SECRET` from the existing `onboarding-diary.jwt.secret` placeholder in
  `application.yml`. Signup must reject duplicate emails case-insensitively and validate the
  department against the seeded list. New tables (task_category, task_entry, issue_entry,
  feedback_note, additional_note, note_tag, manager_assignment) go into new `V3+` migrations using
  the same portable SQL style so the H2 suite keeps working. Tests use
  `@ActiveProfiles("test")`; the whole suite must stay runnable with no external database.
- 2026-07-28: Phase 2 complete. Validated with `./mvnw clean verify` (30 tests, all green) against
  in-memory H2: sign-up success/failures (duplicate email case-insensitively, invalid email,
  short password, missing fields, unknown and inactive department), login success, generic
  failure message with no enumeration, deactivated users blocked, logout clearing the cookie,
  `GET/PUT /api/me` including email immutability and role read-only, public `GET /api/departments`,
  and page access rules. Not implemented or tested: everything from Phase 3 onwards.
- 2026-07-28: Notes for Phase 3 - Task Log + Issue Log CRUD with ownership rules. Add new `V3+`
  Flyway migrations in the same portable SQL style (`GENERATED BY DEFAULT AS IDENTITY`, plain
  `UNIQUE`/`CHECK`) for `task_category`, `task_entry` and `issue_entry`, and seed the task
  categories the way `V2` seeds departments. Enforce ownership in the service layer (owner or
  Admin may write, Managers read-only) and return `403` for other users' entries; reuse
  `FieldValidationException` + `ApiExceptionHandler` for field-level errors and the
  `Principal`-based lookup used by `MeController`. Keep the active-lookup check pattern from
  `AuthService` when resolving task categories, and keep the suite runnable with
  `@ActiveProfiles("test")` and no external database.
- 2026-07-28: Phase 3 complete. Validated with `./mvnw clean verify` (55 tests, all green) against
  in-memory H2: Task and Issue field validation (required fields, title 1-150, description and
  resolution notes max 5000, every enum value accepted and invalid values rejected, `yyyy-MM-dd`
  accepted and other formats rejected, future dates and dates before the owner's start date
  rejected, resolution notes required for `RESOLVED`/`CLOSED`), CRUD round-trips, every filter
  individually and combined, the authenticated category list, `401` for unauthenticated access,
  and the full role matrix (owner, non-owner recruit, overseeing Manager read-only, unassigned
  Manager forbidden, Admin full). Not implemented or tested: Phase 4+ entry types, dashboard,
  reports, admin user management and assignment endpoints (§4.8), admin category maintenance
  (§4.9), and paging.
- 2026-07-28: Phase 3 was delivered in PR #75
  (https://github.com/codev-workshops/onboarding-diary/pull/75), stacked on the Phase 2 branch
  `devin/phase-2-auth-profile` (PR #74). Phase 4 should branch from `devin/1785213965-phase3-task-issue-logs`
  (PR #75's branch) while those PRs are still open.
- 2026-07-28: Notes for Phase 4 - Feedback Notes and Additional Notes with tags. Add `V7+`
  migrations for `feedback_note`, `additional_note` and `note_tag` in the same portable SQL style,
  and reuse `EntryAccessService` for ownership, Manager-overseen reads and the entry-date rules
  instead of duplicating the checks. Only New Recruits may create feedback (§6.2), which is the
  first role-restricted create in the codebase. Consider whether the admin phase (users, roles,
  manager assignments, category and department maintenance) should be scheduled before the
  dashboard, since oversight data is currently only seedable through the database.
- 2026-07-28: Phase 4 complete. Validated with `./mvnw clean verify` (85 tests, all green) against
  in-memory H2: feedback field validation (`type` accepting every enum value and rejecting unknown
  ones with `$.errors.type`, required `entryDate`/`subject`/`type`/`details`, subject 1-150 and
  details 1-5000 at and over the limit, `yyyy-MM-dd` accepted and other formats rejected, future
  dates and dates before the owner's start date rejected), note field validation (required
  `entryDate`/`title`/`content`, title 1-150, content 1-10000, tags optional, tag length 1-30, at
  most 10 tags, the same date checks), tag normalisation on write (trim, lower-case, de-duplicate)
  and on search (mixed case and padded filters match the stored tag), CRUD round-trips for both
  entities, every filter individually and combined (`type`, `tag`, `dateFrom`, `dateTo`), an unknown
  `type` filter returning `400`, `401` for missing and invalid bearer tokens, the full role matrix
  for both entities (owner full access, non-owner recruit denied, overseeing Manager read-only,
  unassigned Manager forbidden, Admin full), and the recruit-only feedback create rule (New Recruit
  `201`; Manager and Admin `403`, while both may still create their own notes). Not implemented or
  tested: dashboard (§4.6), reports (§4.7), admin user management and assignment endpoints (§4.8),
  admin category maintenance (§4.9), paging, and Thymeleaf pages for the entry types. Migration
  `V7` was additionally applied to a fresh Docker Compose Postgres 16 to confirm the SQL stays
  portable.
- 2026-07-28: Phase 4 was delivered stacked on the Phase 3 branch
  `devin/1785213965-phase3-task-issue-logs` (PR #75) as PR #76
  (https://github.com/codev-workshops/onboarding-diary/pull/76), which is still open. Phase 5 should
  branch from the tip of the Phase 4 branch `devin/1785216240-phase4-feedback-notes` (PR #76) and
  read `REQUIREMENTS.md` and `PROGRESS.md` from that tip, since no PR has been merged to `main`.
- 2026-07-28: Notes for Phase 5 - Dashboard (§4.6, US-R10, US-M03, D7). All four entry
  repositories now exist, so the summary can be assembled from `TaskEntryRepository`,
  `IssueEntryRepository`, `FeedbackNoteRepository` and `AdditionalNoteRepository`; reuse
  `EntryAccessService.resolveListTarget` for the `userId?` parameter so the Manager-overseen and
  Admin read rules stay in one place. Task completion is completed / total tasks over all time with
  the percentage rounded to a whole number (0% when there are no tasks), open issues are status
  `OPEN` or `IN_PROGRESS`, and recent entries are the 10 latest across all four types by entry date
  with the creation timestamp breaking ties - every entity exposes `createdAt` for that. No new
  migration should be needed. Phase 5 is also the natural point to decide whether the admin phase
  (§4.8 user management and manager assignments) should come first, since oversight data is still
  only seedable through the database, and whether `/dashboard` should finally exist as a page so
  sign-up and login stop landing on `/profile`.
- 2026-07-28: Phase 5 complete. Validated with `./mvnw clean verify` (102 tests, all green) against
  in-memory H2: summary counts per entry type over a deterministic 14-entry dataset (and entries of
  another recruit excluded), task completion as completed/total over all time (40% for 2 of 5, 33%
  for 1 of 3, 60% for 3 of 5, unaffected by entry dates) and the 0-tasks edge returning 0% with no
  divide-by-zero, the empty-diary dashboard (all counts 0, no open issues, no recent entries), the
  open-issues filter containing exactly `OPEN` and `IN_PROGRESS` and excluding `RESOLVED`/`CLOSED`,
  the recent-entries window being exactly the 10 latest of 14 across all four types in
  latest-entry-date-first order with a forced creation-timestamp tie-break, and the full
  authentication and authorization matrix (missing and invalid bearer token `401`; owner sees own
  data without `userId`; another recruit `403`; overseeing Manager `200`; unassigned Manager `403`;
  Admin may pass any `userId`; unknown `userId` `403`). Not implemented or tested: reports (§4.7),
  admin user management and assignment endpoints (§4.8), admin category maintenance (§4.9), paging,
  the `/dashboard` and entry-type Thymeleaf pages, and any dashboard behaviour not stated in
  §4.6/US-R10/D7 (no date-window variant of the completion figure, no per-type recent-entry limits,
  no caching or performance targets). No new Flyway migration was needed, so the schema is unchanged
  from `V7`.
- 2026-07-28: Phase 5 was delivered stacked on the Phase 4 branch
  `devin/1785216240-phase4-feedback-notes` (PR #76) as PR #77
  (https://github.com/codev-workshops/onboarding-diary/pull/77) on branch `devin/1785218358-phase5-dashboard`, which is still open. Phase 6 should
  branch from the tip of that branch and read `REQUIREMENTS.md` and `PROGRESS.md` from there, since
  no PR has been merged to `main`.
- 2026-07-28: Notes for Phase 6 - Reports (§4.7, US-R11, US-M04, decision D6). Pick and
  licence-verify the PDF library first (D6 is the last open decision); prefer an Apache-2.0 option.
  `GET /api/reports` and `GET /api/reports/preview` take `userId?`, `dateFrom`, `dateTo` and
  `format`, so reuse `EntryAccessService.resolveListTarget` exactly as `DashboardService` does
  instead of writing new authorization, and reuse the four repository `search` methods for the
  date-range content. `dateFrom <= dateTo` and "not after today" are §6.1 validation rules and
  belong in the service as `FieldValidationException`s; an empty range must produce a "no entries"
  report rather than an error. Downloads need `Content-Disposition: attachment` with a filename
  carrying the recruit name and the range. No new migration should be needed. Still outstanding
  after Phase 6: the §4.8 admin phase (user management, manager assignments), §4.9 category
  maintenance, paging, and the Thymeleaf pages for `/dashboard`, `/tasks`, `/issues`, `/feedback`,
  `/notes` and `/reports`.
- 2026-07-27: Product owner answered the outstanding blockers; decisions D1-D7 are recorded above
  and in `REQUIREMENTS.md` section 8.2.1, with the details propagated into sections 1, 3, 4, 5,
  and 7. Phase 1 can begin: Spring Boot 3.2 + Thymeleaf + JPA scaffold, Docker Compose PostgreSQL,
  H2-backed tests, and the env-var Admin bootstrap.
- 2026-07-28: Phase 6 complete, and it is the last phase - nothing follows it in the plan.
  Validated with `./mvnw clean verify` (134 tests, all green, 32 of them new) against in-memory H2.
  **Tested in Phase 6:** report parameter validation (`dateFrom`/`dateTo` required, rejected when
  not `yyyy-MM-dd` or not a real calendar date, `dateFrom` after `dateTo` rejected, a range ending
  after today rejected while a range ending today is accepted, `format` required for downloads,
  unknown `format` rejected, `format` accepted case-insensitively, the preview enforcing the same
  date rules while needing no `format`); content correctness over a fixture dataset with one
  in-range entry per type plus four out-of-range entries (preview JSON, CSV text and PDF text
  extracted with `PDFTextStripper` all contain exactly the in-range entries and none of the
  out-of-range ones, and the range boundaries are inclusive); both download formats (`text/csv` and
  `application/pdf` content types, `Content-Disposition: attachment` with the descriptive
  `onboarding-report-test-user-2026-02-01-to-2026-02-28.<ext>` filename, non-empty bodies); the
  empty range producing a valid non-empty report carrying "No entries in the selected date range"
  in both formats and an empty JSON preview rather than an error; the renderer unit tests (filename
  derivation including a name with no usable characters, `ReportFormat.parse` failures as
  `FieldValidationException`s, one CSV section per entry type with a "No entries" marker in each
  empty section, optional long text rendered blank instead of "null", PDF pagination and wrapping
  over a 60-task report); and the full authentication/authorization matrix (missing and invalid
  bearer token `401`; owner reporting on self without `userId`; another recruit `403`; overseeing
  Manager `200`; unassigned Manager `403`; Admin with any `userId`; unknown `userId` `403`).
  **Not tested in Phase 6, because it is not implemented:** the `/reports` Thymeleaf page and every
  other page in REQUIREMENTS section 5.1 beyond `/login`, `/signup` and `/profile`; the section 4.8
  admin endpoints; the section 4.9 category/department maintenance endpoints; paging on any list;
  multi-recruit or department-wide reports; report scheduling, caching, streaming or size limits;
  and PDF pixel layout (only extracted text and page count are asserted, not visual appearance).
  No new Flyway migration was needed, so the schema is unchanged from `V7`.
- 2026-07-28: Phase 6 was delivered stacked on the Phase 5 branch `devin/1785218358-phase5-dashboard`
  (PR #77), which is still open, as is every PR from Phase 1 onwards - nothing has been merged to
  `main`, so `main` still holds only the initial commit.

## Final Project Status (2026-07-28)

End-of-project audit of `REQUIREMENTS.md` sections 1-7 after Phase 6, the last planned phase.

### Built

- **Section 1 user stories:** US-R01 sign-up, US-R02 login/logout, US-R03 profile (API plus the
  `/login`, `/signup`, `/profile` pages), US-R04/US-R05 task log CRUD and filters, US-R06/US-R07
  issue log CRUD and filters, US-R08 feedback notes, US-R09 additional notes with tags, US-R10
  dashboard summary, US-R11 reports; US-M02/US-M03/US-M04 manager read access, dashboard and reports
  for overseen recruits; US-M05 manager profile; US-A00 bootstrap Admin; US-A03 Admin read/write
  across all users' entries, dashboards and reports.
- **Section 2 data model:** every entity - `Department`, `User`, `TaskCategory`, `TaskEntry`,
  `IssueEntry`, `FeedbackNote`, `AdditionalNote` (+ `note_tag`), `ManagerAssignment` - in Flyway
  migrations `V1`-`V7`.
- **Section 3 architecture:** layered Spring Boot 3.2 monolith (controller/service/repository/
  entity + DTOs), Flyway-managed PostgreSQL, Docker Compose for local dev, H2 for tests, JWT
  auth, Apache PDFBox + Apache Commons CSV reporting.
- **Section 4 API:** 4.1 auth/profile, 4.2 tasks, 4.3 issues, 4.4 feedback, 4.5 notes, 4.6
  dashboard, 4.7 reports, and the two read endpoints of 4.9 (`GET /api/categories`,
  public `GET /api/departments`).
- **Section 6 validation:** all field rules of 6.1 for users, entries and report parameters, and the
  business rules of 6.2 that concern ownership, oversight, recruit-only feedback creation, entry
  date sanity and issue resolution notes.
- **Section 7:** JWT/BCrypt auth mechanism, environment-variable configuration, Docker Compose dev
  database, H2 test database, unit and integration tests as described.

### Never implemented across Phases 1-6

- **Section 4.8 admin phase in full** - `GET/POST /api/users`, `GET/PUT /api/users/{id}`,
  `GET /api/users/me/recruits`, and manager-assignment maintenance
  (`POST /api/users/{managerId}/recruits`, `DELETE .../{recruitId}`). Consequently **US-A01**
  (manage users, deactivation, last-active-Admin rule, role changes) and **US-A02** (assign recruits
  to managers) are not delivered, and **US-M01** ("see my recruits") has no endpoint or page:
  `manager_assignment` rows can only be inserted directly into the database.
- **Section 4.9 write half** - `POST/PUT /api/categories` and `POST/PUT /api/departments`, so
  **US-A04** (maintain categories and departments) is not delivered; both lists are only seeded by
  migrations `V2` and `V4` and are read-only at runtime.
- **Paging on every entry list** - sections 4.2, 4.3, 4.4 and 4.5 all mention paging and section 7
  says lists are paginated; every list endpoint returns the full filtered result ordered by entry
  date descending.
- **Section 5 Thymeleaf pages beyond `/login`, `/signup` and `/profile`** - `/dashboard`, `/tasks`,
  `/tasks/{id}`, `/issues`, `/issues/{id}`, `/feedback`, `/notes`, `/reports`, `/recruits`,
  `/recruits/{id}`, `/admin/users` and `/admin/reference-data` do not exist. Sign-up and login
  therefore land on `/profile` instead of the dashboard promised by US-R01/US-R02, the navigation
  and flows of section 5.2 are not built, and the responsive-UI expectation in section 7 is only met
  for the three pages that exist.
- **Section 6.2 rules that depend on the admin phase** - Admin-only role changes and
  activation/deactivation, the "last active Admin cannot be demoted or deactivated" rule, the
  "a user cannot be their own manager" rule, and Admin-only reference-data maintenance are not
  enforced anywhere, because no endpoint performs those operations. Email immutability, deactivated
  users being unable to log in, and the ownership/oversight rules are enforced.
- **Section 6.1 deviation** - note tag *count* is enforced before de-duplication by
  `@Size(max = 10)` on `NoteRequest.tags`, not after de-duplication as documented (see the Known
  Issues entry and `REQUIREMENTS.md` section 4.5); verified against the running endpoint during the
  Phase 6 audit. This confirms the PR #76 review finding.

### Section 8.2 open questions at project end

- **Still open:** 1 (multiple managers per recruit / managers of managers), 2 (reports covering
  several recruits at once), 3 (email verification / password reset), 4 (soft delete of entries),
  5 (data retention after onboarding).
- **Resolved:** 6 (PDF library) - Apache PDFBox for PDF and Apache Commons CSV for CSV, both
  Apache-2.0, decided and implemented in Phase 6 as decision D6.
