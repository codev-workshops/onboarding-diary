# Architecture — Onboarding Diary

System architecture, technology choices, cross-cutting concerns, and security
considerations. Supports the requirements in `REQUIREMENTS.md`.

## 1. Architectural Style
- **Client–server, layered monolith** for v1 (single deployable backend + SPA
  frontend). Simple to build, test, and operate at the target scale (NFR-5);
  can be decomposed into services later if needed.
- **Stateless API** (JWT-based auth) so the backend scales horizontally
  (NFR-4) behind a load balancer.
- **Separation of concerns:** `Controller → Service → Repository → DB`.

## 2. High-Level Diagram

```
┌──────────────┐    HTTPS/JSON    ┌────────────────────────────┐
│  Browser SPA │ ───────────────▶ │        API Gateway /        │
│ (React/Next) │ ◀─────────────── │       Load Balancer         │
└──────────────┘                  └──────────────┬─────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │      Backend API (stateless)│
                                    │  Controllers                │
                                    │  Services (business rules)  │
                                    │  Repositories (data access) │
                                    │  Auth/RBAC · Validation     │
                                    └───────┬───────────┬─────────┘
                                            │           │
                                  ┌─────────▼──┐   ┌────▼──────────┐
                                  │ PostgreSQL │   │ Object store   │
                                  │ (primary)  │   │ (exports/back- │
                                  │            │   │  ups) optional │
                                  └────────────┘   └───────────────┘
```

## 3. Technology Choices

The existing experimental branches use **Spring Boot (Java) + React**; this
design adopts that stack as the recommended baseline, with a portable
alternative noted.

| Layer | Recommended | Alternative |
|-------|-------------|-------------|
| Frontend | React (Next.js or Vite) + TypeScript, component lib (Tailwind/shadcn) | Vue/Nuxt |
| Backend | Spring Boot 3 (Java 17+), Spring Web, Spring Security, Spring Data JPA, Bean Validation | Node/NestJS or FastAPI |
| DB | PostgreSQL 15+ | MySQL 8 |
| Migrations | Flyway | Liquibase |
| Auth | JWT (access + refresh), BCrypt/Argon2 | Session cookies |
| API docs | springdoc-openapi (OpenAPI 3) | — |
| Build/CI | Maven/Gradle + GitHub Actions | — |
| Deploy | Docker containers (compose for dev) | k8s for prod |

## 4. Backend Layering
- **Controllers** — HTTP mapping, DTO (de)serialization, delegate to services.
  No business logic.
- **DTOs** — request/response objects with Bean Validation annotations; never
  expose JPA entities directly (prevents over-posting / lazy-load leaks).
- **Services** — business rules, authorization checks, transaction boundaries
  (`@Transactional`), state transitions (e.g. milestone completion).
- **Repositories** — Spring Data JPA interfaces; custom queries for filters and
  full-text search.
- **Entities** — JPA mappings to the schema in `DATABASE_SCHEMA.md`.

Cross-cutting via filters/aspects: auth, request logging/tracing, exception
handling (`@RestControllerAdvice` → standard error body), rate limiting.

## 5. Frontend Architecture
- **SPA** with route-based code splitting; role-aware routing guards.
- **State:** server cache via React Query (or SWR) for data fetching/caching;
  light local/UI state with context/store.
- **API layer:** typed client generated from OpenAPI; central axios/fetch wrapper
  attaches the bearer token and handles 401 → refresh/redirect.
- **Forms:** schema-validated (e.g. zod) mirroring backend validation rules.
- **Component structure:** `components/ui/*` primitives + feature components
  (entries, milestones, dashboard) — consistent with existing branch layout.

## 6. Cross-Cutting Concerns

### 6.1 Validation
- Two layers: client (UX) and server (authoritative, Bean Validation).
- Centralized exception handling maps validation/constraint violations to the
  `400` error envelope in `API_SPEC.md` §4.

### 6.2 Error Handling
- Domain exceptions (`ResourceNotFoundException`, `ForbiddenException`,
  `ConflictException`, `InvalidStateException`) mapped to HTTP codes by a global
  handler. No stack traces leaked to clients.

### 6.3 Logging & Observability (NFR-32)
- Structured JSON logs with correlation/request IDs.
- Metrics (latency, error rate, throughput) via Micrometer → Prometheus.
- Health/readiness endpoints (`/health`, `/ready`).
- Distributed tracing-ready (OpenTelemetry) for future service split.

