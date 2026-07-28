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
| Phase 6 | Reports - date-range reports with PDF/CSV export, manager reporting on overseen recruits | Done | 2026-07-28: `GET /api/reports` (PDF/CSV download) and `GET /api/reports/preview` (JSON), Apache PDFBox + Apache Commons CSV (D6), range validation, empty-range "no entries" reports, no new migration; 135 tests green (33 new). |
| Phase 7 | UI completion - Thymeleaf pages for dashboard, task log, issue log, feedback, notes and reports with a shared navigation | Done | 2026-07-28: six pages wired to the existing REST API, shared nav fragment with role gating, sign-up/login land on `/dashboard`; no backend logic added; Admin UI deferred to a later dedicated phase; 138 tests green. |
| Extension 1: Search | Free-text search across Task Log, Issue Log, Feedback Notes and Additional Notes with a single global search bar | Done | Additional scope beyond the original 7 phases. 2026-07-28: `GET /api/search?q=&userId=` returning the four groups with per-group counts and truncation flags, one `searchText` query per entry repository (`lower(field) like lower(concat('%', :q, '%'))`, `distinct` tag join for notes), `SearchService` with the section 9.6 `q` rules, PostgreSQL-only Flyway `V8` trigram/GIN indexes on `db/migration-postgresql`, the nav search bar and the `/search` page; 166 tests green (28 new). |
| Extension 2: Manager Dashboards | Aggregate team-wide dashboard for a Manager across all overseen recruits (team counts, recruits with open CRITICAL/HIGH issues, recruits inactive 7 days) | Not Started | Elaboration only. 2026-07-28: `REQUIREMENTS.md` section 10 elaborated (US-MD01 Manager, US-MD02 Admin; `GET /api/manager-dashboard` with Admin-only `managerId`; counts/lists only, charts deferred; no new entities/tables/columns; 7-day inactivity and Admin per-manager view fixed as decisions). **This PR is documentation-only - no Java, SQL, Thymeleaf or test code added; the build is a separate future PR.** |

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
| 2026-07-28 | Phase 7: the six pages (`/dashboard`, `/tasks`, `/issues`, `/feedback`, `/notes`, `/reports`) are Thymeleaf shells that fetch their data from the existing `/api/**` endpoints with the `ACCESS_TOKEN` cookie; `PageController` only resolves the caller's profile for the navigation. | Phase 7 scope is UI completion with no new backend logic, and D4/D5 already give pages a cookie-authenticated fetch path. |
| 2026-07-28 | Phase 7: one navigation fragment (`templates/fragments/layout.html`) provides the `head` and `nav` blocks for every authenticated page, with each link gated by the roles the Section 5.1 table grants it. | Section 5.2 asks for one top navigation; a fragment keeps the role rules in a single place rather than repeated per page. |
| 2026-07-28 | Phase 7: the Admin UI (`/admin/users`, `/admin/reference-data`) is deferred to a later dedicated phase together with the Section 4.8 backend, and no admin nav entry is rendered. `/recruits` is deferred with it, because it needs `GET /api/users/me/recruits`. | Section 4.8 was never implemented, so an admin page would have no endpoints to call; manager assignments stay seeded directly in the database. |
| 2026-07-28 | Phase 7: Managers and Admins pick the user they are reading with a recruit-user-id field that is passed as the existing `userId` query parameter, instead of a recruit picker backed by a new endpoint. | Same reason as above - the recruit list endpoint is part of the deferred admin phase, while `userId` is already supported by every list, dashboard and report endpoint. |
| 2026-07-28 | Phase 7: sign-up, login and `/` land on `/dashboard`; `/profile` stays reachable from the navigation. | US-R01/US-R02 promise the dashboard as the landing page, and the Phase 5 known issue about landing on `/profile` is now closed. |
| 2026-07-28 | Extension 1: Search is **new scope beyond the original seven phases** and beyond `SOURCE_REQUIREMENTS.md`; it is elaborated in `REQUIREMENTS.md` section 9 and the "full-text search" bullet in section 8.3 is promoted from out-of-scope to approved scope. | Product owner request after Phase 7; the requirement is elaborated before any code, matching how phases 1-7 were run. |
| 2026-07-28 | Extension 1 design decision - search is **free text only** in the first iteration: it is not combined with the existing enum filters (task `status`/`category`, issue `status`/`severity`, feedback `type`) or date ranges. Combining them is deferred as possible future scope (`REQUIREMENTS.md` §9.2, assumption A4). | Keeps one small parameter surface on a single cross-entity endpoint; the per-entity list endpoints already offer those filters, and no need for the combination is stated. |
| 2026-07-28 | Extension 1 design decision - **a single global search bar** lives in the shared nav fragment `templates/fragments/layout.html` so it is on every page, with results on a dedicated `/search` page grouped by entity type. No per-page search boxes. | Search spans all four entry types, so a per-page box would be duplicated six times and scoped to one type each; the shared fragment already holds the one navigation (Phase 7 decision). |
| 2026-07-28 | Extension 1 architecture recommendation - plain case-insensitive SQL `LIKE` against the existing tables through the existing repository query pattern, with trigram/GIN (or standard) indexes on the searched columns, and explicitly **no Elasticsearch or other search engine**. | Thousands of short rows, no ranking/stemming/faceting requirement, a stated single-process + one-Postgres deployment, and ownership/oversight scoping that is already SQL - an external index would duplicate the authorization model and be eventually consistent. See `REQUIREMENTS.md` §9.3. |
| 2026-07-28 | Extension 1 open questions answered by the product owner: issue `resolution_notes` and additional-note tags **are** searchable (assumption A9); a search targets **one user at a time** with cross-recruit search deferred (A10); **no** match highlighting; **no** full-text-search threshold - park it until a performance issue is observed; **no** soft-delete handling. `REQUIREMENTS.md` §9.2 and §9.7 updated accordingly. | Product owner answers, 2026-07-28. Recorded as assumptions and "answered - not being built now" rather than open questions so the build session does not re-open them. |
| 2026-07-28 | Extension 1 API shape - one endpoint `GET /api/search?q=...&userId=...` returning results grouped by entity type, authorized by the existing `EntryAccessService.resolveListTarget` (`403` out of scope, including unknown ids). | One authorization call and one round trip for the global bar, consistent with `/api/dashboard` and `/api/reports`. |
| 2026-07-28 | Extension 1 build: the trigram migration is skipped on H2 by **path**, not by guarded SQL - `V8__create_search_trigram_indexes.sql` lives in `src/main/resources/db/migration-postgresql`, a sibling of `db/migration`, and only the application's `spring.flyway.locations` lists both. | Flyway scans a location recursively, so a `db/migration/postgresql` subdirectory would still be picked up by the tests' `classpath:db/migration`; a sibling path needs no vendor detection, no `DO $$` guard and no change to the test configuration. |
| 2026-07-28 | Extension 1 build: the note search query is `select distinct n from AdditionalNote n left join n.tags tag ...`, comparing `lower(tag)` with the lower-cased pattern like every other searched column. | The tag join multiplies rows, so a note with several matching tags would otherwise come back once per tag (`REQUIREMENTS.md` §9.3), and a `left join` keeps notes without tags matchable on title/content. Stored tags are already lower-cased, but a bare `tag` predicate would not match the `lower(tag)` trigram index of `V8`, so PostgreSQL could never use it. |
| 2026-07-28 | Extension 1 build: each response group is an object `{count, truncated, items}` rather than the bare array of the illustrative shape in §9.4, and the group cap is enforced by fetching 51 rows and reporting `truncated` when a 51st exists. | The per-type count and the per-group truncation flag of §9.4/§9.6 belong to the group they describe; one over-sized page is cheaper than a second counting query. Recorded as a build note in `REQUIREMENTS.md` §9.4. |
| 2026-07-28 | Extension 1 build: `q` is bound as an optional request parameter and validated in `SearchService` (trim, collapse whitespace, 2-100 characters) as `FieldValidationException`s, and `%`, `_` and `\` are escaped in the service before the JPQL `like ... escape '\'`. | Keeps a missing `q` in the same `$.errors.q` shape as a blank one instead of Spring's generic missing-parameter error, and keeps wildcard escaping in one place with the pattern it builds. |
| 2026-07-28 | Extension 1 build: the excerpt is ~200 characters of the first searched field containing the query, centred on the match, with `…` markers; for a note matched only through a tag the tag list is the excerpt source. | §9.6 asks for an excerpt around the first match; a tag-only match has no matching title or content to excerpt, and showing the tags explains why the row is in the results. |
| 2026-07-28 | Phase 6: every nullable filter parameter in the four repository `search` queries is wrapped in a `cast(...)`, for example `cast(:dateFrom as date) is null`. | PostgreSQL cannot infer the type of a bind parameter that is only compared with `null` and fails the whole query with "could not determine data type of parameter"; the cast makes the parameter typed. The H2 test database inferred the types, so the tests never saw it. |
| 2026-07-28 | Extension 2 (Manager Dashboards) is **new scope beyond the original seven phases, `SOURCE_REQUIREMENTS.md` and Extension 1**; elaborated in `REQUIREMENTS.md` section 10, specification-only with no code. It is an **aggregate** team view (team-wide counts + attention lists) distinct from the existing per-recruit dashboard of US-M03/§4.6. | Product owner request after Extension 1; the requirement is elaborated before any code, matching how phases 1-7 and Extension 1 were run. |
| 2026-07-28 | Extension 2 design decision - the dashboard is **counts and lists only; charts/visualizations are explicitly deferred to a separate future extension** (`REQUIREMENTS.md` §10.2, Q8). | Keeps the first iteration a thin aggregation over existing data with no charting library or client-side drawing code, consistent with the server-rendered, no-JS-build stance of §3/§5. |
| 2026-07-28 | Extension 2 API shape - one endpoint `GET /api/manager-dashboard` returning team-wide counts, recruits with open `CRITICAL`/`HIGH` issues and recruits inactive for 7 days; `managerId` is **Admin-only** (a Manager sees their own oversight scope). | One authorization call and one round trip for the team view, consistent with `/api/dashboard`, `/api/reports` and `/api/search`. |
| 2026-07-28 | Extension 2 authorization reuses the existing `EntryAccessService.resolveListTarget` pattern (default to caller, only Admin resolves another target, `403` for out-of-scope/unknown ids and for a non-Manager id, never `404`). | No new authorization concept; keeps id-existence hidden exactly like every other list, dashboard and report endpoint (§6.2). |
| 2026-07-28 | Extension 2 data-model impact - **no new entities, tables, columns or migration**; the dashboard is aggregation (count/exists) queries over the existing `task_entry`, `issue_entry`, `feedback_note`, `additional_note` tables joined to `manager_assignment`, reusing the four entry repositories and `ManagerAssignmentRepository`. | The team view needs only aggregation over existing owned entries scoped to the manager's assignments; the schema stays at `V7`. |
| 2026-07-28 | Extension 2 fixed decision (FD1) - **"recently inactive" = no entry of any type in the last 7 days**, a fixed default, not configurable and not a query parameter in this iteration. | Recorded as a settled decision so the build session does not re-open it (`REQUIREMENTS.md` §10.7). |
| 2026-07-28 | Extension 2 fixed decision (FD2) - an Admin gets a **per-manager view only**, one manager's team at a time via `managerId`; there is **no** global all-managers / cohort rollup. | Mirrors Search A10 (one target at a time) and keeps the endpoint and authorization identical for Manager and Admin callers; a cross-manager rollup is deferred (`REQUIREMENTS.md` §10.7, Q7). |

