# Testing Strategy

How the Onboarding Diary is tested, what each layer covers, and how the demo
(SQLite) and production (PostgreSQL) modes are both exercised. See
[OPERATIONS.md](OPERATIONS.md) for the runtime/security model these tests protect.

## Principles

- **Tests are written alongside features**, not deferred (see PLAN.md).
- **Both datasources are exercised.** Fast suites run against SQLite; dedicated
  suites run against a real PostgreSQL container so behavior SQLite would mask is
  caught, and so the demo→production cutover is proven end to end.
- **Prefer real flows.** API and browser suites drive the actual HTTP/UI paths
  rather than calling services directly, so access control and wiring are covered.
- **CI runs everything on every push/PR** (`.github/workflows/ci.yml`).

## Test layers

| Layer                    | Location                                  | Runner                      | Datasource               | What it covers                                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (server)            | `server/test/unit`                        | Vitest                      | in-memory / pure         | Domain logic: overdue math, password policy, mentions, timezone, report CSV, mode guards, demo credentials.                                                                                                                                     |
| API (server)             | `server/test/api`                         | Vitest + Supertest          | SQLite (ephemeral)       | REST endpoints, auth, RBAC, CRUD, extensions, and the **production-mode** behavior (`demoModeOff`: `/api/config/demo` 404, `@demo.local` login rejected).                                                                                       |
| Integration (server)     | `server/test/integration`                 | Vitest + Testcontainers     | **PostgreSQL**           | Migrations, repositories/services, and access-control queries against real Postgres, plus admin flows.                                                                                                                                          |
| Unit/API (setup tool)    | `setup/test`                              | Vitest                      | SQLite + mocks           | `.env` writing (0600, quoting, JWT reuse), `provisionProduction` (categories-only seed, first-admin creation, idempotence, password preservation, demo-email/weak-password rejection), and the tool's HTTP guard (403 when `DB_STRING` is set). |
| Integration (setup tool) | `setup/test/integration`                  | Vitest + Testcontainers     | **PostgreSQL**           | Full demo→production cutover: provision a fresh Postgres, boot the real API in production mode, and run the admin→manager→recruit workflow.                                                                                                     |
| E2E — demo               | `e2e/` + `playwright.config.ts`           | Playwright                  | SQLite (seeded demo org) | Browser journeys for each role using the pre-seeded demo data and demo-only affordances (tour, demo credentials panel).                                                                                                                         |
| E2E — production         | `e2e-prod/` + `playwright.prod.config.ts` | Playwright + Testcontainers | **PostgreSQL**           | UX parity on Postgres: cut over a fresh DB, then **build the org through the UI** and re-run the core flows.                                                                                                                                    |

## Why a separate production E2E suite

The demo E2E suite depends on the **pre-seeded demo organization** (`@demo.local`
accounts, departments, an overdue task, mentions, templates). A fresh production
database has none of that — so those specs cannot simply be pointed at Postgres.

The production suite (`e2e-prod/`) instead mirrors how a real customer starts:

1. `e2e-prod/serve.ts` (Playwright `webServer`) boots a real PostgreSQL container,
   performs the **demo→production cutover using the same setup-tool core** the
   browser form uses (apply schema, seed default task categories only, create the
   first admin, set the `Setting.mode=production` latch), then starts the API in
   **production mode** (`DB_STRING` present) against that container.
2. The browser specs then perform the **UI-driven organization setup** — create a
   department, a manager, and a recruit reporting to that manager — exactly the
   data the demo seed provides for free.
3. The core UX is re-run against Postgres: production login page hides the demo
   credentials panel and rejects `@demo.local`; role redirects and RBAC hold;
   the manager's Team lists the recruit; recruit and admin create tasks.

This proves the application behaves identically on PostgreSQL and that the cutover
produces a working, empty-but-usable organization.

## Coverage gates

- Server: ~98% statements/lines (`server/vitest.coverage.config.ts`).
- Client: ~96% statements/lines (`client` Vitest coverage).

## Running the suites

```bash
npm run lint
npm run typecheck
npm run test                                   # unit + API + setup unit
npm run build
npm run test:integration --workspace server    # Postgres (Testcontainers, needs Docker)
npm run test:integration --workspace setup     # demo→production cutover (needs Docker)
npm run e2e                                     # demo browser journeys (SQLite)
npm run e2e:prod                                # production browser journeys (Postgres, needs Docker)
```

Coverage:

```bash
cd server && npx vitest run --coverage --config vitest.coverage.config.ts
cd client && npx vitest run --coverage
```

The Testcontainers suites require Docker; they run on `ubuntu-latest` in CI and
locally where Docker is available.

## Limitations

### The setup tool's browser form is not exercised by an end-to-end browser test

The setup tool (`setup/`) is validated at two levels — its **unit/API tests**
(`setup/test/`: `.env` writing, `provisionProduction`, and the HTTP handler
including the demo-only 403 guard) and a **Testcontainers integration test**
(`setup/test/integration`) that runs the real provisioning core against a fresh
PostgreSQL container and then boots the API in production mode against it. The
production browser suite (`e2e-prod/`) also cuts over via that **same core**
before driving the UI.

What is **not** covered is a Playwright test that opens the setup tool's own HTML
form at `http://localhost:4100`, types the connection string/admin details, and
clicks "Provision" in a browser. The reasons:

- **Playwright starts its `webServer` processes before `globalSetup` and before the
  specs.** Our production harness needs the cutover to finish _before_ the API can
  start (the API refuses to boot against an unprovisioned DB). Driving the setup
  form from within a spec would invert that ordering — the API `webServer` would
  have to already be running against a not-yet-provisioned database, which by design
  fails fast. So provisioning is performed in `serve.ts` (via the setup core)
  before the API starts, and the browser then does the _organization_ setup.
- **The setup form is a thin HTTP shell over the tested core.** The form does
  input collection and a single `POST /provision`; that endpoint, its validation,
  the demo-only guard, `.env` writing, and the full provisioning logic are all
  covered by the setup unit/API tests. A browser click-through would mostly
  re-assert the same core with more flakiness and no new coverage of the
  security-relevant logic.
- **Isolation/lifecycle.** The setup tool is a separate one-off process that must
  refuse to run once `DB_STRING` is present. Standing it up as an additional
  Playwright `webServer` alongside the API (which _does_ have `DB_STRING`) in one
  config is awkward and easy to misconfigure, working against the very isolation
  the tool provides.

**Consequence / residual risk:** the setup tool's HTML/JS (field wiring, the
success-message rendering, the on-prem/cloud guidance text) is not asserted by an
automated browser test and is verified manually. If that UI grows non-trivial
logic, add a focused component/browser test for the form in isolation (served with
`DB_STRING` absent, `POST /provision` stubbed or pointed at a Testcontainers
Postgres) rather than folding it into the production API harness.
