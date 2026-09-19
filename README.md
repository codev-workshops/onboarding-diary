# Onboarding Diary

A server-rendered web application where new recruits document their onboarding journey (tasks, issues,
feedback and notes), managers follow their team's progress, and admins manage users and data.

Stack: Java 21, Spring Boot 3.5 (MVC + Thymeleaf), Spring Security 6, Spring Data JPA, PostgreSQL 17,
Flyway, Bootstrap 5, Chart.js, PDFBox, Maven.

## Quick start

```bash
cp .env.example .env            # adjust if you need different ports/credentials
docker compose up -d            # PostgreSQL 17 on localhost:5432
./mvnw -v 2>/dev/null || mvn -v # Java 21 must be on JAVA_HOME
mvn spring-boot:run
```

The app is then available at http://localhost:8080 (redirects to `/login`).

Flyway creates the schema on first start. When the database is empty and `DEMO_DATA_ENABLED=true`,
demo accounts and sample diary entries are seeded.

### Demo accounts (development only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | `DEMO_PASSWORD` (default `Password123!`) |
| Manager | manager@example.com | same |
| Recruit | recruit@example.com | same |
| Recruit | recruit2@example.com | same |

Set `DEMO_DATA_ENABLED=false` outside local development.

## Build and test

```bash
mvn verify          # compile + full test suite (unit, MVC, API, security, reports)
mvn -DskipTests package && java -jar target/onboarding-diary-1.0.0.jar
```

Tests run against in-memory H2 (PostgreSQL compatibility mode); Flyway migrations are exercised
against real PostgreSQL when the app starts.

## Configuration

Every setting is environment-driven; nothing secret is committed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/onboarding_diary` | JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `diary` / `diary` | database credentials |
| `SERVER_PORT` | `8080` | HTTP port |
| `DEMO_DATA_ENABLED` | `true` | seed demo users/entries on an empty database |
| `DEMO_PASSWORD` | `Password123!` | password given to seeded demo accounts |
| `COOKIE_SECURE` | `false` | set `true` when serving over HTTPS |
| `THYMELEAF_CACHE` | `true` | disable while editing templates |

## Features

- Email/password authentication with BCrypt (strength 12), CSRF protection, session fixation protection.
- Roles: `RECRUIT`, `MANAGER`, `ADMIN`. Public signup always creates a recruit.
- Diary CRUD for tasks, issues, feedback and notes, all scoped to the signed-in user server-side.
- Dashboard: totals, completion percentage, open issues, overdue items, Chart.js status/severity charts,
  recent entries and quick-add actions.
- Cross-category search over tasks, issues, feedback and notes.
- CSV and PDF reports filtered by date range and type (`TASKS`, `ISSUES`, `FEEDBACK`, `COMBINED`).
- Manager views for assigned recruits only; admin user management (create, activate, assign managers).
- JSON API under `/api/**` returning DTOs (never entities or password hashes).

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Test strategy](docs/TEST_STRATEGY.md)
- [Traceability matrix](docs/TRACEABILITY.md)
- [Review log](docs/REVIEW_LOG.md)
- [Release readiness](docs/RELEASE_READINESS.md)
