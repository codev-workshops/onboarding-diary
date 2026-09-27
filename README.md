# onboarding-diary
Onboarding Diary Application - A web application for new recruits to document their onboarding journey

## Local development

Backend + PostgreSQL run in Docker; the frontend runs on the host.

```bash
docker compose up --build          # Postgres 16 + backend on http://localhost:8080 (dev profile)
curl http://localhost:8080/health  # {"status":"UP", ...}

cd frontend && npm install && npm run dev   # http://localhost:3000
```

Backend tests (Testcontainers, requires Docker and JDK 24):

```bash
cd backend && ./gradlew test
```

See `AGENTS.md`, `backend/AGENTS.md` and `frontend/AGENTS.md` for conventions.
