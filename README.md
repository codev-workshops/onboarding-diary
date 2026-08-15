# Onboarding Diary

A responsive web application where new recruits document their onboarding journey — tasks, issues, feedback and
notes — while managers and admins get oversight, dashboards and exportable reports.

- **Backend:** .NET 8 Web API, EF Core 8, SQLite, JWT bearer auth, FluentValidation, Serilog, QuestPDF, CsvHelper.
- **Frontend:** React + TypeScript + Vite, React Router, TanStack Query, MUI, react-hook-form + zod.
- **Docs:** [`docs/requirements.md`](docs/requirements.md) holds the elaborated requirements, endpoint table and
  UI flows.

## Repository layout

```
backend/    OnboardingDiary.sln, API project and test project
frontend/   Vite React application
docs/       requirements and design notes
scripts/    dev helper scripts
```

## Prerequisites

- .NET SDK 8.0
- Node.js 20+ and npm

## Running the backend

```bash
cd backend/OnboardingDiary.Api
dotnet restore
dotnet run
```

The API listens on <http://localhost:5080> and serves Swagger UI at <http://localhost:5080/swagger> in development.
On startup it applies EF Core migrations and seeds the admin account automatically.

To apply migrations manually:

```bash
cd backend/OnboardingDiary.Api
dotnet tool install --global dotnet-ef      # first time only
dotnet ef database update
```

To create a new migration after changing the model:

```bash
dotnet ef migrations add <Name> --output-dir Data/Migrations
```

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on <http://localhost:5173> and talks to the API at `VITE_API_BASE_URL` (default
`http://localhost:5080`); copy `frontend/.env.example` to `frontend/.env` to override it.

## Running both at once

```bash
./scripts/dev.sh
```

## Seeded credentials

| Role  | Email                     | Password       |
| ----- | ------------------------- | -------------- |
| Admin | `admin@onboarding.local`  | `Admin#12345`  |

Sign up from the login page to create additional accounts; self-service signups are always created as `NewRecruit`.
An admin assigns managers and roles.

## Tests and checks

```bash
cd backend && dotnet build && dotnet test
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```

## Roles

| Role         | Capabilities                                                                 |
| ------------ | ---------------------------------------------------------------------------- |
| `NewRecruit` | Full CRUD on their own diary entries, dashboard and reports for themselves.   |
| `Manager`    | Everything a recruit can do plus read-only access to their assigned recruits. |
| `Admin`      | Read access to every recruit, plus reporting across the organisation.         |

Authorization is enforced server-side on every endpoint (ownership plus role), not just hidden in the UI.
