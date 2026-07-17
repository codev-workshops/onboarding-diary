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
   in first-boot/demo mode and turn off once a production DB holds real data
   (ASSUMPTIONS §2, §13).
2. **Modern, elegant, professional, responsive UI.** Consistent design system
   (Tailwind), accessible components, mobile-first responsive layouts, empty/loading/
   error states, and polished dashboards.
3. **Well-documented code.** JSDoc/TSDoc on public functions, modules, and complex
   logic; a README per package; inline comments only where they add non-obvious
   context.
4. **Strong testing.** A very good amount of **unit** tests (domain logic, policies,
   report generation, access control) and **e2e** tests (Playwright) covering the
   primary user journeys per role.

## Architecture overview

- **Monorepo** with two packages:
  - `server/` — Node + Express + TypeScript REST API, Prisma ORM, JWT auth, Zod
    validation, report generation (PDFKit + csv-stringify).
  - `client/` — React + TypeScript SPA (Vite, React Router, TanStack Query, React
    Hook Form, Tailwind, React Joyride).
- **Datasource:** Prisma targeting **SQLite** (first-boot/demo) and **PostgreSQL**
  (production) — a config switch, one schema (ASSUMPTIONS §2, techstack).
- **API:** RESTful resources, JWT bearer auth, role-based authorization enforcing
  the access-control matrix (ASSUMPTIONS §7, §14).

## Data model (from MANDATE fields)

- **User**: email, passwordHash, name, role (Recruit|Manager|Admin), department,
  startDate, managerId (nullable), audit timestamps (ASSUMPTIONS §12).
- **Task**: date, title, description, category (FK/managed), status, priority,
  ownerId, audit timestamps.
- **Issue**: date, title, description, severity, status, resolutionNotes, ownerId,
  audit timestamps.
- **Feedback**: date, subject, type (Positive|Suggestion|Concern), details, ownerId,
  audit timestamps.
- **Note**: date, title, content, tags, ownerId, audit timestamps.
- **TaskCategory**: name, isActive (soft-disable, ASSUMPTIONS §4 Tier 1).
- **Setting**: e.g. `onboardingEnablersEnabled`, datasource profile (ASSUMPTIONS §13).
- Tier-2 value sets (task status/priority, issue severity/status) seeded and
  system-defined (ASSUMPTIONS §4 Tier 2).

## Phases

Each phase ends green: lint + typecheck + unit tests pass, and (from Phase 3 on)
its e2e journeys pass. Every phase adds code documentation as it goes.

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
- JWT auth (login), bcrypt hashing, `PasswordPolicy` class (min 8 chars,
  upgradeable — ASSUMPTIONS §1).
- Admin user provisioning (create/manage users, roles, departments, manager
  assignment — ASSUMPTIONS §10, §5).
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
- Date-range reports across all entry types with role scoping; managers report on
  overseen recruits (ASSUMPTIONS §11).
- PDF (PDFKit) and CSV (csv-stringify) export.
- Unit tests for report data assembly and formatters; e2e export journey.

### Phase 6 — First-boot experience & onboarding enablers
- First-boot/demo mode: SQLite + seeded demo accounts and demo entries across all
  logs (ASSUMPTIONS §9).
- React Joyride tours / tooltips / welcome mats, gated by `onboardingEnablersEnabled`
  (ASSUMPTIONS §2, §13); auto-disable when running on the production DB with real
  data; Admin toggle.
- Admin flow to configure the production database (PostgreSQL).
- e2e journey: fresh boot → guided tour → configure production DB → enablers off.

### Phase 7 — Hardening, polish & docs
- Accessibility pass, responsive QA across breakpoints, design polish.
- Expand unit coverage and e2e journeys; error handling; seed/reset scripts.
- Finalize in-code documentation and per-package READMEs.

### Step 3 (later) — Two new features
- The MANDATE's Step 3 asks for two additional features. These will be proposed and
  **documented in `ASSUMPTIONS.md`/this plan before implementation**, consistent
  with the "document before building" rule.

## Testing strategy (summary)

- **Unit:** domain services, `PasswordPolicy`, authorization checks, enum/semantic
  logic, dashboard aggregation, report assembly and PDF/CSV formatting.
- **Integration (API):** Supertest against Express routes with an ephemeral SQLite DB.
- **E2E (Playwright):** per-role journeys — login, CRUD + filters for each log,
  dashboard, report export, and the first-boot onboarding flow.

## Documentation standards

- TSDoc on exported functions/classes/modules; document non-obvious business rules
  (e.g. semantic status handling, soft-disable) at the code site.
- Keep `MANDATE.md`, `ASSUMPTIONS.md`, `techstack.md`, and this plan in sync as
  decisions evolve; new decisions land in `ASSUMPTIONS.md` before code.
