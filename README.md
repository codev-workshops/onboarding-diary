# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their onboarding journey.

Requirements live in [`Requirements/`](Requirements/): the original brief (PDF) and the elaborated
specification ([`Requirement.md`](Requirements/Requirement.md)).

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | ASP.NET Core 8 Web API |
| Database | PostgreSQL via EF Core |

## Features

- Email/password auth with JWT, lockout after 5 failed attempts, and New Recruit / Manager / Admin roles.
- Task, issue, feedback and note logs with filtering.
- Recruit dashboard with summary tiles, charts and recent activity.
- Manager read-only views of assigned recruits; admin user management.
- CSV and PDF diary reports for a date range.
- Cross-log search and an entries-per-week activity chart.

The development seed admin (`SeedAdmin` in `appsettings.Development.json`) is `admin@example.com` / `Admin12345`.

## Layout

```
backend/   ASP.NET Core solution (src/OnboardingDiary.Api, tests/OnboardingDiary.Tests)
frontend/  React + TypeScript app
```

## Local development

Prerequisites: .NET 8 SDK, Node 20+, Docker.

```bash
docker compose up -d db          # PostgreSQL on localhost:5432
dotnet run --project backend/src/OnboardingDiary.Api   # API, Swagger at /swagger
cd frontend && npm install && npm run dev              # UI on http://localhost:5173
```

## Tests and checks

```bash
dotnet test backend/OnboardingDiary.sln
cd frontend && npm run lint && npm run build
```
