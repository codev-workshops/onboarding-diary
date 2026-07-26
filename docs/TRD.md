# Technical Requirements Document — Onboarding Diary Application

Companion to [BRD.md](./BRD.md). Requirement IDs referenced here (`FR-*`, `AC-*`) are
defined there.

Last updated: 2026-07-26

## 1. Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + TypeScript, Vite | SPA, client-side routing via React Router |
| Data fetching | TanStack Query | Server-state cache, invalidation after mutations |
| Forms & validation | React Hook Form + Zod | Zod schemas shared with the API package |
| Styling | Tailwind CSS | Responsive from 360 px up |
| Backend | Node.js 24 + Express 5 + TypeScript | REST API |
| ORM | Prisma with the `pg` driver adapter | Migrations are the single source of schema truth; Prisma 7 connects through a driver adapter rather than an engine URL |
| Database | PostgreSQL 16 | |
| Auth | JWT access token + rotating refresh token | `jsonwebtoken`, `argon2` for hashing |
| PDF generation | `pdfkit` | Server-side streaming to the response |
| CSV generation | `csv-stringify` | Server-side streaming to the response |
| Tests | Vitest (unit), Supertest (API integration) | |
| Local dev | Docker Compose (postgres + api + web) | |
| CI | none in v1 | lint, typecheck, test, and build run locally via root npm scripts and the pre-commit hook |

## 2. Architecture

### 2.1 Component view

```
Browser (React SPA)
    |  HTTPS, JSON, Bearer access token
    v
Express API  ──  auth middleware  ──  RBAC middleware  ──  route handlers
                                                             |
                                            service layer (business rules)
                                                             |
                                              Prisma client  ──►  PostgreSQL
                                                             |
                                            report renderers (PDF / CSV)
```

### 2.2 Repository layout (monorepo, npm workspaces)

```
/apps
  /web                 React SPA
    /src
      /app             routing, providers, layout shells
      /features        task-log, issue-log, feedback, notes, dashboard,
                       reports, admin, auth  (each: components + hooks + api)
      /components      shared presentational components
      /lib             api client, auth storage, formatters
  /api                 Express service
    /src
      /modules         auth, users, tasks, issues, feedback, notes,
                       dashboard, reports  (each: router + service + schema)
      /middleware      requireAuth, requireRole, requireEntryAccess,
                       errorHandler, requestLogger
      /lib             prisma client, jwt, password, pagination, errors
      /reports         csv renderer, pdf renderer
    /prisma            schema.prisma, migrations, seed.ts
    /tests             integration tests per module
/packages
  /shared              Zod schemas, enums, DTO types shared by web and api
/docs                  BRD.md, TRD.md, TASKS.md
/docker-compose.yml
```

### 2.3 Layering rules
- Route handlers parse and validate input, then delegate; they contain no business
  logic and no Prisma calls.
- Services own business rules and authorisation decisions that depend on data (for
  example "is this recruit a direct report of the caller"), and are the only layer that
  touches Prisma.
- The shared package must not import from `apps/*`; dependencies point inward only.
- Enumerations are declared once in `packages/shared` and mirrored by the Prisma enums;
  a unit test asserts the two lists match.

### 2.4 Request lifecycle
1. `requestLogger` assigns a `requestId` (UUID) and logs method, path, and duration.
2. `requireAuth` verifies the access token and attaches `req.user = { id, role }`.
3. `requireRole` (where applicable) rejects insufficient roles with 403.
4. The router validates `params`, `query`, and `body` against a Zod schema; failures
   produce 422.
5. The service applies scoping rules, performs the work, and returns a DTO.
6. `errorHandler` maps thrown `AppError` subclasses to the standard error envelope.

## 3. Data Model

### 3.1 Entity relationship summary

