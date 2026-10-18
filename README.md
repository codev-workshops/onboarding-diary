# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their onboarding journey.

Recruits log tasks, issues, feedback and notes. Managers review the recruits assigned to them and download reports. Admins manage users.

## Tech stack

- Backend: Java 17, Spring Boot 3.3 (Web, Security, Data JPA, Validation), Flyway, H2 (file mode)
- Frontend: React 18 + TypeScript + Vite, served by Spring Boot from the same jar
- Auth: server-side session cookie with CSRF protection (`XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header)

## Running locally

Requirements: JDK 17 and Maven 3.9+. Node is downloaded automatically by the build.

```bash
mvn -B package                       # builds frontend + backend, runs all tests
java -jar target/onboarding-diary-0.1.0-SNAPSHOT.jar
# open http://localhost:8080
```

Data is stored in `./data/onboarding-diary.mv.db`. Delete the `data/` folder to reset.

### Development mode (hot reload)

```bash
mvn -DskipFrontend=true spring-boot:run   # backend on :8080
cd frontend && npm install && npm run dev  # frontend on :5173, proxies /api to :8080
```

### Tests

```bash
mvn -B verify                         # backend (JUnit/MockMvc) + frontend (Vitest)
mvn -B -DskipFrontend=true test       # backend only
cd frontend && npm test               # frontend only
```

## Accounts

An admin is created on first start:

| Email | Password |
|---|---|
| `admin@demo.local` | `Admin1234` |

Demo data (on by default, disable with `APP_DEMO_DATA=false`) adds a manager with two recruits and sample entries:

| Role | Email | Password |
|---|---|---|
| Manager | `manager@demo.local` | `Manager123` |
| Recruit | `alex@demo.local` | `Recruit123` |
| Recruit | `priya@demo.local` | `Recruit123` |

These are demo-only credentials. Override the admin with `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`. Sign-up always creates a Recruit; Admins create Managers and assign recruits to them.

## Features

| Role | Can do |
|---|---|
| Recruit | Log tasks, issues, feedback and notes (create/edit/delete own); dashboard; own reports |
| Manager | Read-only view of assigned recruits (dashboard + entries); reports for assigned recruits |
| Admin | Manage users (create, change role, assign manager, deactivate, reset password); view all recruits; reports for any recruit |

Reports: tasks, issues, feedback or combined, for an inclusive date range of up to 366 days, as CSV or PDF.
