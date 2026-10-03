# Onboarding Diary

A web application where new recruits document their onboarding journey (tasks, issues, feedback and notes), managers follow their recruits' progress, and admins manage users.

The approved specification is in [requirements_elaboration.md](requirements_elaboration.md). Delivery follows the phases in §7 of that document.

| Phase | Scope | Status |
|---|---|---|
| 1 | Project scaffold, CI, Docker, database baseline, authentication, profile | Done |
| 2 | Task, Issue, Feedback and Notes logs | Planned |
| 3 | Recruit dashboard | Planned |
| 4 | Manager views, admin user management, audit log | Planned |
| 5 | Reports (PDF / CSV) | Planned |
| 6 | Hardening (rate limiting, E2E tests) | Planned |

## Tech stack

- **Backend** (`backend/`): Java 17, Spring Boot 3.3, Spring Security (JWT), Spring Data JPA, Flyway, H2 (dev/test) / PostgreSQL (prod)
- **Frontend** (`frontend/`): React 18, TypeScript, Vite, MUI, React Router, TanStack Query, React Hook Form + Zod

## Running locally

Prerequisites: JDK 17 and Node.js 20.

```bash
# Terminal 1 – API on http://localhost:8080 (dev profile, file-based H2 in backend/data/)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2 – UI on http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

The `dev` profile seeds these accounts:

| Email | Password | Role |
|---|---|---|
| admin@example.com | Admin@12345 | Admin |
| manager@example.com | Password1 | Manager |
| recruit1@example.com, recruit2@example.com | Password1 | Recruit (managed by manager@example.com) |

Useful URLs in dev: Swagger UI at http://localhost:8080/swagger-ui.html and the H2 console at http://localhost:8080/h2-console (JDBC URL `jdbc:h2:file:./data/onboarding-diary`).

### Docker (PostgreSQL)

```bash
APP_JWT_SECRET=$(openssl rand -base64 48) APP_ADMIN_PASSWORD='Change-me-123' docker compose up --build
```

The UI is then available at http://localhost:8081. The refresh cookie is `Secure` by default; browsers accept that on `http://localhost`, but if you reach the stack over plain HTTP on another host, set `APP_REFRESH_COOKIE_SECURE=false`.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `APP_JWT_SECRET` | HS256 signing secret, at least 32 characters | Required outside `dev` |
| `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` | Bootstrap admin created on first start | `admin@example.com` / `Admin@12345` in `dev` |
| `APP_CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:5173` |
| `APP_ALLOWED_EMAIL_DOMAINS` | Comma-separated domains allowed to sign up (empty = any) | empty |
| `SPRING_PROFILES_ACTIVE` | `dev` (H2, demo data) or `prod` (PostgreSQL via `SPRING_DATASOURCE_*`). There is no default: without a profile, startup fails unless `APP_JWT_SECRET` is set | none |

## Quality checks

```bash
cd backend && ./mvnw verify          # tests + google-java-format check (fix with ./mvnw spotless:apply)
cd frontend && npm run lint && npm test && npm run build
```

CI runs the same checks on every pull request.