```
User 1 ──── * User            (manager  ──►  directReports, self-referential)
User 1 ──── * TaskEntry
User 1 ──── * IssueEntry
User 1 ──── * FeedbackNote
User 1 ──── * Note
Note * ──── * Tag             (via NoteTag join)
User 1 ──── * RefreshToken
```

All entry tables carry `ownerId` referencing `User.id` with `ON DELETE RESTRICT`;
users are deactivated rather than deleted, so entries are never orphaned (FR-U4).

### 3.2 Enumerations

| Enum | Values | Default |
|------|--------|---------|
| `Role` | `RECRUIT`, `MANAGER`, `ADMIN` | `RECRUIT` |
| `TaskCategory` | `SETUP`, `TRAINING`, `MEETING`, `DOCUMENTATION`, `DEVELOPMENT`, `OTHER` | `OTHER` |
| `TaskStatus` | `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE` | `NOT_STARTED` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH` | `MEDIUM` |
| `IssueSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | `MEDIUM` |
| `IssueStatus` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `WONT_FIX` | `OPEN` |
| `FeedbackType` | `POSITIVE`, `SUGGESTION`, `CONCERN` | — (required) |

Enum values are stored as PostgreSQL enums; human-readable labels live in
`packages/shared/labels.ts` and are used by the UI and by report renderers.

### 3.3 Tables

**User**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default generated |
| `email` | citext | unique, not null; the `citext` extension is created by the initial migration and declared via the `postgresqlExtensions` preview feature |
| `passwordHash` | text | not null |
| `fullName` | text | not null |
| `role` | `Role` | not null, default `RECRUIT` |
| `department` | text | nullable |
| `startDate` | date | nullable |
| `managerId` | uuid | nullable, FK → `User.id`, `ON DELETE SET NULL` |
| `isActive` | boolean | not null, default true |
| `createdAt` / `updatedAt` | timestamptz | not null |

Indexes: unique on `email`; index on `managerId`; index on `(role, isActive)`.
Constraint: `managerId <> id` (checked in the service, plus a DB check constraint).
Cycle prevention is enforced in the service by walking the manager chain (FR-U6).

**TaskEntry**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `ownerId` | uuid | FK → `User.id`, not null, restrict |
| `entryDate` | date | not null |
| `title` | text | not null, 1–200 chars |
| `description` | text | nullable, ≤ 5000 chars |
| `category` | `TaskCategory` | not null, default `OTHER` |
| `status` | `TaskStatus` | not null, default `NOT_STARTED` |
| `priority` | `TaskPriority` | not null, default `MEDIUM` |
| `createdAt` / `updatedAt` | timestamptz | not null |

Indexes: `(ownerId, entryDate DESC)`, `(ownerId, status)`, `(ownerId, category)`.

**IssueEntry**

Same owner/date/title/description/timestamps shape as `TaskEntry`, plus:
`severity` (`IssueSeverity`, default `MEDIUM`), `status` (`IssueStatus`, default
`OPEN`), `resolutionNotes` (text, nullable, ≤ 5000 chars).
Indexes: `(ownerId, entryDate DESC)`, `(ownerId, status)`, `(ownerId, severity)`.

**FeedbackNote**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `ownerId` | uuid | FK → `User.id`, not null, restrict |
| `entryDate` | date | not null |
| `subject` | text | not null, 1–200 chars |
| `type` | `FeedbackType` | not null |
| `details` | text | nullable, ≤ 5000 chars |
| `createdAt` / `updatedAt` | timestamptz | not null |

Indexes: `(ownerId, entryDate DESC)`, `(ownerId, type)`.

**Note**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `ownerId` | uuid | FK → `User.id`, not null, restrict |
| `entryDate` | date | not null |
| `title` | text | not null, 1–200 chars |
| `content` | text | nullable, ≤ 20000 chars |
| `createdAt` / `updatedAt` | timestamptz | not null |

**Tag** — `id` uuid PK, `name` text unique (lowercase, trimmed, 1–40 chars).
**NoteTag** — `noteId` + `tagId` composite PK, both FKs cascade on delete of the note.
Tag normalisation (lowercase, trim, de-duplicate) happens in the note service (FR-N2).

