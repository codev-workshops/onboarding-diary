# Onboarding Diary

Web application for new recruits to document their onboarding journey — tasks, issues, feedback
and notes — with read-only oversight for managers and user management for admins.

**Current state: M0 partially complete.** The solution, the frontend app, CI and the
documentation set exist; the data layer, health endpoint, test infrastructure and application
shell do not — see the audit in
[docs/implementation-plan.md §0](docs/implementation-plan.md#0-current-state-audit-as-of-the-m0-scaffold-commits).

## Documentation

| Document | Contents |
|---|---|
| [docs/requirements.md](docs/requirements.md) | User stories with acceptance criteria, domain model, API specification, validation rules, UI flows |
| [docs/architecture.md](docs/architecture.md) | Consolidated system view: components, request pipeline, data model, cross-cutting concerns, non-goals |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Milestones M0–M7, cross-cutting design, testing strategy, risks |
| [docs/adr/](docs/adr/README.md) | Architecture decision records: repository structure, stack, database, authentication, frontend dependency set |
| [AGENTS.md](AGENTS.md) | Working instructions for AI agents and contributors: rules, commands, code placement, definition of done |

Start with the architecture document for the system view; read the ADRs for why the structure,
stack, database, authentication and the frontend dependency set were chosen. Decisions without an
ADR (trunk-based development, hard deletes, department reference data, incremental schema, no
outbound email, API and authorization conventions, testing) are specified in the architecture
document and the plan.

## Stack

| Layer | Technology | Decision |
|---|---|---|
| Backend | .NET 10, ASP.NET Core Minimal APIs, EF Core | [ADR-002](docs/adr/ADR-002-frontend-and-backend-stack.md) |
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query over native `fetch` | [ADR-002](docs/adr/ADR-002-frontend-and-backend-stack.md), [ADR-005](docs/adr/ADR-005-frontend-dependency-set.md) |
| Database | SQLite (`onboardingdiary.db`) via EF Core migrations | [ADR-003](docs/adr/ADR-003-database-choice.md) |
| Auth | JWT sent as `Authorization: Bearer`, 60-minute expiry, no refresh tokens | [ADR-006](docs/adr/ADR-006-bearer-token-transport.md) |
| Tests | xUnit (unit + integration, built-in `Assert.*`), Vitest + React Testing Library, a small Playwright suite for business-critical journeys from M6 | [architecture §5](docs/architecture.md) |
| Lint / format | ESLint + Prettier | [ADR-005](docs/adr/ADR-005-frontend-dependency-set.md) |

Roles: **Recruit** authors entries, **Manager** reads assigned recruits' entries and generates
their reports, **Admin** manages users and reads everything.

## Layout

```
docs/                              # requirements, architecture, plan, ADRs
backend/
  OnboardingDiary.slnx
  src/OnboardingDiary.Api/
    Program.cs
    Endpoints/                     # one static *Endpoints.cs per feature
    Features/                      # DTOs, validators, handler services
    Domain/                        # entities and enums
    Infrastructure/                # AppDbContext, Configurations, Migrations, Seed, Auth
    Common/                        # paging, ProblemDetails helpers, authorization policies
  tests/OnboardingDiary.UnitTests/
  tests/OnboardingDiary.IntegrationTests/
frontend/
  src/
    api/  auth/  components/  test/
    features/                      # tasks, issues, feedback, notes, dashboard,
                                   # reports, team, admin
.github/workflows/ci.yml           # backend build+test, frontend lint+build
global.json                        # pins the .NET SDK
```

Structure and the conventions behind it: [ADR-001](docs/adr/ADR-001-repository-structure.md).

## Prerequisites

- .NET SDK 10.0.400 (pinned in `global.json`)
- Node.js 24

## Running locally

Backend — serves the API on <http://localhost:5276>:

```bash
cd backend
dotnet run --project src/OnboardingDiary.Api
```

Frontend — serves the SPA on <http://localhost:5173>:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend, so the browser sees a single origin in
development. With bearer-token authentication this is a convenience, not a requirement.

## Checks

```bash
cd backend  && dotnet build && dotnet test
cd frontend && npm run lint && npm run build
```

End-to-end journeys (Playwright) run separately and manage their own servers — they start the API
against a throwaway `backend/data/e2e.db` with `E2E_SEED=true` and serve the production build, so
nothing needs to be running first:

```bash
cd frontend && npm run test:e2e
```

CI runs the same commands on every push to `main`, with the Playwright suite as its own job.

## Contributing

Work lands directly on `main` in small conventional commits, one milestone at a time — no
feature branches or pull requests unless requested. CI is the only automated gate, so keep it
green. A decision that changes the architecture gets a new ADR rather than an edit to an accepted
one. Contributor rules and the definition of done: [AGENTS.md](AGENTS.md).
