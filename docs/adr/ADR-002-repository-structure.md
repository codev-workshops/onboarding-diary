# ADR-002. Repository structure

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Onboarding Diary is a greenfield project with a .NET backend, a React frontend, a set of
planning documents, and CI that has to build and test both sides. Work happens directly on
`main` (see ADR-007), so the layout has to make it obvious where a change belongs without a
review gate to catch misplacement. The structure also has to accommodate schema and features
arriving incrementally per milestone (see ADR-010) rather than being laid out up front.

## Decision

Keep backend, frontend, and documentation in a **single repository** with the layout below. This
is the structure created in M0.

```
onboarding-diary/
├─ .github/
│  └─ workflows/ci.yml               # two jobs: backend (build + test), frontend (lint + build)
├─ .editorconfig                     # 4-space C#, 2-space TS/JSON/YAML/MD, LF, final newline
├─ .gitignore                        # bin/, obj/, node_modules/, dist/, *.db, .env
├─ global.json                       # pins the .NET SDK (10.0.400, rollForward latestFeature)
├─ README.md                         # stack, layout, prerequisites, run and test instructions
│
├─ docs/
│  ├─ requirements.md                # elaborated requirements: user stories, domain model,
│  │                                 # API spec, validation rules, UI flows
│  ├─ implementation-plan.md         # milestones M0–M7, cross-cutting design, test strategy
│  └─ adr/
│     ├─ README.md                   # ADR index
│     ├─ template.md                 # record template
│     └─ NNNN-*.md                   # one file per decision
│
├─ backend/
│  ├─ OnboardingDiary.slnx           # solution (SDK 10 XML solution format)
│  ├─ src/OnboardingDiary.Api/
│  │  ├─ Program.cs                  # host: DI, JWT auth, CORS, rate limiting, endpoint mapping
│  │  ├─ Endpoints/                  # one static *Endpoints.cs per feature, added per milestone
│  │  ├─ Features/<Feature>/         # request/response DTOs, validators, handler services
│  │  ├─ Domain/                     # entities and enums, persistence-agnostic
│  │  ├─ Infrastructure/
│  │  │  ├─ AppDbContext.cs
│  │  │  ├─ Configurations/          # IEntityTypeConfiguration per entity
│  │  │  ├─ Migrations/              # one migration per schema-changing milestone
│  │  │  ├─ Seed/                    # seeded departments and demo users
│  │  │  └─ Auth/                    # JwtTokenService, password hashing
│  │  └─ Common/                     # ProblemDetails helpers, paging, authorization policies
│  └─ tests/
│     ├─ OnboardingDiary.UnitTests/         # validators, permission rules, state machines
│     └─ OnboardingDiary.IntegrationTests/  # WebApplicationFactory + temp-file SQLite
│
└─ frontend/
   ├─ index.html  vite.config.ts  tsconfig*.json
   └─ src/
      ├─ main.tsx  router.tsx        # React Router data router and role guards
      ├─ api/                        # typed fetch client, DTO types, query hooks
      ├─ auth/                       # auth context, token handling, RequireRole
      ├─ features/                   # tasks, issues, feedback, notes, dashboard,
      │                              # reports, team, admin — one folder per screen area
      ├─ components/                 # shared UI: DataTable, FilterBar, Modal, StatCard…
      └─ test/                       # Vitest + React Testing Library setup
```

### Rules that follow from the layout

- **Backend organisation is by feature, not by technical layer.** A vertical slice adds one
  `Endpoints/<Feature>Endpoints.cs`, one `Features/<Feature>/` folder, the entity in `Domain/`,
  its configuration and migration in `Infrastructure/`, and tests in both test projects.
  `Common/` holds only genuinely cross-cutting code.
- **`Domain/` has no EF Core attributes.** Mapping lives in `Infrastructure/Configurations/`.
- **Frontend mirrors the same feature names** as the backend, so a slice is easy to trace
  end to end. Anything used by two or more features moves to `components/`.
- **Empty structural folders are kept with `.gitkeep`** until the milestone that fills them, so
  the intended shape is visible from the start.
- **Documentation lives in `docs/`, never in the project folders**, and decisions live in
  `docs/adr/` rather than in the implementation plan, which is a living document.
- **CI mirrors the top-level split**: one job per side, each with its own working directory and
  cache, so a frontend change does not wait on the .NET build.
- **Tooling versions are pinned in the repository** (`global.json` for the SDK, the Node version
  in the workflow) so local and CI builds match.

## Consequences

- One clone, one CI configuration, and atomic commits that change the API contract and its
  client together — valuable while the contract is still moving.
- Contributors need both toolchains (.NET SDK and Node) installed even to work on one side.
- Feature-oriented backend folders mean a change usually touches several sibling folders inside
  one feature rather than several layer folders across the project; this is intentional and
  keeps slices reviewable.
- The two jobs in CI both run on every push, including pushes that touch only one side. Path
  filters can be added if CI time becomes a problem.
- Splitting backend and frontend into separate repositories later would be mechanical, but would
  cost the atomic contract-plus-client commits.

## Alternatives considered

- **Separate backend and frontend repositories** — independent versioning and CI, at the cost of
  cross-repo coordination for every contract change; unjustified for a single small team.
- **Layered backend folders (`Controllers/`, `Services/`, `Repositories/`, `Models/`)** —
  familiar, but scatters one feature across four folders and makes vertical slices harder to
  review and to delete.
- **A dedicated `src/` root wrapping `backend/` and `frontend/`** — an extra level of nesting
  with no benefit at two projects.
- **Docs in a wiki** — separates decisions from the commit that implements them and loses
  review through normal diffs.