**RefreshToken**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `userId` | uuid | FK → `User.id`, cascade |
| `tokenHash` | text | not null, unique (SHA-256 of the token) |
| `expiresAt` | timestamptz | not null |
| `revokedAt` | timestamptz | nullable |
| `createdAt` | timestamptz | not null |

Index on `(userId, revokedAt)`. Raw refresh tokens are never stored.

### 3.4 Date handling
- `entryDate` is a SQL `date` with no timezone component; the API accepts and returns
  `YYYY-MM-DD` strings and never applies timezone conversion to it (FR-X7).
- `createdAt` / `updatedAt` are `timestamptz` stored in UTC and serialised as ISO 8601.
- The API rejects `entryDate` values later than the server's current UTC date (FR-T9).

## 4. API Design

Base path: `/api/v1`. All requests and responses are JSON except report downloads.
All endpoints except `POST /auth/signup`, `POST /auth/login`,
`POST /auth/refresh`, and `GET /health` require a bearer access token.

### 4.1 Conventions
- Resource names are plural and kebab-free; identifiers are UUIDs in the path.
- List responses are wrapped:
  ```json
  { "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 137 } }
  ```
- Single-resource responses are wrapped as `{ "data": { ... } }`.
- Pagination query parameters: `page` (default 1, min 1) and `pageSize` (default 20,
  max 100) (FR-X4).
- Sorting: `sort=entryDate&order=desc` (default for all entry lists);
  ties broken by `createdAt desc`.
- Date-range filters: `from` and `to`, both inclusive, `YYYY-MM-DD`.
- `ownerId` is a query parameter on entry lists, defaulting to the caller. Supplying
  another user's ID requires an authorised relationship (Section 5.3). It is never
  accepted in a request body (FR-X1, AC-11).
- Unknown body fields are stripped by the Zod schema rather than rejected.

### 4.2 Authentication

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Create a `RECRUIT` account; returns tokens and the user DTO |
| POST | `/auth/login` | Exchange credentials for tokens |
| POST | `/auth/refresh` | Rotate the refresh token, issue a new access token |
| POST | `/auth/logout` | Revoke the presented refresh token |
| GET | `/auth/me` | Current user DTO |

### 4.3 Users

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/users/me` | any | Own profile |
| PATCH | `/users/me` | any | Update `fullName`, `department`, `startDate` (FR-A6) |
| GET | `/users` | admin | List/search users: `q`, `role`, `department`, `isActive` |
| GET | `/users/:id` | admin, or manager of `:id`, or self | Single user |
| PATCH | `/users/:id` | admin | Update `role`, `managerId`, `isActive` (FR-U2 to FR-U6) |
| GET | `/users/me/direct-reports` | manager, admin | Reports with summary tiles (FR-D5) |

### 4.4 Entry resources

The four entry types share an identical shape; `{resource}` is one of `tasks`,
`issues`, `feedback`, `notes`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/{resource}` | List with filters and pagination |
| POST | `/{resource}` | Create for the caller |
| GET | `/{resource}/:id` | Read one |
| PATCH | `/{resource}/:id` | Partial update |
| DELETE | `/{resource}/:id` | Delete |

Resource-specific filters:

| Resource | Filters |
|----------|---------|
| `tasks` | `from`, `to`, `category`, `status`, `priority`, `ownerId` |
| `issues` | `from`, `to`, `severity`, `status`, `ownerId` |
| `feedback` | `from`, `to`, `type`, `ownerId` |
| `notes` | `from`, `to`, `tag` (repeatable), `ownerId` |

Repeatable enum filters accept comma-separated values, e.g. `status=OPEN,IN_PROGRESS`.

Example — create a task:

