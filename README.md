# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their onboarding journey.

This repository currently contains the **Phase 1 MVP Foundation**: authentication
and user management. Diary entries, milestones, dashboards, and reporting are
intentionally out of scope for this phase (see `IMPLEMENTATION_PLAN.md` and
`DESIGN_REVIEW.md`).

## Documentation

Design docs live at the repo root: `REQUIREMENTS.md`, `USER_STORIES.md`,
`API_SPEC.md`, `DATABASE_SCHEMA.md`, `UI_FLOWS.md`, `ARCHITECTURE.md`,
`IMPLEMENTATION_PLAN.md`, and the `DESIGN_REVIEW.md` whose MVP recommendations
this phase implements.

## Phase 1 scope

- Email/password authentication issuing a short-TTL JWT (no refresh token —
  per the MVP simplification).
- Single `users` table combining auth identity and recruit profile.
- Role-based access control for `ADMIN`, `MANAGER`, and `RECRUIT`.
- Admin user management (create/list/get/update/disable) and self-service
  profile (`/me`).
- Task log (Phase 2): per-user task entries with create/edit/delete/list and
  filtering by status, category, priority, date range, and free-text search.
  Recruits manage their own tasks; managers can view their assigned recruits'
  tasks; admins can view all.
- React login page, profile page, and task log pages (list, detail,
  create/edit).

## Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Spring Boot 3, Spring Security, Spring Data JPA, Flyway, springdoc/OpenAPI |
| Database | PostgreSQL 15 |
| Auth     | JWT (HS256), BCrypt password hashing |
| Frontend | React 18 + TypeScript + Vite, React Router, Axios |
| Tests    | JUnit 5 + Mockito + Testcontainers (backend), Vitest + Testing Library (frontend) |

## Running locally

### Everything via Docker Compose

```bash
docker compose up --build
```

This starts PostgreSQL and the backend (with `SEED_ENABLED=true`, seeding the
default admin `admin@onboardingdiary.local` / `ChangeMe!2026`). The API is then
available at `http://localhost:8080`, Swagger UI at
`http://localhost:8080/swagger-ui.html`.

### Backend (standalone)

```bash
# start a database
docker run -d --name onboarding-pg -e POSTGRES_USER=onboarding \
  -e POSTGRES_PASSWORD=onboarding -e POSTGRES_DB=onboarding_diary \
  -p 5432:5432 postgres:15-alpine

cd backend
SEED_ENABLED=true mvn spring-boot:run
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev   # http://localhost:5173
```

## Testing

```bash
cd backend && mvn verify      # unit + Testcontainers integration tests
cd frontend && npm run lint && npm run build && npm test
```

> Backend integration tests require a running Docker daemon (Testcontainers).

## API overview

Base path: `/api/v1`. Full contract in `API_SPEC.md`; live docs at
`/swagger-ui.html`.

| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/login` | public |
| GET | `/me` | authenticated (self) |
| PUT | `/me` | authenticated (self) |
| POST | `/users` | ADMIN |
| GET | `/users` | ADMIN (all), MANAGER (assigned recruits) |
| GET | `/users/{id}` | self / assigned manager / ADMIN |
| PUT | `/users/{id}` | ADMIN |
| DELETE | `/users/{id}` | ADMIN (soft delete / disable) |
| POST | `/tasks` | authenticated (owner = caller) |
| GET | `/tasks` | recruit (own), manager (own + assigned recruits), ADMIN (all); supports `status`, `category`, `priority`, `ownerId`, `dateFrom`, `dateTo`, `search` filters |
| GET | `/tasks/{id}` | owner / assigned manager / ADMIN |
| PUT | `/tasks/{id}` | owner |
| DELETE | `/tasks/{id}` | owner |
| GET | `/health`, `/ready` | public |
