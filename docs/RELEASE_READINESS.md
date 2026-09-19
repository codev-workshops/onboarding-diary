# Release readiness

## Verification performed

| Check | Result |
| --- | --- |
| `mvn -B verify` (Java 21) | BUILD SUCCESS — 53 tests, 0 failures, 0 errors |
| Flyway migration on an empty PostgreSQL 17 database | `V1 init schema` applied successfully; Hibernate `ddl-auto=validate` passed |
| Application boot (`java -jar target/onboarding-diary-1.0.0.jar`) | Started in ~4.4 s, `/actuator/health` and `/login` respond 200 |
| Core journeys (live HTTP smoke run) | login → dashboard → tasks/issues/feedback/notes CRUD → search → reports all succeeded |
| Authorization boundaries (live) | recruit → `/manager/**`, `/admin/**` = 403; cross-recruit read/edit/delete = 403; manager limited to assigned recruits |
| Registration hardening (live) | posting `role=ADMIN` to `/signup` created a `RECRUIT` row |
| CSRF (live) | POST without a token = 403; anonymous browser request to `/dashboard` redirects to `/login` |
| Reports (live) | CSV for all four types and a valid PDF (`%PDF-1.6`) downloaded; another user's report = 403 |
| Validation | enforced server-side on every form and API payload; field-level errors returned |
| Secrets | none committed; `.env` ignored, `.env.example` documents every variable |
| Stubs / TODOs | none in application code |
| Browser verification (all roles, Chrome) | passed: signup/login/logout, disabled then reactivated accounts, profile and password changes, CRUD plus filters in all four categories, delete confirmation cancel/confirm, field-level validation including oversized text, dashboard charts and completion bar, cross-category search isolation, CSV/PDF for every report type, role boundaries and URL tampering, admin user management, narrow-viewport layout |

## Known limitations and follow-ups

- Tests execute against H2 in PostgreSQL mode; Flyway scripts are exercised against real PostgreSQL only
  at application start. Adding Testcontainers would make that part of `mvn verify`.
- Demo seeding is on by default for local convenience; set `DEMO_DATA_ENABLED=false` for any shared
  environment.
- No rate limiting or account lockout on the login endpoint.
- Reports are generated synchronously; very large date ranges will hold a request thread.
- No pagination on diary list pages yet (filters are provided instead).
- After a rejected report date range the form redisplays with its selections reset.

## Deployment notes

Required environment: Java 21 runtime, PostgreSQL 17, and the variables listed in the README. Set
`COOKIE_SECURE=true` behind HTTPS and override `DB_*` credentials and `DEMO_DATA_ENABLED=false`.