```http
POST /api/v1/tasks
Authorization: Bearer <access token>

{
  "entryDate": "2026-07-24",
  "title": "Complete VPN setup",
  "description": "Followed IT runbook, needed a token reset.",
  "category": "SETUP",
  "status": "DONE",
  "priority": "HIGH"
}
```

```http
201 Created
{
  "data": {
    "id": "8f1c...",
    "ownerId": "3ab9...",
    "entryDate": "2026-07-24",
    "title": "Complete VPN setup",
    "description": "Followed IT runbook, needed a token reset.",
    "category": "SETUP",
    "status": "DONE",
    "priority": "HIGH",
    "createdAt": "2026-07-24T09:12:44.101Z",
    "updatedAt": "2026-07-24T09:12:44.101Z"
  }
}
```

### 4.5 Dashboard

`GET /dashboard?ownerId=<uuid>` — defaults to the caller; another `ownerId` requires
an authorised relationship.

```json
{
  "data": {
    "counts": { "tasks": 10, "issues": 3, "feedback": 2, "notes": 5 },
    "taskProgress": {
      "byStatus": { "NOT_STARTED": 2, "IN_PROGRESS": 3, "BLOCKED": 1, "DONE": 4 },
      "completed": 4, "total": 10, "completionPercent": 40
    },
    "openIssues": {
      "total": 2,
      "bySeverity": { "LOW": 0, "MEDIUM": 1, "HIGH": 0, "CRITICAL": 1 }
    },
    "recentActivity": [
      { "kind": "TASK", "id": "8f1c...", "entryDate": "2026-07-24",
        "title": "Complete VPN setup", "createdAt": "2026-07-24T09:12:44.101Z" }
    ],
    "lastActivityDate": "2026-07-24"
  }
}
```

`GET /dashboard/admin` — admin only; organisation-wide counts plus user totals by role
and active state (FR-D7).

Aggregates are computed with SQL `GROUP BY` queries, not by loading rows into memory.
`recentActivity` is a `UNION ALL` across the four entry tables ordered by
`entryDate DESC, createdAt DESC` with `LIMIT 5` (FR-D4).

### 4.6 Reports

`POST /reports` — body:

```json
{
  "ownerId": "3ab9...",
  "from": "2026-07-01",
  "to": "2026-07-31",
  "sections": ["TASKS", "ISSUES", "FEEDBACK"],
  "format": "PDF"
}
```

- `sections` accepts any subset of `TASKS`, `ISSUES`, `FEEDBACK`, `NOTES`; the UI's
  "Combined" option sends all four (FR-R1).
- `format` is `PDF` or `CSV`.
- The response is a file stream with
  `Content-Disposition: attachment; filename="onboarding-diary_<slug>_<from>_<to>.<ext>"`
  and `Content-Type` `application/pdf` or `text/csv; charset=utf-8` (FR-R6).
- CSV: one block per requested section, each preceded by a `# SECTION: TASKS` marker
  line and a header row, then one row per entry, ordered by `entryDate`.
- PDF: cover block with recruit name, department, start date, date range, generation
  timestamp, and summary counts, followed by one table per section.
- An empty range still yields a valid file with a "No entries for this range" line
  (FR-R7).
- `from` after `to` yields 422; a range longer than 366 days yields 422.
- Reports are generated synchronously and streamed; nothing is persisted server-side.

### 4.7 Health

`GET /health` — liveness plus a database round-trip check; returns 200 or 503.

## 5. Authentication and Authorisation

### 5.1 Password handling
- Hashed with argon2id, memory cost 19 MiB, time cost 2, parallelism 1.
- Minimum length 10, maximum 128; the API compares against a small deny-list of the
  most common passwords (FR-A3).
- Login failures return an identical message and comparable timing for unknown emails
  and wrong passwords; a dummy hash verification runs when the email is unknown
  (AC-2).

### 5.2 Tokens
- **Access token**: JWT, HS256, 15-minute expiry, claims `sub`, `role`, `iat`, `exp`.
  Held in memory by the SPA (never `localStorage`) and sent as
  `Authorization: Bearer`.
