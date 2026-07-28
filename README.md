# onboarding-diary
Onboarding Diary Application - A web application for new recruits to document their onboarding journey

Scope and status: [`REQUIREMENTS.md`](./REQUIREMENTS.md), [`PROGRESS.md`](./PROGRESS.md).

## Stack

Java 17, Spring Boot 3.2 (Web, Data JPA, Security, Thymeleaf, Actuator), Flyway, PostgreSQL,
H2 (tests only), Maven.

## Local development

```bash
cp .env.example .env          # fill in DB_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, ...
docker compose up -d          # PostgreSQL on localhost:5432 (service `db`)
set -a && . ./.env && set +a  # export the variables for the app
./mvnw spring-boot:run
```

The app listens on `http://localhost:8080`. Health checks: `/health` and `/actuator/health`
(both public). Flyway applies `src/main/resources/db/migration` on startup; Hibernate never
creates or alters schema (`ddl-auto: none`).

On startup the first Admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (with
`ADMIN_NAME`, `ADMIN_DEPARTMENT`, `ADMIN_START_DATE` optional). It is idempotent: an existing
account with that email is left untouched.

## Tests

```bash
./mvnw clean verify
```

Tests run against in-memory H2 in PostgreSQL mode and need no external database.
