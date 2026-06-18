# Interview Prep — Onboarding Diary

A self-study guide for presenting this project: likely questions, the reasoning
behind key decisions, trade-offs, how the build was executed with Devin,
challenges hit, and the validation strategy.

---

## 1. Likely Questions (with crisp answers)

**Q: Walk me through the architecture.**
React/TS SPA → typed Axios clients → Spring Boot REST API (`/api/v1`) →
service layer (business logic + RBAC) → Spring Data JPA / Postgres. JWT auth via
a request filter that hydrates an `AuthenticatedUser` into the security context.
Flyway manages schema; springdoc generates OpenAPI.

**Q: How does authorization work?**
Defense in depth. `@PreAuthorize` gives coarse role gating; the real enforcement
is in services via one primitive — `visibleOwnerIds(caller)` returns `null` for
admin (all), `{self}` for recruit, `{self} + assigned recruits` for manager. Every
list query applies an `owned(ownerIds)` JPA `Specification`; single-record reads
outside scope return 404 to avoid existence disclosure.

**Q: Why one `users` table instead of separate `users` and `recruits`?**
The design review flagged the two-table design as causing an email-drift hazard
(email duplicated in both) and an extra join on every read. Collapsing to one
table with a `role` column removed both for no real loss at MVP scope.

**Q: How does Global Search work across four different entity types?**
Each type has a `Specification` combining the owner predicate with an OR of
`ILIKE` clauses over its text columns. Results are scored (title match +2, body
+1), given a context snippet, merged into one list, then sorted by relevance or
date. RBAC reuses the same `visibleOwnerIds` primitive.

**Q: Why no charting library for Analytics?**
The five charts (2 line, 3 bar) are simple enough to render as inline SVG. That
avoids adding an npm dependency (supply-chain surface, bundle size) and gives full
control over styling and accessibility. The backend does all aggregation; the
frontend just plots.

**Q: How would this scale to 10k recruits?**
Reads are the hot path. Add composite indexes on `(owner_id, date)`; move
Dashboard/Analytics aggregation to SQL `GROUP BY` (or materialized views refreshed
async) instead of in-memory; serve reports asynchronously; add pagination caps
(already present). The API is stateless so it scales horizontally behind a LB.

**Q: What happens on logout / token theft?**
Logout is client-side (drop the token). Short TTL bounds the exposure window.
True server-side revocation would need a refresh-token store or a denylist — a
documented, deliberate deferral.

---

## 2. Architectural Decisions

| Decision | Why |
|---|---|
| Layered controller/service/repository | Clear separation; services are unit-testable without HTTP |
| `Specification`-based dynamic queries | One reusable owner/keyword/date predicate builder per entity; no string SQL |
| Single RBAC primitive `visibleOwnerIds()` | DRY — identical scoping across CRUD, dashboard, reports, search, analytics |
| Read-only aggregation features (no new tables) | Dashboard/Reports/Search/Analytics derive from existing data; fewer migrations |
| Format-agnostic `ReportData` + renderers | Add a new export format by adding a renderer, not touching report logic |
| Testcontainers over H2 | Tests exercise real Postgres + Flyway + `lower(email)` index |
| Consistent `ApiError` envelope via `GlobalExceptionHandler` | Predictable client error handling; bad params → 400, not 500 |

---

## 3. Trade-offs (be ready to defend)

- **`ILIKE` vs full-text search:** simpler, zero infra, fine at MVP volume; lacks
  stemming/ranking. Upgrade path: Postgres `tsvector` + GIN index.
- **In-memory aggregation:** simplest correct implementation; would move to SQL
  aggregation/materialized views under load.
- **Stateless JWT:** scalable and simple; the cost is no instant revocation.
- **404 over 403 for out-of-scope reads:** privacy over explicitness.
- **One big PR across phases:** matches the incremental exercise; mitigated by one
  discrete commit per phase and green CI throughout.

---

## 4. How Devin Was Used

- **Design first:** produced 7 design docs + a staff-engineer `DESIGN_REVIEW.md`
  that defined the MVP cut **before** any code — that scoping drove every later phase.
- **Phased delivery:** each phase (auth → tasks → issues → feedback → notes →
  dashboard → reports → search → analytics) was implemented, tested
  (unit + Testcontainers integration + Vitest), verified **end-to-end in a real
  browser**, then committed to PR #32 with CI kept green.
- **Pattern reuse:** once the Task slice established the entity→migration→service→
  controller→DTO→tests→pages pattern, subsequent record types mirrored it,
  keeping the codebase consistent.
- **Verification discipline:** lint + typecheck + full backend/frontend suites run
  before every commit; CI (incl. an automated review bot) checked on each push.
- **Final deliverables:** this set of summary/handoff docs mapping requirements to
  evidence — no functionality changed while producing them.

---

## 5. Challenges Encountered

- **Generic type erasure in unit tests:** repository mocks returning `List` where
  `Page` was expected — fixed by wrapping with `PageImpl`.
- **Immutable entity fields in tests:** `id`/`updatedAt` had no setters; used
  `ReflectionTestUtils.setField` to construct deterministic fixtures.
- **Bad query params returned 500:** added handlers for
  `MethodArgumentTypeMismatchException` / `MissingServletRequestParameterException`
  so invalid enum/date params return 400.
- **Heterogeneous search ranking:** unifying four entity shapes into one scored,
  sortable result list required a per-entity `Specification` + a normalized result DTO.
- **Charts without a library:** computing SVG coordinate transforms (axis scaling,
  multi-series polylines, labels) by hand for the analytics page.

---

## 6. Validation Strategy

A test pyramid, run on every commit and in CI:

1. **Unit (service/security)** — Mockito-mocked repositories; assert RBAC scoping,
   relevance scoring, aggregation math, and validation rules in isolation.
2. **Integration (API)** — Spring Boot Test + **Testcontainers (real Postgres +
   Flyway)**; seed multi-user data and assert full HTTP behavior: auth required,
   recruit-own / manager-assigned / admin-all visibility, type/date filters, and
   precise status codes (400/401/403/404).
3. **Frontend** — Vitest + Testing Library; assert each page renders, submits the
   right API params, and displays results (API mocked).
4. **End-to-end** — in a live browser against the running app with seeded data,
   per feature (login, CRUD, filters, downloads, search, analytics date-range).

**Final totals:** Backend **146** tests · Frontend **23** tests · per-feature E2E,
all green; CI passing on PR #32.

**Why real Postgres in tests:** H2 would mask migration issues and Postgres-specific
behavior (e.g. the `lower(email)` unique index, `ILIKE`). Testcontainers gives
production-fidelity at the cost of slightly slower test runs.
