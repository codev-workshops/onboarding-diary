# Onboarding Diary — Architecture

Consolidated system view. Individual decisions and their trade-offs live in
[`adr/`](adr/README.md); this document describes the system those decisions produce. Scope and
behaviour come from [`requirements.md`](requirements.md); the build order is in
[`implementation-plan.md`](implementation-plan.md).

Status: M0 scaffold exists; feature code starts at M1.

---

## 1. System overview

A two-tier application: a React single-page app talking to a stateless ASP.NET Core API over
JSON, with a SQLite file as the only persistent store.

```
┌──────────────────────────┐        HTTPS / JSON        ┌─────────────────────────────┐
│  Browser (SPA)           │  ───────────────────────>  │  OnboardingDiary.Api        │
│                          │   Authorization: Bearer    │  ASP.NET Core Minimal APIs  │
│  React + TS + Vite       │  <───────────────────────  │  .NET 10                    │
│  React Router (guards)   │      JSON / ProblemDetails │                             │
│  Query cache             │      PDF / CSV streams     │  endpoint filters:          │
│                          │                            │   validation → ProblemDetails│
└──────────────────────────┘                            │  policies + EntryAccess      │
                                                        │  handler (authorization)     │
                                                        │  QuestPDF / CsvHelper        │
                                                        └──────────────┬───────────────┘
                                                                       │ EF Core
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  SQLite app.db  │
                                                              └─────────────────┘
```

No background workers, no message broker, no cache tier, no outbound email (ADR-011). In
development the Vite dev server proxies `/api` to the API so the browser sees a single origin.

**Roles.** `RECRUIT` authors entries; `MANAGER` reads assigned recruits' entries and generates
their reports; `ADMIN` manages users and reads everything.

---

## 2. Backend

### 2.1 Structure

Feature-oriented rather than layered (ADR-002). A vertical slice touches, for one feature:

| Folder | Contents |
|---|---|
| `Endpoints/<Feature>Endpoints.cs` | route group, route definitions, `TypedResults` handlers |
| `Features/<Feature>/` | request/response DTOs, validators, handler service |
| `Domain/` | entity and enums, no EF attributes |
| `Infrastructure/Configurations/` | `IEntityTypeConfiguration` for the entity |
| `Infrastructure/Migrations/` | the milestone's migration |
| `Common/` | only genuinely cross-cutting code (paging, problem details, policies) |

### 2.2 Request pipeline

```
HTTP request
  → routing / MapGroup
  → rate limiter            (login endpoints only)
  → JWT bearer authentication      → 401 on missing/expired/invalid token
  → authorization policy           → 403 on wrong role
  → validation endpoint filter     → 400 ValidationProblem on bad input
  → handler service
       └─ EntryAccessHandler       → 403 on manager/admin writes, 404 out of scope
       └─ EF Core query / command
  → TypedResults → JSON | file stream
  (any unhandled exception → global handler → 500 ProblemDetails + correlation id)
```

### 2.3 API conventions (ADR-012)

Base path `/api/v1`; camelCase JSON; ISO-8601 dates; enums as strings; RFC 7807 `ProblemDetails`
for every failure; lists always paged (`page`, `page_size` ≤ 100, `sort`) returning
`{ items, page, page_size, total }`; shared filter names (`from`, `to`, `q`, `user_id`).

Endpoint groups, by the milestone that introduces them:

| Group | Milestone |
|---|---|
| `/auth`, `/me`, `/departments` | M1 |
| `/tasks`, `/dashboard` (basic) | M2 |
| `/issues`, `/feedback`, `/notes`, `/dashboard` (full) | M3 |
| `/admin/users`, `/admin/stats`, manager-scoped reads | M4 |
| `/reports/preview`, `/reports/download` | M5 |

### 2.4 Authentication and authorization

Login returns a **JWT bearer access token** (8 h; claims: subject, email, role, name). There are
no refresh tokens and no server-side token state (ADR-006); logout clears the token in the
browser. Passwords are hashed with PBKDF2 (`PasswordHasher<T>`). Login is rate limited to 5
attempts per 15 minutes per IP.

Authorization runs in two layers (ADR-013): claim-based policies (`AdminOnly`, `RecruitOnly`,
`ManagerOrAdmin`) for coarse gating, then `EntryAccessHandler` for the relationship check —
owner reads and writes, assigned manager reads only, admin reads only. Out-of-scope resources
return 404 rather than 403. Route guards in the SPA are UX only and are never trusted.

### 2.5 Data model

