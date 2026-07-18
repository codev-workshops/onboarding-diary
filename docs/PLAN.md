# Implementation Plan

Phased plan for building the Onboarding Diary. Requirements come from
[`MANDATE.md`](./MANDATE.md); decisions/assumptions from
[`ASSUMPTIONS.md`](./ASSUMPTIONS.md); stack from [`techstack.md`](./techstack.md).

> **No code is written until this plan and the `pending confirmation` items in
> `ASSUMPTIONS.md` are signed off.** Any decision not already in the MANDATE is
> recorded in `ASSUMPTIONS.md` first.

## Guiding principles

1. **Usability first.** A default installation must let a user understand **every**
   feature immediately — via seeded demo data (ASSUMPTIONS §9) and onboarding
   enablers (tooltips / coach marks / welcome mats via React Joyride) that are on
   in demo mode (no `DB_STRING`) and off in production (`DB_STRING` present)
   (ASSUMPTIONS §2, §13, §23).
2. **Modern, elegant, professional, responsive UI.** A consistent design system
   (Tailwind + shadcn/ui-style primitives, lucide-react icons, Recharts) with a clean, professional
   color scheme (neutral base + calm primary + semantic status colors, light/dark,
   WCAG AA), accessible components, mobile-first responsive layouts, and deliberate
   empty/loading/error states. See `techstack.md` → "Design system & UI".
3. **Well-documented code.** JSDoc/TSDoc on public functions, modules, and complex
   logic; a README per package; inline comments only where they add non-obvious
   context.
4. **Strong testing, written in parallel.** Tests are written **alongside each
   feature as it is built — not deferred to the end**. Each phase ships with its
   **unit** tests (domain logic, policies, report generation, access control) and
   **e2e** tests (Playwright) for the journeys it introduces, and a phase is not
   "done" until they are green. This keeps feedback tight and development
   efficient.

## Architecture overview

- **Monorepo** with two packages:
  - `server/` — Node + Express + TypeScript REST API, Prisma ORM, JWT auth, Zod
    validation, report generation (PDFKit + csv-stringify).
  - `client/` — React + TypeScript SPA (Vite, React Router, TanStack Query, React
    Tailwind + shadcn/ui-style primitives, lucide-react, Recharts, React Joyride).
- **Datasource:** Prisma targeting **SQLite** (demo, no `DB_STRING`) and
  **PostgreSQL** (production, `DB_STRING` present) — selected at process startup
  from the single `DB_STRING` variable (ASSUMPTIONS §2, §13, techstack).
- **API:** RESTful resources, JWT bearer auth, role-based authorization enforcing
  the access-control matrix (ASSUMPTIONS §7, §14).

## Data model (from MANDATE fields)

- **Department**: name (managed entity so departments can be created/managed and
  users assigned to them — ASSUMPTIONS §9, §5).
- **User**: email, passwordHash, name, role (Recruit|Manager|Admin), departmentId,
  startDate, managerId (nullable), isActive (soft-delete; deactivation blocks
  login and marks their retained content — ASSUMPTIONS §10), audit timestamps
  (ASSUMPTIONS §12).
- **Task**: date, title, description, category (FK/managed), status, priority,
  ownerId, audit timestamps.
- **Issue**: date, title, description, severity, status, resolutionNotes, ownerId,
  audit timestamps.
- **Feedback**: date, subject, type (Positive|Suggestion|Concern), details, ownerId,
  audit timestamps.
- **Note**: date, title, content, tags, ownerId, audit timestamps.
- **TaskCategory**: name, isActive (soft-disable, ASSUMPTIONS §4 Tier 1).
- **Setting**: holds the one-way production latch `mode=production`, set once by
  the setup tool during the demo→production cutover (ASSUMPTIONS §13, §23).
- Tier-2 value sets (task status/priority, issue severity/status) seeded and
  system-defined (ASSUMPTIONS §4 Tier 2).

## Phases

