# Onboarding Diary

A web application for new recruits to document their onboarding journey. Users log daily tasks, record issues, provide feedback, and capture notes. Managers can view entries and generate downloadable reports.

## Tech Stack

- **Backend:** Java 17, Spring Boot 3.5, Spring Data JPA, Spring Security, JWT
- **Frontend:** React 19, TypeScript, Vite, Ant Design
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker Compose

## Prerequisites

- Java 17+
- Node.js 20+
- PostgreSQL 16 (or Docker)

## Quick Start (Docker Compose)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/v1
- Swagger UI: http://localhost:8080/api/v1/swagger-ui

## Development Setup

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and proxies API calls to http://localhost:8080.

## Project Structure

```
onboarding-diary/
├── backend/           # Spring Boot application
│   ├── src/main/java/com/onboardingdiary/
│   └── src/main/resources/
├── frontend/          # React + TypeScript application
│   └── src/
├── docs/              # Requirements and documentation
├── docker-compose.yml
└── .env.example
```

## Documentation

See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for detailed requirements, API specs, and database schema.
