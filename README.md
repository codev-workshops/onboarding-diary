# Onboarding Diary Application

A web application for new recruits to document their onboarding journey.

## Tech Stack
- **Backend**: Spring Boot 3.x, Java 17, Spring Security, JWT, JPA
- **Database**: H2 (in-memory)
- **Frontend**: React JS, React Router, Axios

## User Roles
- **Recruit**: Logs tasks, issues, feedback, and notes
- **Manager**: Views recruit entries and generates reports (PDF/CSV)
- **Admin**: Manages users, assignments, and views all data

## Getting Started

### Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs on http://localhost:8080
H2 Console: http://localhost:8080/h2-console (JDBC URL: jdbc:h2:mem:onboardingdb)

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:3000 (or 5173 with Vite)

## Default Users (Seed Data)
| Email | Password | Role |
|---|---|---|
| admin@onboarding.com | admin123 | Admin |
| manager@onboarding.com | manager123 | Manager |
| john@onboarding.com | recruit123 | Recruit |
| alice@onboarding.com | recruit123 | Recruit |

## API Documentation
See requirements.txt for full API endpoint listing.