Entities arrive with the milestone that implements them (ADR-010): `User` and `Department` in
M0, `TaskEntry` in M2, `IssueEntry`/`FeedbackEntry`/`NoteEntry`/`NoteTag` in M3, extension tables
in M7.

```
Department 1───* User 1───* TaskEntry
                  │  │
                  │  ├──* IssueEntry
                  │  ├──* FeedbackEntry
                  │  └──* NoteEntry 1───* NoteTag
                  │
                  └── manager_id ──> User      (self-reference, cycles rejected)
```

Deletes are **hard deletes** (ADR-008): no `deleted_at`, no global query filters, confirmation
required in the UI, and only the owning recruit may delete.

SQLite shapes three details (ADR-005): emails are stored lower-cased under a plain unique index,
note tags live in a child table because there is no array type, and dates are ISO-8601 text via
value converters. Indexes: `(user_id, entry_date)` on every entry table, `(user_id, status)` on
tasks and issues, `(tag, note_id)` on note tags.

### 2.6 Reporting

`/reports/preview` returns JSON for on-screen preview; `/reports/download` streams **CSV**
(CsvHelper — one file, a `section` column for combined reports) or **PDF** (QuestPDF — header
with recruit, department, range and generated-at, summary counts, per-section tables). Ranges
are capped at 366 days and validated `from ≤ to`; scope is enforced by the same authorization
handler as the read endpoints.

---

## 3. Frontend

React + TypeScript on Vite, routed by React Router's data router (ADR-004). `src/features/*`
mirrors the backend feature names so a slice is traceable end to end; anything shared moves to
`src/components/`.

- **Auth context** holds the token in memory with a `sessionStorage` fallback for reloads,
  attaches it to every request, and on 401 clears state and redirects to login preserving the
  attempted route.
- **Route guards** (`RequireRole`) keep users out of screens their role cannot use.
- **Server state** lives in a query cache keyed per resource and filter set, invalidated after
  mutations; no global client store.
- **Forms** use schema validation mirroring the server rules, so the server stays authoritative
  while the user gets immediate feedback.
- **Every list screen** has explicit loading, empty and error states, a shared filter bar, and
  a table-on-desktop / cards-on-mobile presentation.
- **Responsive and accessible** down to 360 px, WCAG 2.1 AA: keyboard-navigable forms and
  modals, labelled inputs, contrast ≥ 4.5:1, status and severity conveyed by text as well as
  colour. Hardened in M6.

---

## 4. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Configuration | `appsettings*.json` plus environment variables; JWT signing key from configuration, never committed |
| Errors | `ProblemDetails` everywhere; global exception handler adds a correlation id |
| Logging | structured logs with request/correlation id; no PII beyond user id in log messages |
| Health | `GET /healthz` |
| API docs | OpenAPI/Swagger in development only |
| CORS | restricted to the app origin; same-origin via the Vite proxy in development |
| Rate limiting | built-in limiter on authentication endpoints |
| Migrations | EF Core, one per schema-changing milestone; seed data is idempotent and development-only |

---

## 5. Quality and delivery

Testing (ADR-014): xUnit unit tests for validators, issue state transitions and the permission
handler; integration tests per endpoint on `WebApplicationFactory` against a real temp-file
SQLite database, table-driven across `{recruit-own, recruit-other, assigned-manager,
unassigned-manager, admin, anonymous}`; Vitest and React Testing Library on the frontend;
Playwright golden paths from M6.

Delivery (ADR-007): commits go straight to `main`, one milestone at a time, no feature branches
or PRs unless requested. CI on every push runs backend build and test, and frontend lint and
build — the only automated gate, so it must stay green.

---

## 6. Deliberate non-goals

No refresh tokens or server-side session revocation; no outbound email of any kind; no SSO; no
soft delete, undo or audit trail; no Department CRUD UI (seeded reference data only, ADR-009);
no fixed onboarding period — dashboard progress is task completion percentage; no manager
comments or editing of recruit entries; no anonymous feedback; no background jobs, caching tier
or multi-tenancy.

---

## 7. Known constraints and future directions

| Constraint | Consequence today | If it needs to change |
|---|---|---|
| SQLite single-writer | fine for this workload | swap the EF Core provider to PostgreSQL and regenerate migrations; revisit the lower-cased email index and the tag child table |
| Tokens cannot be revoked before expiry | deactivating a user takes effect at expiry | add refresh tokens with a server-side store (supersede ADR-006) |
| Hard deletes | no undo | add an append-only audit table rather than reinstating soft delete |
| No review gate on `main` | CI is the only safety net | switch to PRs; a workflow change only |
| Hand-maintained TypeScript DTOs | can drift from the backend contract | generate the client from the OpenAPI document |
