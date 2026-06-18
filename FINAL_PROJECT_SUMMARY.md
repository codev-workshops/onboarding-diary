# Final Project Summary — Onboarding Diary

A web application that lets new recruits log their onboarding journey across four
record types (Tasks, Issues, Feedback, Notes), with role-aware dashboards,
reporting, cross-entity search, and analytics. Built incrementally over seven
phases plus two extension features, following the MVP scope recommended in
`DESIGN_REVIEW.md`.

- **PR:** [#32](https://github.com/codev-workshops/onboarding-diary/pull/32)
- **Tests:** Backend **146** · Frontend **23** · per-feature in-browser E2E.

---

## 1. Architecture

**Stack**
- **Backend:** Java 17, Spring Boot 3.3.x (Web, Security, Data JPA, Validation), Flyway, springdoc-openapi, OpenPDF.
- **Database:** PostgreSQL 15.
- **Frontend:** React 18 + TypeScript + Vite, React Router, Axios.
- **Testing:** JUnit 5, Mockito, Spring Boot Test + Testcontainers (real Postgres); Vitest + Testing Library.
- **CI:** GitHub Actions (backend build+test, frontend lint+build+test).

**Layering (backend)**
```
Controller  → HTTP, request/response DTOs, validation, OpenAPI annotations
Service     → business logic, RBAC scoping, aggregation, rendering
Repository  → Spring Data JPA + JpaSpecificationExecutor (dynamic predicates)
Entity      → JPA mappings (one table per record type + users)
Security    → JWT filter → AuthenticatedUser in SecurityContext; CurrentUser helper
```

**Layering (frontend)**
```
pages/       → route-level screens (one per feature)
components/   → shared UI (TopBar, charts, ProtectedRoute)
api/         → typed Axios clients (one module per resource) + interceptors
auth/        → AuthContext (token storage, 401 → redirect)
```

**Request flow:** React page → typed Axios client (attaches `Bearer` token) →
Spring controller → service (RBAC + logic) → repository/Postgres → DTO → JSON.
A 401 anywhere triggers the Axios interceptor to clear the token and redirect to login.

---

## 2. Features

| Area | Capability |
|---|---|
| **Auth** | Email+password login, short-TTL JWT, client-side logout, route guards |
| **Users** | Admin CRUD for users; soft-disable on delete; self-service profile (`/me`) |
| **Task Log** | CRUD, filter by status/category/priority/owner/date/search |
| **Issue Log** | CRUD, severity + status + resolution notes, filtering |
| **Feedback** | CRUD, type (Positive/Suggestion/Concern), filtering |
| **Notes** | CRUD, tags (`@ElementCollection`, AND-filtering), date/search filters |
| **Dashboard** | Summary cards, task-completion & open-issue metrics, recent-activity feed |
| **Reports** | Tasks/Issues/Feedback/Combined → CSV & PDF, date-range + RBAC scope |
| **Global Search** | Cross-entity keyword search, type filter, relevance/date sort, snippets |
| **Analytics** | 5 chart series (trends + distributions), date-range filter, inline-SVG charts |

---

## 3. Security

- **AuthN:** signed JWT (HMAC), short expiry, validated by a `OncePerRequestFilter`
  that populates an `AuthenticatedUser` (id, email, role) into the security context —
  no per-request DB lookup.
- **AuthZ (defense in depth):**
  1. `@PreAuthorize` on controllers for coarse role gating.
  2. **Ownership checks in every service** via a single `visibleOwnerIds(caller)`
     primitive: `ADMIN → all`, `RECRUIT → {self}`, `MANAGER → {self} + assigned recruits`.
  3. Reads outside the visible set return **404** (avoid existence disclosure);
     an explicit out-of-scope `ownerId` filter returns **403**.
- **Passwords:** BCrypt; hashes never serialized into any DTO or log.
- **Input validation:** Jakarta Bean Validation on request DTOs; a
  `GlobalExceptionHandler` normalizes validation, type-mismatch, and missing-param
  errors into a consistent `ApiError` envelope (400 instead of 500 for bad params).
- **SQL injection:** all queries via JPA criteria / parameter binding — no string concatenation.
- **CORS:** restricted to configured origins.
- **Transport:** designed for HTTPS/TLS termination at the load balancer (NFR-10).

**Deliberately deferred** (per DESIGN_REVIEW): refresh tokens / server-side
revocation, per-field PII encryption (recommended disk/TDE instead), audit log,
SSO/OIDC, GDPR export.

---

## 4. Database Design

Single-schema Postgres, migrated by Flyway (`V1`–`V5`). The `users`+`recruits`
collapse (one `users` table with a `role` column) was a key MVP simplification —
it removes a join and the email-drift hazard flagged in the design review.

```
users (V1)
  id, name, email (UNIQUE lower(email)), password_hash,
  role {ADMIN|MANAGER|RECRUIT}, status {ACTIVE|DISABLED},
  manager_id → users.id, created_at, updated_at

tasks (V2)      owner_id → users.id, date, title, description,
                category, status, priority, created_at, updated_at
issues (V3)     owner_id, date, title, description, severity, status,
                resolution_notes, created_at, updated_at
feedback (V4)   owner_id, date, subject, type, details, created_at, updated_at
notes (V5)      owner_id, date, title, content, created_at, updated_at
note_tags (V5)  note_id → notes.id, tag        (element-collection table)
```

- Each record type is **owned** by a user (`owner_id` FK, cascade on delete).
- Enums stored as strings with `CHECK` constraints; indexes on `owner_id`,
  `date`, and frequently-filtered enum columns.
- No migration was needed for Dashboard, Reports, Search, or Analytics — they are
  **read-only aggregations** over existing tables.

---

## 5. API Design

REST under `/api/v1`, JSON, JWT-secured (except `/auth/login`, `/health`, `/ready`,
OpenAPI). Documented via springdoc at `/swagger-ui.html`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Obtain JWT |
| GET/PUT | `/me` | Self profile |
| POST/GET/PUT/DELETE | `/users` | Admin user management |
| POST/GET/PUT/DELETE | `/tasks` `/issues` `/feedback` `/notes` | Record CRUD + list filters |
| GET | `/dashboard` | Aggregated summary/metrics/activity |
| GET | `/reports?type=&format=&dateFrom=&dateTo=&ownerId=` | CSV/PDF export |
| GET | `/search?q=&types=&sort=` | Cross-entity search |
| GET | `/analytics?dateFrom=&dateTo=` | Chart series |

**Conventions:** plural nouns, query-param filtering, `Pageable` on lists,
consistent `ApiError` envelope (`status`, `message`, `errors[]`), 201 on create,
204 on delete, 400/401/403/404 used precisely.

---

## 6. Testing Summary

| Layer | Count | Tooling | Coverage focus |
|---|---:|---|---|
| Backend unit | service/security tests | JUnit + Mockito | RBAC scoping, scoring, aggregation math, validation |
| Backend integration | API tests | Spring Boot Test + Testcontainers (real Postgres + Flyway) | end-to-end HTTP, auth, RBAC, error codes |
| **Backend total** | **146** | `mvn verify` | — |
| Frontend | **23** (9 files) | Vitest + Testing Library | render, form submission, API calls, results display |
| E2E | per-feature | In-browser (live React + seeded Spring Boot) | login, CRUD, filters, downloads, search, analytics |

Integration tests run against a **real Postgres** (not H2) so migrations and the
`lower(email)` unique index are genuinely exercised. RBAC is asserted at both the
unit level (mocked repositories) and the integration level (seeded multi-user data).

---

## 7. Extension Features

- **Global Search** — one `GET /api/v1/search` queries all four record types via
  per-entity `Specification`s (`owned(ownerIds) AND OR(ILIKE…)`), scores hits
  (title +2 / body +1), generates context snippets, and returns a single ranked,
  RBAC-scoped list. Sort by relevance or date; optional `types` filter.
- **Analytics Dashboard** — `GET /api/v1/analytics` fetches the four logs once
  within scope+date-range and computes five series (task-completion trend, issue
  severity/status distributions, feedback-type distribution, activity-volume
  trend). Rendered as **dependency-free inline-SVG charts** (two line charts +
  three bar charts) with a date-range filter and hover tooltips — no new npm dependency.

---

## 8. Trade-offs

| Decision | Trade-off | Rationale |
|---|---|---|
| Single `users` table (no separate `recruits`) | Less normalized for future recruit-only fields | Removes a join + email-drift; matches MVP scope |
| Stateless JWT, no refresh/revocation | Can't force-logout server-side; logout is client-side | Simplicity; short TTL bounds risk; revocation deferred |
| `ILIKE` search (not full-text/`tsvector`) | No stemming/ranking sophistication; linear scaling | Zero infra; adequate at MVP data volumes; documented upgrade path |
| In-memory aggregation for Dashboard/Analytics | Re-computes per request; not for huge datasets | Correct + simple; no materialized views needed at MVP scale |
| Inline-SVG charts (no charting library) | Manual chart code; fewer chart types | Avoids a supply-chain dependency; full control; small bundle |
| 404 (not 403) for out-of-scope reads | Slightly less explicit to clients | Avoids existence disclosure of other users' records |
| Reflection in some unit tests (immutable fields) | Test-only coupling to field names | Lets us assert on entities with immutable persistence fields |
| One PR for all phases (`#32`) | Large PR | Matches the incremental-phase exercise; each phase a discrete commit |

---

## 9. Future Work (documented, not built)

Diary entries & milestones, milestone templates, mood timeline, refresh tokens,
audit logging, SSO/OIDC, per-field PII encryption (or TDE), GDPR export/retention,
full-text search, and async/materialized reporting for scale.