## Known Issues

- Resolved in Phase 6: the null-tolerant `search` queries added in Phases 3-4 failed on PostgreSQL
  whenever a filter was supplied (`GET /api/tasks?dateFrom=...` and every report returned `500`
  with `could not determine data type of parameter`). All four repositories now cast the nullable
  parameters. The whole flow (entry lists with each filter, the JSON preview and both downloads)
  was re-checked against a real PostgreSQL 16 instance, not only H2.
- The test suite runs on H2 only, so dialect-specific defects like the one above are not caught by
  it; there is no PostgreSQL-backed (for example Testcontainers) test profile.
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

- Phase 7: the Section 5.1 pages `/recruits`, `/recruits/{id}`, `/admin/users` and
  `/admin/reference-data` still do not exist, so US-M01 ("see my recruits") has no page and Admins
  have no UI; a Manager or Admin reads another user's data by typing the recruit's user id into the
  recruit field on the dashboard, entry list and report pages.
- Phase 7: pages are open to every role, so the "unauthorized page access redirects to the caller's
  dashboard with an explanatory message" rule in Section 5.1 is not implemented; a forbidden
  `userId` surfaces as the API's `403` message rendered in the page alert instead.
- Phase 7: entry lists on the pages show the full unpaginated result the API returns, matching the
  existing Phase 3/4 known issue - no paging controls were added.