Each phase ends green: lint + typecheck + unit tests pass, and (from Phase 3 on)
its e2e journeys pass. **Tests are written in parallel with each feature, not at
the end** (guiding principle #4). Every phase adds code documentation as it goes.

### Phase 0 — Foundation & tooling
- Monorepo scaffold (`server/`, `client/`), TypeScript, ESLint + Prettier, CI
  scripts (lint, typecheck, test, build).
- Prisma initialized with dual-target datasource config; base schema + migrations.
- Test harnesses wired: Vitest (+ Supertest) on server, Vitest + React Testing
  Library on client, Playwright for e2e.

### Phase 1 — Domain model & persistence
- Prisma schema for all entities above; migrations; repositories/services.
- Seeded Tier-2 enums and default task categories.
- Unit tests for repositories/services and enum seeding.

### Phase 2 — Auth & users
- JWT auth (login), bcryptjs hashing, `PasswordPolicy` class (min 8 chars,
  upgradeable — ASSUMPTIONS §1).
- Admin **department management** (create/rename departments) and **user
  provisioning** (create/manage users, roles, department, manager assignment —
  ASSUMPTIONS §10, §5, §9).
- Role-based authorization middleware enforcing the access-control matrix
  (ASSUMPTIONS §7).
- Unit tests for policy, auth, and authorization; e2e login journey.

### Phase 3 — Core logs (Task, Issue, Feedback, Note)
- CRUD REST endpoints + filters (Task: date/category/status; Issue: status/severity)
  — ASSUMPTIONS §6, §14.
- React pages/forms for each log with responsive, modern UI; validation; empty/
  loading/error states.
- Unit tests (services + components) and e2e CRUD/filter journeys per role.

### Phase 4 — Dashboard
- Summary counts, recent entries (ordered by audit timestamp), task completion
  progress, open issues — keyed off Tier-2 semantic values (ASSUMPTIONS §4).
- Responsive dashboard UI with charts/progress indicators.
- Unit tests for aggregation logic; e2e dashboard journey.

### Phase 5 — Reports
- **On-screen report view first** (date range across all entry types, role-scoped;
  managers report on overseen recruits — ASSUMPTIONS §11), then **export the
  displayed report** to PDF (PDFKit) and CSV (csv-stringify).
- Unit tests for report data assembly and formatters (assert on-screen report,
  then that exports match it); e2e journey: view report → export PDF/CSV.

### Phase 6 — Demo experience, `DB_STRING` mode & demo→production cutover
- Seed demo mode: **multiple departments, multiple managers and recruits**, and
  demo entries across all logs (ASSUMPTIONS §9).
- **Mode derived from `DB_STRING`** (no `DEMO_MODE`): absent → demo (SQLite +
  enablers + demo accounts); present → production (PostgreSQL, enablers off, no
  demo data) — selected at process startup per §13.
- React Joyride tours / tooltips / welcome mats gated purely on demo mode (§21).
- **Standalone `setup/` tool** performs the demo→production cutover (§23): applies
  the Postgres schema, seeds reference categories only, creates the first Admin,
  sets the `Setting.mode=production` latch, and writes `.env` on-prem. It only runs
  in demo mode (refuses if `DB_STRING` is set). Production startup guards validate
  a strong `JWT_SECRET` and that the DB is provisioned.
- Testcontainers transition test: provision Postgres via the setup core, boot the
  real API in production mode, and drive the admin→manager→recruit workflow (§23).

### Phase 7 — Hardening, polish & docs
- Accessibility pass, responsive QA across breakpoints, design polish.
- Expand unit coverage and e2e journeys; error handling; seed/reset scripts.
- Finalize in-code documentation and per-package READMEs.

### Step 3 — Extension features (documented in ASSUMPTIONS §17–§19)
Confirmed and built with onboarding enablers + unit + e2e tests, tests in parallel:

1. **Onboarding checklist templates (§17).** New `ChecklistTemplate`/`ChecklistItem`
   models; Admin-only CRUD under **Admin → Templates**; "apply template" on recruit
   provisioning auto-seeds the recruit's Task Log (due dates from item offsets).
   Joyride step + demo templates. Unit (template service, seeding) + e2e (create
   template → provision recruit with it → tasks appear).
2. **Task due dates & overdue reminders (§18).** `Task.dueDate?`; overdue =
   past due & not done, evaluated at end-of-day in the task owner's **admin-managed
   timezone** (§20, `User.timezone`, default `Asia/Kolkata`, datetimes stored as
   UTC); Task Log badge, Dashboard
   overdue count + reminder, team overview per-recruit overdue. Joyride step.
   Unit (overdue logic + timezone boundaries) + e2e.
3. **Comments with @mentions & activity indicator (§19).** New `Comment`/`Mention`
   models on Tasks; server-side @mention parsing (email local-part handles);
   `GET/POST /api/tasks/:id/comments`, `GET /api/mentions` + mark-read; header bell
   with unread count. Access scoped per §7. Joyride step + demo comments. Unit
   (mention parsing, access) + e2e.

### UX polish pass (§21, §22)

- **Onboarding tour** shown only in demo mode (SQLite/in-memory); dismissing it
  suppresses it for the current browser session (`sessionStorage`) and it reappears
  on restart (§21).
- **Task Log completeness** (§22): title/description search, date-range filter,
  completed-hidden-by-default with a toggle, client-side pagination, Manager/Admin
  owner assignment (server re-validated), and owner labels.
- **Reports** recruit picker sourced from `GET /api/dashboard/team` (not the
  Admin-only `/api/users`), with loading/error handling so Managers no longer hit a
  403.
- **Feedback & consistency:** shared `ConfirmDialog` for destructive deletes and
  success/error `ToastProvider` notifications across Tasks/Issues/Feedback/Notes and
  Admin entities; clickable dashboard recent entries and an actionable overdue
  reminder; password show/generate/copy + policy hint; friendly relative comment
  timestamps (with an absolute `title`); Admin timezone display with UTC offset.

## Testing strategy (summary)

- **Unit:** domain services, `PasswordPolicy`, authorization checks, enum/semantic
  logic, dashboard aggregation, report assembly and PDF/CSV formatting.
- **Integration (API):** Supertest against Express routes with an ephemeral SQLite DB.
- **Prod DB integration (Testcontainers):** a suite that runs a real PostgreSQL
  container to validate migrations, repositories/services, and access-control
  queries on the production engine. **Runs on every push in CI** (Docker-enabled
  runner) and in local dev where Docker is available; it **skips gracefully** only
  when Docker is genuinely absent so it never blocks a Docker-less machine.
- **CI:** a GitHub Actions workflow runs lint, typecheck, unit/API tests, the
  Testcontainers Postgres suite, and the build on every push/PR.
- **E2E (Playwright):** per-role journeys — login, CRUD + filters for each log,
  dashboard, report export, and the first-boot onboarding flow.

## Documentation standards

- TSDoc on exported functions/classes/modules; document non-obvious business rules
  (e.g. semantic status handling, soft-disable) at the code site.
- Keep `MANDATE.md`, `ASSUMPTIONS.md`, `techstack.md`, and this plan in sync as
  decisions evolve; new decisions land in `ASSUMPTIONS.md` before code.
