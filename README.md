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

Override with `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`. Sign-up always creates a Recruit; Admins create Managers and assign recruits to them.