- Phase 7: page behaviour is covered only by the server-side rendering tests in `PageAccessTest`
  (each page renders, `/` redirects to `/dashboard`, the feedback create form is absent for a
  Manager); there is no browser-level or JavaScript test suite, so the client-side fetch, form and
  download code is validated manually.
- Extension 1 (Search): migration `V8` (the `pg_trgm` extension and the GIN indexes) never runs in
  the test suite, because the H2 test database only scans `db/migration`. It is exercised only when
  the application starts against PostgreSQL, so a syntax error in it would surface at run time
  rather than in CI, and `CREATE EXTENSION pg_trgm` needs a database role allowed to create
  extensions (superuser in a default installation, which the Docker Compose dev role is).
- Extension 1 (Search): search is unpaginated like every other list; a group larger than 50 rows is
  truncated with a flag and no way to reach the rest, which is assumption A5 rather than a fix.
- Extension 1 (Search): a result row links to the owning list page (`/tasks`, `/issues`,
  `/feedback`, `/notes`), not to the individual entry, because the Phase 7 pages fold entry detail
  into inline edit forms and have no per-entry route or anchor.
- Extension 1 (Search): matching is accent-sensitive (assumption A3) and the excerpt is plain text
  with no highlighting (answered question Q3).

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
  Validated with `./mvnw clean verify` (135 tests, all green, 33 of them new) against in-memory H2.
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
  over a 60-task report, and entry text containing characters the standard PDF font cannot encode
  being replaced with `?` instead of failing the download); and the full authentication/authorization matrix (missing and invalid
  bearer token `401`; owner reporting on self without `userId`; another recruit `403`; overseeing
  Manager `200`; unassigned Manager `403`; Admin with any `userId`; unknown `userId` `403`).
  **Not tested in Phase 6, because it is not implemented:** the `/reports` Thymeleaf page and every
  other page in REQUIREMENTS section 5.1 beyond `/login`, `/signup` and `/profile`; the section 4.8
  admin endpoints; the section 4.9 category/department maintenance endpoints; paging on any list;
  multi-recruit or department-wide reports; report scheduling, caching, streaming or size limits;
  and PDF pixel layout (only extracted text and page count are asserted, not visual appearance).
  No new Flyway migration was needed, so the schema is unchanged from `V7`.