- **Refresh token**: 32 bytes of CSPRNG output, 14-day expiry, delivered as an
  `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`. Only its
  SHA-256 hash is stored.
- Refresh rotates the token and revokes the previous one. Presenting an already-revoked
  token revokes the whole family for that user and returns 401 (replay defence).
- Logout revokes the presented refresh token (FR-A5).
- Role changes take effect on the next refresh, so access tokens stay short-lived.
- On 401 the SPA attempts a single silent refresh, then redirects to login preserving
  the intended route (FR-A8, UF-7).
- Deactivated users fail both login and refresh (FR-A7).

### 5.3 Authorisation model

Authorisation is decided by a single helper, `resolveEntryAccess(caller, ownerId)`,
used by every entry, dashboard, and report handler:

| Caller role | Target owner | Read | Write |
|-------------|--------------|------|-------|
| `RECRUIT` | self | yes | yes |
| `RECRUIT` | anyone else | 403 | 403 |
| `MANAGER` | self | yes | yes |
| `MANAGER` | direct report (`user.managerId == caller.id`) | yes | 403 (FR-X2) |
| `MANAGER` | any other user | 403 | 403 |
| `ADMIN` | anyone | yes | yes (FR-X3) |

- Ownership on create always comes from `req.user.id`; a body `ownerId` is stripped
  (FR-X1).
- Reads of a non-existent resource and reads of a resource the caller may not see both
  return 403 for entry IDs the caller does not own, so IDs are not enumerable.
- Admin self-protection: an admin cannot change their own `role` away from `ADMIN` or
  set their own `isActive` to false (FR-U5).
- Manager assignment walks the manager chain and rejects self-assignment and cycles
  (FR-U6).

### 5.4 Other controls
- `helmet` for security headers; CORS restricted to the configured web origin with
  credentials enabled.
- Rate limits: 10 requests per 15 minutes per IP on `/auth/login` and `/auth/signup`;
  5 report generations per minute per user; 300 requests per minute per user overall.
- Request body limit 256 KB.
- Secrets (`JWT_SECRET`, `DATABASE_URL`) come from the environment; the API refuses to
  start if a required variable is missing or if `JWT_SECRET` is shorter than 32 chars.
- No password, token, or hash value is ever logged.

## 6. Error Handling

### 6.1 Error envelope

