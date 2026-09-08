# Onboarding Diary

Web application for new recruits to document their onboarding journey — tasks, issues, feedback
and notes — with read-only oversight for managers and user management for admins.

**Current state: M0 scaffold only.** The solution, the frontend app, CI and the documentation set
exist; no feature code yet. Feature work starts at M1 (authentication and profile).

## Documentation

| Document | Contents |
|---|---|
| [docs/requirements.md](docs/requirements.md) | User stories with acceptance criteria, domain model, API specification, validation rules, UI flows |
| [docs/architecture.md](docs/architecture.md) | Consolidated system view: components, request pipeline, data model, cross-cutting concerns, non-goals |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Milestones M0–M7, cross-cutting design, testing strategy, risks |
| [docs/adr/](docs/adr/README.md) | Architecture decision records — one file per decision, index in the folder README |
| [AGENTS.md](AGENTS.md) | Working instructions for AI agents and contributors: rules, commands, code placement, definition of done |

Start with the architecture document for the system view; read the ADRs for why a given choice
was made.

## Stack

| Layer | Technology | Decision |
|---|---|---|
| Backend | .NET 10, ASP.NET Core Minimal APIs, EF Core | [ADR-003](docs/adr/ADR-003-backend-dotnet-minimal-apis.md) |
| Frontend | React, TypeScript, Vite, React Router | [ADR-004](docs/adr/ADR-004-frontend-react-vite-router.md) |
| Database | SQLite (`app.db`) via EF Core migrations | [ADR-005](docs/adr/ADR-005-sqlite-with-ef-core.md) |
| Auth | JWT bearer access tokens, no refresh tokens | [ADR-006](docs/adr/ADR-006-jwt-access-token-only-auth.md) |
| Tests | xUnit (unit + integration), Vitest + React Testing Library, Playwright from M6 | [ADR-014](docs/adr/ADR-014-testing-strategy.md) |

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

Structure and the conventions behind it: [ADR-002](docs/adr/ADR-002-repository-structure.md).

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

From M1 the Vite dev server proxies `/api` to the backend, so the browser sees a single origin.

## Checks

```bash
cd backend  && dotnet build && dotnet test
cd frontend && npm run lint && npm run build
```

CI runs the same commands on every push to `main`.

## Contributing

Work lands directly on `main` in small conventional commits, one milestone at a time — no
feature branches or pull requests unless requested
([ADR-007](docs/adr/ADR-007-trunk-based-development-on-main.md)). CI is the only automated gate,
so keep it green. A decision that changes the architecture gets a new ADR rather than an edit to
an accepted one.