### 6.4 Configuration
- 12-factor: config via environment variables; secrets via a secrets manager
  (never committed). Separate profiles for dev/test/prod.

### 6.5 Caching & Performance
- DB indexes for hot queries (see schema).
- Pagination enforced on all list endpoints (NFR-2).
- Optional read caching (e.g. tag list) with short TTL.

## 7. Data Flow Example — Create Entry
```
POST /api/v1/entries
  → Controller validates DTO (Bean Validation)
  → Service: authorize (caller == owner), normalize tags (find-or-create),
    set timestamps, persist within a transaction
  → Repository saves entry + tag links
  → Controller returns 201 + EntryResponse
```

## 8. Security Considerations

### 8.1 Authentication
- Email/password with strong hashing (Argon2id or BCrypt, per-user salt).
- **JWT access tokens** (short TTL, e.g. 15–60 min) + **refresh tokens**
  (longer TTL, rotated, revocable). Tokens signed (RS256/HS256) and verified on
  every request.
- Login + invite endpoints rate-limited and protected against enumeration
  (generic error messages).
- Optional OIDC/SSO (FR-5) via the same token-issuing boundary.

### 8.2 Authorization (RBAC + ownership)
- Every endpoint enforces role **and** resource ownership server-side
  (NFR-12). Recruits → self only; managers → assigned recruits; admins → all.
- Use `404` instead of `403` where existence disclosure is a concern.
- Defense in depth: never rely on the client to hide/disable actions.

### 8.3 Input & Output Safety (NFR-13)
- Server-side validation of all inputs; reject unknown fields and oversized
  payloads.
- Parameterized queries / JPA — no string-built SQL (SQLi protection).
- Output encoding / sanitization of user content; if rich text is allowed,
  sanitize HTML (allowlist) to prevent stored XSS.
- Set security headers: `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`/frame-ancestors, `Referrer-Policy`, `Strict-Transport-Security`.

### 8.4 Transport & Data Protection
- TLS 1.2+ everywhere (NFR-10); HSTS enabled.
- PII (name/email) protected at rest (DB encryption / disk encryption); least
  privilege DB accounts (NFR-15).
- `Cache-Control: no-store` for authenticated responses.

### 8.5 CSRF / CORS
- Token-based auth via `Authorization` header (not cookies) avoids classic CSRF;
  if cookie sessions are used instead, enable SameSite + CSRF tokens.
- CORS allowlist restricted to known frontend origins.

### 8.6 Secrets & Supply Chain
- Secrets in a manager (Vault/cloud KMS), injected as env vars.
- Dependency scanning (SCA), pinned versions, prefer releases aged ≥ 7 days.
- Container image scanning in CI.

### 8.7 Auditing & Privacy
- Audit log for admin/destructive actions (NFR-14).
- Data export & deletion/anonymization workflows (NFR-40/41) with retention
  policy for departed recruits.
- Principle of data minimization; mood/private entries respect recruit privacy
  settings.

### 8.8 Threat Model (STRIDE summary)
| Threat | Mitigation |
|--------|------------|
| Spoofing | Strong auth, signed tokens, short TTL + refresh rotation |
| Tampering | TLS, server-side validation, parameterized queries |
| Repudiation | Audit log with actor + timestamp |
| Information disclosure | RBAC+ownership, 404 masking, PII encryption, no-store |
| Denial of service | Rate limiting, pagination, payload size limits, autoscale |
| Elevation of privilege | Server-side RBAC on every request, least-privilege DB |

## 9. Environments & Deployment
- **Dev:** docker-compose (API + Postgres + frontend), seed data.
- **CI:** lint, unit + integration tests, build images, run migrations against an
  ephemeral DB, security scans.
- **Prod:** containers behind a load balancer; managed Postgres with automated
  backups (NFR-7); blue/green or rolling deploys; migrations gated in the
  pipeline.

## 10. Scalability & Evolution Path
- Scale API horizontally (stateless); scale DB with read replicas if read-heavy.
- Extract bounded contexts (e.g. reporting, notifications) into services only
  when justified by load/ownership.
- Event hooks (e.g. milestone completed) can later feed notifications/analytics
  via an async queue.