Every non-2xx JSON response uses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "title", "message": "Title is required" },
      { "field": "entryDate", "message": "Date cannot be in the future" }
    ],
    "requestId": "b3f0a2d4-..."
  }
}
```

`details` is present only for validation errors. `requestId` matches the server log
entry and is surfaced in the UI's generic error state for support purposes.

### 6.2 Status codes and error codes

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Malformed JSON or unparsable query string |
| 401 | `UNAUTHENTICATED` | Missing, malformed, or expired access token |
| 401 | `INVALID_CREDENTIALS` | Login failure (uniform message) |
| 403 | `FORBIDDEN` | Role or relationship does not permit the operation |
| 404 | `NOT_FOUND` | Unknown route, or a resource the caller may otherwise access |
| 409 | `EMAIL_ALREADY_EXISTS` | Signup with an existing email (AC-1) |
| 409 | `CONFLICT` | Other uniqueness or state conflicts, e.g. manager cycle |
| 413 | `PAYLOAD_TOO_LARGE` | Body over the size limit |
| 422 | `VALIDATION_ERROR` | Schema, enum, or business-rule validation failure |
| 429 | `RATE_LIMITED` | Rate limit exceeded; includes `Retry-After` |
| 500 | `INTERNAL_ERROR` | Unhandled exception; message is always generic |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable (health check and startup) |

### 6.3 Server-side conventions
- Services throw typed errors (`ValidationError`, `NotFoundError`, `ForbiddenError`,
  `ConflictError`), each carrying a status and code; a single `errorHandler`
  middleware performs the mapping. Handlers never construct error responses directly.
- Prisma errors are translated at the service boundary (`P2002` → `CONFLICT`,
  `P2025` → `NOT_FOUND`); raw Prisma errors never reach the client.
- Unexpected errors are logged at `error` with the stack, `requestId`, route, and user
  ID, and returned as a generic 500 with no internal detail.
- Multi-step writes (for example creating a note with tags) run inside a Prisma
  transaction.
- Streaming report failures that occur after headers are sent abort the response and
  are logged; the client shows a download-failed message.

### 6.4 Client-side conventions
- A single API client attaches the access token, performs the one-shot refresh on 401,
  and normalises the error envelope into a typed `ApiError`.
- 422 `details` are mapped onto form fields by name and rendered inline (FR-X6).
- 403 renders a "You do not have access to this" screen rather than a redirect loop.
- Network and 5xx errors render a retryable error state showing the `requestId`.
- Mutations optimistically update nothing; they invalidate the relevant query keys and
  refetch, so dashboard counts stay consistent (AC-3, AC-5).

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | p95 under 300 ms for list and dashboard endpoints with 10k entries per user; report generation under 5 s for a 12-month range |
| Scale target | 500 users, 200k total entries |
| Availability | Single instance is acceptable for v1; the API is stateless apart from the database, so it can scale horizontally |
| Accessibility | Keyboard-navigable forms, visible focus styles, labelled inputs, colour contrast at WCAG AA (AC-12) |
| Browser support | Latest two versions of Chrome, Firefox, Edge, Safari |
| Responsiveness | Usable from 360 px width (FR-X5) |
| Observability | Structured JSON logs with `requestId`, method, path, status, duration; `/health` for liveness |
| Backups | Daily managed PostgreSQL snapshot with 7-day retention (deployment concern) |

## 8. Testing Strategy

- **Unit (Vitest)** — services and pure helpers: authorisation resolution, manager-cycle
  detection, tag normalisation, date validation, pagination clamping, dashboard
  aggregation shaping, CSV row mapping.
- **API integration (Supertest + a real PostgreSQL instance)** — one suite per module,
  covering the happy path, validation failures, and the 401/403 matrix from
  Section 5.3. Each test runs in a transaction that is rolled back, or against a
  per-suite truncated schema.
- **Report tests** — assert CSV content exactly; assert PDFs are non-empty, have a
  `%PDF` magic header, and contain expected text via a text extractor.
- **Frontend unit tests** — form validation, filter state, and the API client's refresh
  behaviour, with the network layer mocked.
- **Coverage gate** — 80% lines on `apps/api/src/modules` and `packages/shared`.
- **Local verification** — `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build` at the root cover every workspace; integration tests run against the
  Docker Compose `postgres:16` service. No hosted CI pipeline in v1.
- End-to-end browser tests are out of scope for v1 (BRD D9).

## 9. Environments and Configuration

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NODE_ENV` | api | `development`, `test`, or `production` |
| `DATABASE_URL` | api | PostgreSQL connection string |
| `TEST_DATABASE_URL` | api | Connection string for the integration-test database |
| `JWT_SECRET` | api | Access-token signing key, ≥ 32 chars |
| `ACCESS_TOKEN_TTL` | api | Default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | api | Default `14` |
| `WEB_ORIGIN` | api | Allowed CORS origin |
| `PORT` | api | Default `4000` |
| `LOG_LEVEL` | api | Default `info` |
| `VITE_API_BASE_URL` | web | API base URL, e.g. `http://localhost:4000/api/v1` |

- Configuration is validated at startup with a Zod schema; missing or invalid values
  abort the process with a clear message.
- `docker compose up` starts PostgreSQL, the API with migrations applied, and the web
  dev server.
- A seed script creates one admin, two managers, and six recruits with sample entries
  for local development and demos.
