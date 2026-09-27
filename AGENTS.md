# AGENTS.md — Onboarding Diary

## Project purpose

Onboarding Diary is a web application for new recruits to document their
onboarding journey: daily entries, milestones, questions, and reflections that
help both the recruit and their mentors track progress during the first weeks.

## Monorepo layout

| Path        | Description                                        | Module guide            |
|-------------|----------------------------------------------------|-------------------------|
| `backend/`  | Kotlin / Spring Boot REST + SSE API, Postgres       | `backend/AGENTS.md`     |
| `frontend/` | Next.js web client with MobX state management       | `frontend/AGENTS.md`    |
| `docs/`     | Requirements and design documents                   | `docs/requirements.md`  |

Read the module-level `AGENTS.md` before changing code in that module. Reusable
conventions with code snippets live under `.agents/skills/`.

## Global tech stack

- **Language / runtime (backend):** Kotlin on JDK 24
- **Backend framework:** Spring Boot 4.x (Spring Framework 7), Spring WebFlux + Kotlin coroutines
- **Frontend:** Next.js (React) with MobX for global state
- **Database:** PostgreSQL
- **Testing (backend):** JUnit 5, Testcontainers (Postgres)

## Git workflow

- `dev-prabath` is the integration branch and the **default PR target**.
- All feature work happens on short-lived feature branches created from
  `dev-prabath` and merged back into `dev-prabath` via pull request.
- Never commit directly to `dev-prabath` or `main`.
- Keep PRs small and focused; one logical change per PR.

## Authentication

- Username / password authentication.
- Passwords are never stored in plain text: store only a salted hash produced by
  a modern password hashing algorithm (BCrypt or Argon2).
- The frontend never handles password hashing; hashing happens exclusively in
  the backend.