- 2026-07-28: Phase 6 was delivered stacked on the Phase 5 branch `devin/1785218358-phase5-dashboard`
  (PR #77) as PR #78 (https://github.com/codev-workshops/onboarding-diary/pull/78) on branch
  `devin/1785219953-phase6-reports`, which is still open, as is every PR from Phase 1 onwards -
  nothing has been merged to `main`, so `main` still holds only the initial commit.
- 2026-07-28: Notes for Phase 7 - UI completion (REQUIREMENTS sections 5.1 and 5.2). The six pages
  reuse the endpoints delivered in Phases 3-6 and add no backend logic: `/dashboard` reads
  `GET /api/dashboard`, `/tasks` and `/issues` do full CRUD against `/api/tasks` and `/api/issues`
  (with `GET /api/categories` filling the category dropdown), `/feedback` and `/notes` do CRUD
  against `/api/feedback` and `/api/notes`, and `/reports` drives `GET /api/reports/preview` plus
  the `format=pdf|csv` downloads. The Admin UI and `/recruits` are out of scope and stay with the
  deferred section 4.8 backend.
- 2026-07-28: Phase 7 complete. Validated with `./mvnw clean verify` (138 tests, all green, 3 new
  page tests) plus a manual pass in a browser against a Docker Compose PostgreSQL 16 instance.
  **Tested in Phase 7:** every page renders for a New Recruit and carries the shared navigation
  with no Admin entry, `/` redirects to `/dashboard`, sign-up and login land on `/dashboard`, the
  feedback create form is rendered only for New Recruits (a Manager sees the read-only notice
  instead), the dashboard renders counts, task completion, open issues and recent entries, task and
  issue create/edit/delete round-trips including server-side field errors rendered next to the
  field, the note tag input and tag filter, the report date range with the JSON preview and both
  file downloads, and a Manager reading an overseen recruit by user id while an unassigned target
  surfaces the API's `403` message.
  **Not tested or built in Phase 7, because it is out of scope:** the Admin pages and the section
  4.8 endpoints behind them, `/recruits` and `/recruits/{id}`, paging controls, the "redirect an
  unauthorized page request to the caller's dashboard" rule of section 5.1, and any JavaScript-level
  automated test - the client-side code is only exercised manually.
- 2026-07-28: Phase 7 was delivered stacked on the Phase 6 branch `devin/1785219953-phase6-reports`
  (PR #78) as PR #79 (https://github.com/codev-workshops/onboarding-diary/pull/79) on branch
  `devin/1785226946-phase7-ui`, which is still open. Every PR from Phase 1 onwards is still open and nothing has been merged to `main`, so a
  follow-up build session must branch from the tip of the Phase 7 branch and read `REQUIREMENTS.md`
  and `PROGRESS.md` from there. The natural next phase is the admin phase: the section 4.8
  endpoints, `/admin/users`, `/admin/reference-data`, `/recruits` and the section 4.9 write half,
  after which the nav gains its Admin and My Recruits entries and manager assignments stop being
  database-seeded.
- 2026-07-28: **Extension 1 (Search) elaborated - documentation only, no code.** Search is
  additional scope beyond the original seven phases. `REQUIREMENTS.md` gained section 9
  ("Extension: Search") in the style of sections 1-8: user stories per role with acceptance
  criteria (US-S01 recruit searches own entries, US-S02 manager searches own + overseen recruits,
  US-S03 admin searches everything, all `403` out of scope), the searchable field set across the
  four entry types, the data-model impact (no new tables; SQL `LIKE` on existing tables plus
  trigram/GIN indexing; a justified rejection of Elasticsearch), the `GET /api/search` endpoint,
  the global-search-bar UI with a `/search` results page, validation rules (minimum 2 characters,
  trimming and whitespace collapsing, wildcard escaping, friendly empty state, a 50-row per-group
  cap) and the assumptions and questions. Nothing was implemented: no entity,
  migration, repository query, service, endpoint, template or test was added, and the test suite is
  unchanged at 138 tests.
- 2026-07-28: Notes for the follow-up Search build session. Branch from the tip of this extension
  branch (`devin/1785230299-ext1-search`) and read `REQUIREMENTS.md` section 9 and this file from
  there - nothing has been merged to `main`, so the stack Phase 1 -> Phase 7 -> Extension 1 is still
  a chain of open PRs. Build order that fits the existing code: add one `search`-style query per
  repository (`TaskEntryRepository`, `IssueEntryRepository`, `FeedbackNoteRepository`,
  `AdditionalNoteRepository`) using `lower(field) like lower(concat('%', :q, '%'))` so it keeps
  working on H2 (D3), remembering the Phase 6 lesson that every nullable bind parameter needs a
  `cast(...)` on PostgreSQL; assemble the grouped response in a new `SearchService` the way
  `DashboardService` and `ReportService` compose the four repositories; authorize solely through
  `EntryAccessService.resolveListTarget` so an unknown `userId` stays a `403`; raise the `q` rules
  as `FieldValidationException`s to keep the `$.errors.q` shape; and escape `%`/`_` in the user's
  query. Search the tag values too: `note_tag` is already an `@ElementCollection` on
  `AdditionalNote`, so the note query joins it and needs `distinct` so a note with several matching
  tags comes back once, and issue `resolution_notes` joins the issue query's OR-list. The trigram
  index migration is PostgreSQL-only, unlike every migration so far, so decide
  and record how the H2 test database skips it. UI work is a `/search` Thymeleaf page plus the
  search input in `templates/fragments/layout.html`, following the Phase 7 pattern of a shell that
  fetches `/api/**` with the `ACCESS_TOKEN` cookie. Do not add enum filters (deferred, assumption
  A4).
- 2026-07-28: Extension 1 elaboration was delivered stacked on the Phase 7 branch
  `devin/1785226946-phase7-ui` (PR #79) as PR #80 (https://github.com/codev-workshops/onboarding-diary/pull/80) on branch
  `devin/1785230299-ext1-search`, which is open and must not be merged ahead of the phase PRs
  beneath it.
- 2026-07-28: The product owner reviewed the elaboration and answered every Section 9.7 question in
  the same session; the answers are folded into `REQUIREMENTS.md` (§9.2 field set, §9.3 tag join,
  §9.7 assumptions A9/A10 and the "answered - not being built now" list) and into the Decisions Log
  above. Only one question is genuinely open for Search - a future cross-recruit manager search
  (Q6). The assumptions A1-A8 were accepted unchanged, so the build session should treat Section 9
  as settled scope.
- 2026-07-28: **Extension 1 (Search) built.** Validated with `./mvnw clean verify`: **166 tests, all
  green, 28 new** over the 138-test pre-Search baseline (`SearchValidationTest` 9,
  `SearchContentTest` 10, `SearchAuthorizationTest` 8, plus one `/search` page test in
  `PageAccessTest`).
  **Tested in Extension 1:** the `q` rules (missing, empty and whitespace-only `q`, a one-character
  query, a 101-character query rejected while 100 is accepted, trimming plus internal whitespace
  collapsing, `%`, `_` and `\` escaped so they match literally, unknown enum/date parameters ignored
  rather than rejected); search correctness over a fixture seeded across every searched field (task
  title and description, issue title, description and resolution notes, feedback subject and
  details, note title, content and tags) - a matching query returns the row and a non-matching query
  returns nothing, mid-field substrings match, matching is case-insensitive, a note whose two tags
  both match is returned once, null optional fields neither match nor break the query, the 50-row
  per-group cap holds with `truncated: true` while an untruncated group reports `false`, empty
  groups are still present with `totalResults: 0`, and an excerpt is capped around the first match;
  authorization (another user's matching entry never returned, a recruit passing another `userId`
  `403`, an overseeing Manager reading their recruit, an unassigned Manager `403`, an unknown
  `userId` `403` rather than `404` for Manager and Admin alike, Admin reading any user, and no
  target defaulting to the caller); authentication (`401` with no token and with an invalid token);
  and the page layer (`/search` renders, keeps the submitted query in the nav search bar, labels all
  four groups, and hides the recruit-id field from a New Recruit).
  A manual pass against a Docker Compose PostgreSQL 16 instance additionally confirmed that Flyway
  applies migration `V8` on PostgreSQL ("Successfully applied 8 migrations ... now at version v8")
  and that the endpoint behaves the same there as on H2 - the wildcard escaping (`50%`), the
  `distinct` tag match, the empty result and the `401` - and that the nav bar keeps its Search button
  disabled at one character, submits to `/search`, keeps the query visible and renders the four
  counted groups and the friendly empty state.
  **Not tested in Extension 1:** migration `V8` is not covered by the automated suite - the H2 test
  database only scans `db/migration`, so the `pg_trgm` extension and the GIN indexes are only
  exercised by starting the application against PostgreSQL as above, and no query-plan or
  performance assertion is made anywhere; the
  client-side JavaScript of `/search` and the nav bar's below-two-characters disabling, which are
  only checked manually like every other page script; accent-insensitive matching, ranking, paging
  past the 50-row cap and cross-recruit search, none of which are built (A3, A5, A6, Q6).
- 2026-07-28: Section 9.7 open questions are resolved as recorded by the product owner on
  2026-07-28: A9 and A10 replace former Q1 and Q2, Q3, Q4 and Q5 are answered and not being built,
  and A1-A8 stand unchanged. **Only Q6 (a Manager searching across all overseen recruits at once)
  remains open**, and nothing was built for it. The build added two clarifications to
  `REQUIREMENTS.md` section 9, both marked "Build note (2026-07-28)": the response groups are
  objects carrying their count and truncation flag rather than bare arrays (§9.4), and the trigram
  migration is skipped on H2 by living on the separate `db/migration-postgresql` path (§9.3).
- 2026-07-28: **Extension 2 (Manager Dashboards) elaborated - documentation only, no code.** Manager
  Dashboards is a second extension beyond the original seven phases and beyond Extension 1, giving a
  Manager an **aggregate** team view across all their overseen recruits, distinct from the existing
  per-recruit dashboard (US-M03/§4.6). `REQUIREMENTS.md` gained section 10 ("Extension: Manager
  Dashboards") in the style of sections 1-9: user stories (US-MD01 Manager team-wide dashboard,
  US-MD02 Admin viewing any single manager's team, both `403` out of scope), the exact aggregate set
  (team size, total tasks/issues/feedback/notes across the team, recruits with open `CRITICAL`/`HIGH`
  issues, recruits inactive for 7 days), the data-model impact (no new entities/tables/columns; an
  aggregation query over the existing entry tables joined to `manager_assignment`; reuse of the four
  entry repositories and `ManagerAssignmentRepository`), the `GET /api/manager-dashboard` endpoint
  with an Admin-only `managerId`, the `/manager-dashboard` Thymeleaf page linked from the Manager nav
  alongside the per-recruit dashboard, validation (zero-recruit empty state is a `200`, not an error;
  `managerId` validation resolving to `403` not `404`), and the fixed decisions / assumptions. **No
  code of any kind was added - no entity, migration, repository query, service, endpoint, template or
  test - and the test suite is unchanged at 166 tests.** The scope is counts and lists only; charts
  are deferred to a separate future extension.
- 2026-07-28: Notes for the follow-up Manager Dashboards build session (Step 2, a separate PR
  pending approval). Branch from the tip of **this** extension branch and read `REQUIREMENTS.md`
  section 10 and this file from there - nothing has been merged to `main`, so the stack Phase 1 ->
  Phase 7 -> Extension 1 -> Extension 2 is a chain of open PRs. Build order that fits the existing
  code: resolve the target manager's overseen-recruit ids from `ManagerAssignmentRepository`, then
  reuse the four entry repositories (`TaskEntryRepository`, `IssueEntryRepository`,
  `FeedbackNoteRepository`, `AdditionalNoteRepository`) for the team-wide counts and the two
  attention lists; assemble the grouped response in a new `ManagerDashboardService` the way
  `DashboardService` and `ReportService` compose the four repositories; authorize solely through the
  `EntryAccessService.resolveListTarget` pattern so an unknown or non-Manager id stays a `403`, never
  `404`, and only an Admin may pass `managerId`. Remember the **Phase 6 lesson that every nullable
  bind parameter needs a `cast(...)` on PostgreSQL** (for example the 7-day cut-off date), since the
  H2 test suite will not catch it. Add no charts (deferred, Q8) and no new tables/columns (the schema
  stays at `V7`). Keep FD1 (7-day inactivity) and FD2 (Admin per-manager view, no global rollup) as
  settled - do not re-open them.


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
  **Amended 2026-07-28 by Phase 7:** `/dashboard`, `/tasks`, `/issues`, `/feedback`, `/notes` and
  `/reports` now exist with the shared section 5.2 navigation, and sign-up and login land on
  `/dashboard`. Detail routes (`/tasks/{id}`, `/issues/{id}`) were folded into the list pages as
  inline edit forms rather than separate pages. `/recruits`, `/recruits/{id}`, `/admin/users` and
  `/admin/reference-data` are still missing and are deferred with the section 4.8 admin phase.
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
