# Onboarding Diary

Web application for new recruits to document their onboarding journey (tasks, issues, feedback,
notes), for managers to monitor assigned recruits, and for admins to manage users.

This repository currently contains the **M0 scaffold only** — no feature code yet.

## Stack

| Layer | Technology |
|---|---|
| Backend | .NET 10, ASP.NET Core Minimal APIs, EF Core |
| Database | SQLite |
| Auth | JWT bearer access tokens |
| Frontend | React, TypeScript, Vite, React Router |
| Tests | xUnit (unit + integration), Vitest / React Testing Library |

## Documentation

- `docs/requirements.md` — elaborated requirements (user stories, domain model, API spec,
  validation rules, UI flows)
- `docs/implementation-plan.md` — milestones M0–M7, cross-cutting design, testing strategy
- `docs/architecture.md` — consolidated system view (components, pipeline, data model,
  cross-cutting concerns, non-goals)
- `docs/adr/` — architecture decision records (index in `docs/adr/README.md`)

## Layout

```
docs/
backend/
  OnboardingDiary.slnx
  src/OnboardingDiary.Api/     # Endpoints, Features, Domain, Infrastructure, Common
  tests/OnboardingDiary.UnitTests/
  tests/OnboardingDiary.IntegrationTests/
frontend/
  src/{api,auth,components,features,test}
.github/workflows/ci.yml
```

## Prerequisites

- .NET SDK 10.0.400 (pinned in `global.json`)
- Node.js 24

## Running locally

Backend:

```bash
cd backend
dotnet run --project src/OnboardingDiary.Api
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend && dotnet test
cd frontend && npm run lint && npm run build
```
