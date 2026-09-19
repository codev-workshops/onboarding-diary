# Review log

Each feature followed PLAN → IMPLEMENT → SELF-REVIEW → TEST → SPECIALIST REVIEW → FIX → RE-TEST →
VERIFY → DOCUMENT. Findings below are grouped by the specialist lens that raised them; every entry
records the disposition.

## Architecture review

| # | Finding | Disposition |
| --- | --- | --- |
| A1 | Controllers initially risked touching repositories directly for filter dropdowns. | Fixed: all data access goes through services (`TaskService.categoriesOf`), controllers only orchestrate. |
| A2 | Entities were being returned from API controllers, exposing `passwordHash` and lazy back references. | Fixed: introduced `web/dto` records and `DtoMapper`; entities never cross the API boundary. |
| A3 | `open-in-view` left enabled would hide lazy-loading bugs. | Fixed: `spring.jpa.open-in-view=false`; lazy associations are fetched explicitly. |
| A4 | Lazy `User.manager` was serialized outside a transaction by `/api/me` and `/profile`, causing `LazyInitializationException` (HTTP 500 observed during runtime verification). | Fixed: `UserRepository.findWithManagerById` / `findAllWithManagerByOrderByNameAsc` with `@EntityGraph`; verified by `ApiIT.meEndpointReturnsSafeProfileWithoutPasswordHash`. |
| A5 | Duplicate `NoteController.class` entry in `@ControllerAdvice(assignableTypes = ...)`. | Fixed: removed. |

## Security review

| # | Finding | Disposition |
| --- | --- | --- |
| S1 | Public signup form could be posted with `role=ADMIN`. | Already mitigated by design (`UserService.register` hard-codes `Role.RECRUIT`); regression test added and a live attempt against the running app confirmed the account was created as `RECRUIT`. |
| S2 | Browser-supplied record IDs must never be trusted. | All reads/updates/deletes resolve the record and then assert scope (`AuthorizationService`, `*Service.getOwned`); cross-user attempts return 403 in both UI and API. |
| S3 | Manager/admin scope had to apply to reports as well as pages. | `ReportService.build` calls `AuthorizationService.requireReadAccess` before loading anything; covered by `ReportIT`. |
| S4 | Passwords must not be stored, logged, or rendered. | BCrypt strength 12; `DemoDataInitializer` logs only account emails; no DTO or template exposes `passwordHash`; asserted in `ApiIT`. |
| S5 | Secrets in configuration. | All datasource and demo values come from environment variables with development defaults; `.env` is git-ignored and `.env.example` documents the variables. |
| S6 | Session hardening. | Session fixation protection (`changeSessionId`), HttpOnly + SameSite=Lax cookies, `COOKIE_SECURE` switch for HTTPS, 30-minute timeout. |
| S7 | CSRF for every state change including logout. | Enabled globally; logout is a POST form; asserted by `AuthorizationIT.stateChangingRequestsRequireCsrf`. |

## QA review

| # | Finding | Disposition |
| --- | --- | --- |
| Q1 | Malformed JSON bodies (e.g. an unknown enum value) returned Spring's default error shape instead of the API error contract. | Fixed: `ApiExceptionHandler` handles `HttpMessageNotReadableException` and returns `400 {"message":"Malformed request body"}`; covered by `ApiIT.malformedBodyIsRejected`. |
| Q2 | Client-side `required`/`maxlength` attributes could be bypassed. | Every constraint is enforced server-side with Jakarta Validation and asserted by `FormValidationTest` and `DiaryFlowIT.invalidTaskIsRejectedServerSideAndNotPersisted`. |
| Q3 | Report date ranges could be inverted or empty. | `ReportService` rejects null and inverted ranges with a clear message; covered by `ReportIT.invalidRangeIsRejected`. |
| Q4 | Integration tests initially missed by Surefire because of the `*IT` suffix. | Fixed: Surefire configured to include `**/*IT.java`, so `mvn verify` runs the whole suite. |

## UX review

| # | Finding | Disposition |
| --- | --- | --- |
| U1 | Navigation exposed manager/admin links to everyone. | Fixed: `sec:authorize` guards in the layout so only the relevant roles see those entries. |
| U2 | Deletes were plain links (unsafe and not CSRF protected). | Fixed: POST forms with a confirmation dialog. |
| U3 | Nothing highlighted items that had been sitting too long. | Added overdue highlighting (7 days, `DashboardService.OVERDUE_AFTER_DAYS`) on the dashboard and in task lists. |
| U4 | Validation errors need to be visible next to fields, not just as a banner. | Field-level messages are rendered from the binding result on every form; success/error flash alerts are shared through the layout fragment. |
| U5 | Dashboard needed to be usable on small screens. | Bootstrap 5 grid, responsive tables/cards, collapsible navbar; charts resize with their containers. |
