# Onboarding Diary - System Architecture Document

> **Version:** 1.0.0
> **Last Updated:** 2026-05-24
> **Status:** Draft
> **Author:** Devin (Senior Product Architect)
> **Companion:** [REQUIREMENTS.md](./REQUIREMENTS.md)

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [API Layer Structure](#4-api-layer-structure)
5. [Authentication Flow](#5-authentication-flow)
6. [Authorization Model](#6-authorization-model)
7. [Database Architecture](#7-database-architecture)
8. [Shared Types Strategy](#8-shared-types-strategy)
9. [Error Handling Architecture](#9-error-handling-architecture)
10. [Logging Strategy](#10-logging-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Strategy](#12-deployment-strategy)
13. [Environment Variables](#13-environment-variables)

---

## 1. Monorepo Structure

### 1.1 Workspace Layout

The project uses an **npm workspaces** monorepo. All packages live under the root and share a single lockfile. There is no build orchestrator (Turborepo, Nx) in v1 — npm workspace scripts are sufficient for the initial scope.

```
onboarding-diary/
│
├── package.json              # Root: workspace config, shared scripts, devDependencies
├── tsconfig.base.json        # Base TS config extended by all packages
├── .gitignore
├── .env.example              # Documented env vars (no secrets)
├── .prettierrc               # Shared Prettier config
├── .eslintrc.cjs             # Shared ESLint config (root)
├── docker-compose.yml        # Local dev: PostgreSQL, optional pgAdmin
├── Dockerfile                # Multi-stage production image
├── README.md
│
├── docs/
│   ├── REQUIREMENTS.md       # Functional & non-functional requirements
│   └── ARCHITECTURE.md       # This document
│
├── packages/
│   └── shared/               # @onboarding-diary/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts      # Barrel export
│           ├── enums.ts
│           ├── constants.ts
│           ├── types/        # Shared DTOs / interfaces
│           │   ├── auth.types.ts
│           │   ├── user.types.ts
│           │   ├── diary.types.ts
│           │   ├── program.types.ts
│           │   ├── milestone.types.ts
│           │   ├── comment.types.ts
│           │   ├── notification.types.ts
│           │   ├── report.types.ts
│           │   └── api.types.ts
│           └── validation/   # Shared Zod schemas
│               ├── auth.schema.ts
│               ├── user.schema.ts
│               ├── diary.schema.ts
│               ├── program.schema.ts
│               ├── milestone.schema.ts
│               └── comment.schema.ts
│
├── server/                   # @onboarding-diary/server
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       └── ...               # (see §3 Backend Architecture)
│
└── client/                   # @onboarding-diary/client
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── index.html
    └── src/
        └── ...               # (see §2 Frontend Architecture)
```

### 1.2 Workspace Configuration

**Root `package.json`:**
```jsonc
{
  "name": "onboarding-diary",
  "private": true,
  "workspaces": [
    "packages/*",
    "server",
    "client"
  ],
  "scripts": {
    "dev":          "npm run dev --workspaces --if-present",
    "build":        "npm run build --workspaces --if-present",
    "lint":         "npm run lint --workspaces --if-present",
    "test":         "npm run test --workspaces --if-present",
    "db:migrate":   "npm run db:migrate -w server",
    "db:seed":      "npm run db:seed -w server",
    "db:studio":    "npm run db:studio -w server",
    "format":       "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 1.3 TypeScript Configuration

**`tsconfig.base.json` (root):**
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Each workspace extends this base and overrides as needed (e.g., `server/tsconfig.json` sets `"module": "CommonJS"` if using ts-node, or stays ESNext with a bundler).

### 1.4 Package Dependency Graph

```
@onboarding-diary/shared   ← no internal deps (leaf)
        ▲          ▲
        │          │
@onboarding-diary/server   @onboarding-diary/client
        │                          │
        └── prisma, express        └── react, vite, tailwind
```

Both `server` and `client` depend on `shared`. They never depend on each other.

---

## 2. Frontend Architecture

### 2.1 Folder Structure

```
client/src/
├── main.tsx                  # ReactDOM.createRoot, mount <App />
├── App.tsx                   # <BrowserRouter>, top-level providers, route definitions
├── vite-env.d.ts
│
├── api/                      # HTTP client layer
│   ├── client.ts             # Axios instance, interceptors (auth, error, refresh)
│   ├── auth.api.ts           # login, register, refresh, logout, forgotPassword, resetPassword
│   ├── diary.api.ts          # CRUD diary entries, search
│   ├── program.api.ts        # CRUD programs, clone, enroll
│   ├── milestone.api.ts      # complete, verify, reject, list
│   ├── comment.api.ts        # CRUD comments
│   ├── user.api.ts           # profile, list users, role/status changes
│   ├── notification.api.ts   # list, markRead, markAllRead, unreadCount
│   ├── report.api.ts         # dashboard, programReport, moodTrends, exportCsv
│   └── attachment.api.ts     # upload, delete
│
├── components/               # Reusable UI building blocks
│   ├── ui/                   # Primitives (Button, Input, Select, Modal, Toast, Badge, Avatar, ...)
│   ├── layout/               # Navbar, Sidebar, PageLayout, Breadcrumbs, Footer
│   ├── diary/                # DiaryCard, DiaryForm, MoodSelector, TagInput, VisibilitySelect
│   ├── milestone/            # MilestoneCard, ProgressBar, MilestoneTimeline
│   ├── comment/              # CommentList, CommentForm
│   ├── charts/               # MoodTrendChart, CompletionChart (Recharts wrappers)
│   └── common/               # Pagination, SearchBar, LoadingSkeleton, EmptyState, ErrorFallback
│
├── pages/                    # One file per route; data-fetching at this level
│   ├── auth/                 # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│   ├── recruit/              # DashboardPage, DiaryFeedPage, NewEntryPage, EditEntryPage, EntryDetailPage, MilestonesPage
│   ├── mentor/               # MentorDashboardPage, MenteeDetailPage
│   ├── manager/              # TeamDashboardPage, TeamMemberDetailPage
│   ├── admin/                # AdminDashboardPage, ProgramsListPage, ProgramDetailPage, CreateProgramPage,
│   │                         # EditProgramPage, UserManagementPage, UserDetailPage, InviteUserPage, ReportsPage
│   ├── system/               # SettingsPage, AuditLogsPage
│   └── shared/               # ProfilePage, NotificationsPage, NotFoundPage
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts            # Access AuthContext (user, login, logout, isAuthenticated)
│   ├── useDiaryEntries.ts    # React Query wrapper for diary CRUD
│   ├── useMilestones.ts      # React Query wrapper for milestones
│   ├── usePrograms.ts        # React Query wrapper for programs
│   ├── useNotifications.ts   # React Query + polling for notifications
│   ├── usePagination.ts      # Sync page/limit with URL search params
│   └── useDebounce.ts        # Debounce input for search
│
├── context/                  # React Context providers
│   ├── AuthContext.tsx        # AuthProvider, useAuthContext
│   └── ThemeContext.tsx       # (future) dark mode toggle
│
├── guards/                   # Route-level access control
│   ├── AuthGuard.tsx          # Redirect to /login if unauthenticated
│   └── RoleGuard.tsx          # Redirect to /403 if role is insufficient
│
├── router/                   # Centralized route definitions
│   └── routes.tsx             # createBrowserRouter config with lazy imports
│
├── types/                    # Frontend-only types (component props, UI state)
│   └── index.ts
│
├── utils/                    # Pure helper functions
│   ├── date.ts               # formatDate, timeAgo, isToday
│   ├── format.ts             # truncate, capitalize, pluralize
│   └── cn.ts                 # Tailwind classname merge utility (clsx + twMerge)
│
├── constants/
│   └── index.ts              # Route paths, query keys, default pagination, etc.
│
└── styles/
    └── globals.css            # @tailwind directives, CSS custom properties
```

### 2.2 Component Design Principles

| Principle | Guideline |
|-----------|-----------|
| **Composition over inheritance** | Build complex UIs by composing small components; avoid deep component trees |
| **Container / Presentational split** | Pages (containers) own data fetching; components (presentational) receive data via props |
| **Co-location** | Component-specific types and helpers live next to the component, not in a global `types/` |
| **Barrel exports** | Each folder exports via `index.ts` for clean imports |
| **Lazy loading** | All page-level components are loaded via `React.lazy` + `Suspense` for code splitting |
| **Accessible defaults** | All interactive components include ARIA attributes; forms use `<label>` associations |

### 2.3 Routing Architecture

```
<BrowserRouter>
  <Routes>
    ── Public ────────────────────────────────────
    /login                → LoginPage
    /register             → RegisterPage
    /forgot-password      → ForgotPasswordPage
    /reset-password/:token→ ResetPasswordPage

    ── Protected (AuthGuard) ─────────────────────
    /dashboard            → DashboardPage         [RECRUIT]
    /diary                → DiaryFeedPage          [RECRUIT]
    /diary/new            → NewEntryPage           [RECRUIT]
    /diary/:id            → EntryDetailPage        [RECRUIT + visibility check]
    /diary/:id/edit       → EditEntryPage          [RECRUIT, owner only]
    /milestones           → MilestonesPage         [RECRUIT]
    /profile              → ProfilePage            [ALL]
    /notifications        → NotificationsPage      [ALL]

    /mentor/dashboard     → MentorDashboardPage    [MENTOR]
    /mentor/mentees/:id   → MenteeDetailPage       [MENTOR]

    /manager/dashboard    → TeamDashboardPage      [MANAGER]
    /manager/team/:id     → TeamMemberDetailPage   [MANAGER]

    /admin/dashboard      → AdminDashboardPage     [HR_ADMIN]
    /admin/programs       → ProgramsListPage       [HR_ADMIN]
    /admin/programs/new   → CreateProgramPage      [HR_ADMIN]
    /admin/programs/:id   → ProgramDetailPage      [HR_ADMIN]
    /admin/programs/:id/edit → EditProgramPage      [HR_ADMIN]
    /admin/users          → UserManagementPage     [HR_ADMIN]
    /admin/users/invite   → InviteUserPage         [HR_ADMIN]
    /admin/users/:id      → UserDetailPage         [HR_ADMIN]
    /admin/reports        → ReportsPage            [HR_ADMIN]

    /system/settings      → SettingsPage           [SYS_ADMIN]
    /system/audit-logs    → AuditLogsPage          [SYS_ADMIN]

    *                     → NotFoundPage
  </Routes>
</BrowserRouter>
```

Role-based redirection after login:
- `RECRUIT` → `/dashboard`
- `MENTOR` → `/mentor/dashboard`
- `MANAGER` → `/manager/dashboard`
- `HR_ADMIN` → `/admin/dashboard`
- `SYS_ADMIN` → `/admin/dashboard`

### 2.4 Data Fetching Architecture

All server-state is managed via **TanStack Query (React Query)**. The API layer (`api/*.ts`) returns typed promises; hooks (`hooks/*.ts`) wrap them in `useQuery` / `useMutation`.

```
Page Component
  └─ calls custom hook (e.g., useDiaryEntries)
       └─ calls useQuery / useMutation
            └─ calls api function (e.g., diaryApi.list)
                 └─ calls axios instance (api/client.ts)
                      └─ HTTP request to backend
```

**Query Key Convention:**

```typescript
// Pattern: [resource, scope, filters]
['diary-entries', 'list', { page, limit, tag, mood }]
['diary-entries', 'detail', entryId]
['milestones', 'user', userId]
['notifications', 'unread-count']
['programs', 'list']
['reports', 'dashboard']
```

**React Query Defaults:**

| Setting | Value | Rationale |
|---------|-------|-----------|
| `staleTime` | 5 min | Diary data changes infrequently |
| `gcTime` (cacheTime) | 30 min | Keep cached data for back-navigation |
| `refetchOnWindowFocus` | true | Catch updates when user returns |
| `retry` | 3 | Resilience against transient failures |
| `refetchInterval` | 60s (notifications only) | Near-real-time notification count |

**Mutation Invalidation Map:**

| Mutation | Invalidates |
|----------|-------------|
| Create diary entry | `['diary-entries', 'list']` |
| Update diary entry | `['diary-entries', 'list']`, `['diary-entries', 'detail', id]` |
| Delete diary entry | `['diary-entries', 'list']` |
| Add comment | `['comments', entryId]`, `['diary-entries', 'detail', entryId]` |
| Complete milestone | `['milestones', 'user', userId]`, `['reports', 'dashboard']` |
| Verify/reject milestone | `['milestones', 'user', userId]` |

### 2.5 State Management Summary

| State Category | Tool | Scope | Persistence |
|----------------|------|-------|-------------|
| Server state | TanStack Query | Global cache | In-memory (cache) |
| Auth state | React Context + `useReducer` | Global | `localStorage` (refresh token only) |
| Form state | React Hook Form + Zod resolver | Local (per form) | None |
| UI state | `useState` / `useReducer` | Local (per component) | None |
| URL state | React Router `useSearchParams` | URL | URL (bookmarkable) |
| Theme | React Context | Global | `localStorage` |

---

## 3. Backend Architecture

### 3.1 Folder Structure

```
server/src/
├── index.ts                     # Entry point: create app, start listening
├── app.ts                       # Express app factory: middleware pipeline, route mounting
│
├── config/
│   ├── index.ts                 # Load & validate env vars (using Zod), export typed config object
│   ├── database.ts              # Prisma client singleton (with soft-delete middleware)
│   └── cors.ts                  # CORS origin whitelist
│
├── middleware/
│   ├── auth.middleware.ts       # Verify JWT, attach user to req.user
│   ├── rbac.middleware.ts       # Check req.user.role against allowed roles
│   ├── validate.middleware.ts   # Generic Zod validation (body, query, params)
│   ├── error.middleware.ts      # Global error handler (catches AppError subclasses)
│   ├── rateLimiter.middleware.ts# express-rate-limit config
│   ├── logger.middleware.ts     # Request/response structured logging
│   └── notFound.middleware.ts   # 404 catch-all
│
├── modules/                     # Feature modules (vertical slices)
│   ├── auth/
│   │   ├── auth.routes.ts       # Router: POST /register, /login, /refresh, /logout, ...
│   │   ├── auth.controller.ts   # Parse req → call service → send res
│   │   ├── auth.service.ts      # Business logic: hash, compare, issue tokens, revoke
│   │   └── auth.types.ts        # Module-specific types (internal, not shared)
│   │
│   ├── user/
│   │   ├── user.routes.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.types.ts
│   │
│   ├── diary/
│   │   ├── diary.routes.ts
│   │   ├── diary.controller.ts
│   │   ├── diary.service.ts
│   │   └── diary.types.ts
│   │
│   ├── comment/
│   │   ├── comment.routes.ts
│   │   ├── comment.controller.ts
│   │   ├── comment.service.ts
│   │   └── comment.types.ts
│   │
│   ├── program/
│   │   ├── program.routes.ts
│   │   ├── program.controller.ts
│   │   ├── program.service.ts
│   │   └── program.types.ts
│   │
│   ├── milestone/
│   │   ├── milestone.routes.ts
│   │   ├── milestone.controller.ts
│   │   ├── milestone.service.ts
│   │   └── milestone.types.ts
│   │
│   ├── notification/
│   │   ├── notification.routes.ts
│   │   ├── notification.controller.ts
│   │   ├── notification.service.ts
│   │   └── notification.types.ts
│   │
│   ├── mentor/
│   │   ├── mentor.routes.ts
│   │   ├── mentor.controller.ts
│   │   ├── mentor.service.ts
│   │   └── mentor.types.ts
│   │
│   ├── attachment/
│   │   ├── attachment.routes.ts
│   │   ├── attachment.controller.ts
│   │   ├── attachment.service.ts
│   │   └── attachment.types.ts
│   │
│   └── report/
│       ├── report.routes.ts
│       ├── report.controller.ts
│       ├── report.service.ts
│       └── report.types.ts
│
├── errors/                      # Custom error class hierarchy
│   ├── AppError.ts              # Base class (statusCode, code, isOperational)
│   ├── BadRequestError.ts       # 400
│   ├── UnauthorizedError.ts     # 401
│   ├── ForbiddenError.ts        # 403
│   ├── NotFoundError.ts         # 404
│   ├── ConflictError.ts         # 409
│   └── ValidationError.ts       # 400 with field-level details
│
├── utils/
│   ├── jwt.ts                   # signAccessToken, signRefreshToken, verifyToken
│   ├── hash.ts                  # hashPassword, comparePassword (bcrypt)
│   ├── pagination.ts            # parsePaginationParams, buildPaginationMeta
│   ├── csv.ts                   # generateCsvStream (Transform stream)
│   ├── sanitize.ts              # sanitizeHtml (DOMPurify / sanitize-html wrapper)
│   └── logger.ts                # Pino / Winston logger instance
│
└── types/
    ├── express.d.ts             # Augment Express.Request with `user` property
    └── index.ts                 # Module-internal shared types
```

### 3.2 Middleware Pipeline

Requests pass through middleware in this exact order:

```
Incoming Request
  │
  ├─ 1. logger.middleware          (log method, path, start timer)
  ├─ 2. helmet                     (security headers)
  ├─ 3. cors                       (origin whitelist)
  ├─ 4. express.json({ limit })    (parse JSON body, enforce size limit)
  ├─ 5. rateLimiter.middleware     (global rate limit: 100 req/min)
  │
  ├─ 6. Route Matching             (/api/v1/...)
  │     │
  │     ├─ [Public routes: /auth/login, /auth/register, ...]
  │     │     └─ validate.middleware → controller
  │     │
  │     └─ [Protected routes]
  │           ├─ auth.middleware        (verify JWT, attach req.user)
  │           ├─ rbac.middleware(roles) (check role allowlist)
  │           ├─ validate.middleware    (validate body/query/params with Zod)
  │           └─ controller            (handle request)
  │
  ├─ 7. notFound.middleware        (catch unmatched routes → 404)
  └─ 8. error.middleware           (catch all errors → formatted JSON response)
```

### 3.3 Module Internal Architecture

Each module follows the same three-layer pattern:

```
┌──────────────────────────────────────────────────┐
│                    Routes                         │
│  Define HTTP endpoints                           │
│  Apply middleware: auth → rbac → validate         │
│  Delegate to controller                           │
└──────────────────────┬───────────────────────────┘
                       │ calls
                       ▼
┌──────────────────────────────────────────────────┐
│                  Controller                       │
│  Extract data from req (body, params, query)      │
│  Call service method(s)                           │
│  Format and send HTTP response                    │
│  NO business logic here                           │
└──────────────────────┬───────────────────────────┘
                       │ calls
                       ▼
┌──────────────────────────────────────────────────┐
│                   Service                         │
│  All business logic lives here                   │
│  Interacts with Prisma client                    │
│  Throws custom AppError subclasses               │
│  NO access to req/res objects                    │
│  Returns plain data objects                       │
└──────────────────────────────────────────────────┘
```

**Rules:**
- Controllers NEVER import Prisma directly
- Services NEVER import `express` types
- Routes are the ONLY place middleware is applied
- Cross-module calls go service → service (e.g., `diary.service` calls `notification.service.create()` after a comment is added)

### 3.4 Request Lifecycle (Example: Create Diary Entry)

```
POST /api/v1/diary-entries
  │
  ├─ logger.middleware         → logs: POST /api/v1/diary-entries
  ├─ helmet                    → adds security headers
  ├─ cors                      → checks origin
  ├─ express.json              → parses body
  ├─ rateLimiter               → checks rate
  │
  ├─ diary.routes.ts           → matches POST /
  │   ├─ auth.middleware       → verifies JWT, sets req.user = { id, role, ... }
  │   ├─ rbac(['RECRUIT'])     → checks req.user.role === 'RECRUIT'
  │   ├─ validate(createDiaryEntrySchema)  → validates body with Zod
  │   └─ diary.controller.create
  │       │
  │       ├─ extracts { title, body, mood_rating, ... } from req.body
  │       ├─ calls diaryService.create(req.user.id, data)
  │       │   │
  │       │   ├─ sanitizes HTML body
  │       │   ├─ resolves/creates tags
  │       │   ├─ prisma.diaryEntry.create(...)
  │       │   └─ returns created entry
  │       │
  │       └─ res.status(201).json({ data: entry })
  │
  ├─ (if error thrown in service)
  │   └─ error.middleware      → catches error, maps to HTTP response
  │
  └─ logger.middleware         → logs: 201, 45ms
```

---

## 4. API Layer Structure

### 4.1 Versioning Strategy

**Approach:** URI-based versioning with the prefix `/api/v1/`.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Style** | URI prefix (`/api/v1/`) | Simple, explicit, easy to route and document |
| **Granularity** | Whole-API versioning | Avoids per-endpoint version confusion |
| **Breaking change policy** | Bump major version (`v2`) only for breaking changes | Additive changes (new fields, new endpoints) are non-breaking |
| **Deprecation** | Announce 6 months before removal; add `Sunset` header | Clients have migration time |
| **Concurrent versions** | Max 2 active versions at a time | Limits maintenance burden |

**Route Mounting:**

```
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/users',         userRoutes);
app.use('/api/v1/diary-entries',  diaryRoutes);
app.use('/api/v1/comments',      commentRoutes);
app.use('/api/v1/programs',      programRoutes);
app.use('/api/v1/milestones',    milestoneRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/mentor-assignments', mentorRoutes);
app.use('/api/v1/reports',       reportRoutes);
app.use('/api/v1/attachments',   attachmentRoutes);
```

### 4.2 REST Conventions

| Convention | Standard |
|------------|----------|
| Resource naming | Plural nouns, kebab-case (`/diary-entries`, `/mentor-assignments`) |
| HTTP methods | `GET` (read), `POST` (create), `PATCH` (partial update), `DELETE` (soft-delete) |
| Status codes | `200` OK, `201` Created, `204` No Content, `400`/`401`/`403`/`404`/`409`/`429`/`500` |
| Response envelope | `{ "data": ... }` for success; `{ "error": { "code", "message", "details" } }` for errors |
| Pagination | `{ "data": [...], "meta": { page, limit, total_count, total_pages, has_next, has_prev } }` |
| Sorting | `?sort_by=created_at&sort_order=desc` |
| Filtering | Resource-specific query params (`?mood_min=3&tag=development&from_date=2026-01-01`) |
| Search | `?q=keyword` for full-text search endpoints |
| Nested resources | Use nesting for strong ownership: `POST /diary-entries/:entryId/comments` |
| Cross-resource refs | Use flat endpoints for weak references: `GET /users/:id/diary-entries` |

### 4.3 Request/Response Headers

**Request Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes (protected) | `Bearer <access_token>` |
| `Content-Type` | Yes (POST/PATCH) | `application/json` |
| `X-Request-ID` | No | Client-generated request ID for tracing; server generates one if absent |

**Response Headers:**

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Echo or server-generated request trace ID |
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Window reset timestamp (Unix epoch) |
| `Content-Type` | `application/json` (or `text/csv` for exports) |

### 4.4 API Documentation Plan

**Strategy:** OpenAPI 3.0 specification generated from Zod schemas using `zod-to-openapi` or `@asteasolutions/zod-to-openapi`. Served via Swagger UI at `/api/docs` in development.

This avoids maintaining a separate spec file — the validation schemas ARE the spec.

---

## 5. Authentication Flow

### 5.1 Token Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Access Token                       │
│  Type: JWT (signed with HS256 or RS256)              │
│  Lifetime: 15 minutes                                │
│  Storage: In-memory only (React state / AuthContext)  │
│  Payload: { sub: userId, role, iat, exp }            │
│  Transport: Authorization: Bearer <token>            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Refresh Token                       │
│  Type: Opaque random string (64 bytes, base64url)    │
│  Lifetime: 7 days                                    │
│  Storage: httpOnly cookie (preferred) OR localStorage │
│  Database: SHA-256 hash stored in RefreshToken table  │
│  Transport: Cookie or POST body to /auth/refresh     │
└─────────────────────────────────────────────────────┘
```

### 5.2 Authentication Flows

#### 5.2.1 Registration

```
Client                          Server                         Database
  │                               │                               │
  ├── POST /auth/register ───────>│                               │
  │   { email, password,          │                               │
  │     first_name, last_name }   │                               │
  │                               ├── validate input (Zod) ──────>│
  │                               ├── check email uniqueness ────>│
  │                               ├── hash password (bcrypt 12) ─>│
  │                               ├── create User ───────────────>│
  │                               ├── sign access token            │
  │                               ├── generate refresh token       │
  │                               ├── hash & store refresh token ─>│
  │                               │                               │
  │<── 201 { data: user,          │                               │
  │         tokens: { access,     │                               │
  │                   refresh } } │                               │
```

#### 5.2.2 Login

```
Client                          Server                         Database
  │                               │                               │
  ├── POST /auth/login ──────────>│                               │
  │   { email, password }         │                               │
  │                               ├── find user by email ────────>│
  │                               ├── compare password (bcrypt)    │
  │                               ├── check user status = ACTIVE   │
  │                               ├── sign access token            │
  │                               ├── generate refresh token       │
  │                               ├── hash & store refresh token ─>│
  │                               ├── update last_login_at ──────>│
  │                               │                               │
  │<── 200 { data: user,          │                               │
  │         tokens: { access,     │                               │
  │                   refresh } } │                               │
```

#### 5.2.3 Token Refresh (Silent Refresh)

```
Client                          Server                         Database
  │                               │                               │
  ├── POST /auth/refresh ────────>│                               │
  │   { refresh_token }           │                               │
  │                               ├── hash incoming token          │
  │                               ├── find by token_hash ────────>│
  │                               ├── check not revoked            │
  │                               ├── check not expired            │
  │                               ├── revoke old token ──────────>│  (rotation)
  │                               ├── sign new access token        │
  │                               ├── generate new refresh token   │
  │                               ├── hash & store new token ────>│
  │                               │                               │
  │<── 200 { tokens: { access,    │                               │
  │                    refresh } } │                               │
```

#### 5.2.4 Logout

```
Client                          Server                         Database
  │                               │                               │
  ├── POST /auth/logout ─────────>│                               │
  │   Authorization: Bearer ...   │                               │
  │   { refresh_token }           │                               │
  │                               ├── verify access token          │
  │                               ├── hash refresh token           │
  │                               ├── revoke (set revoked_at) ───>│
  │                               │                               │
  │<── 204 No Content             │                               │
  │                               │                               │
  ├── Clear AuthContext            │                               │
  ├── Clear localStorage           │                               │
  ├── Redirect to /login           │                               │
```

### 5.3 Frontend Token Lifecycle

```
App Boot
  │
  ├─ Check for refresh token in localStorage/cookie
  │   ├─ NOT FOUND → redirect to /login
  │   └─ FOUND → call POST /auth/refresh
  │       ├─ SUCCESS → store access token in memory, set user in AuthContext
  │       └─ FAILURE → clear storage, redirect to /login
  │
  ├─ Axios request interceptor:
  │   └─ Attach Authorization: Bearer <accessToken> to every request
  │
  └─ Axios response interceptor:
      └─ On 401 with code TOKEN_EXPIRED:
          ├─ Queue the failed request
          ├─ Call POST /auth/refresh
          │   ├─ SUCCESS → retry queued requests with new token
          │   └─ FAILURE → logout, redirect to /login
          └─ Prevent multiple concurrent refresh calls (mutex/flag)
```

### 5.4 Security Measures

| Measure | Implementation |
|---------|---------------|
| Refresh token rotation | New refresh token on every refresh; old one revoked |
| Refresh token reuse detection | If a revoked token is used, revoke ALL tokens for that user (potential theft) |
| Access token in memory only | Never stored in localStorage (XSS mitigation) |
| Brute force on login | Rate limit: 5 attempts per 15 min per IP (sliding window) |
| Password reset tokens | Cryptographically random, 1-hour expiry, single-use, stored hashed |

---

## 6. Authorization Model

### 6.1 RBAC Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Authorization Layers                       │
│                                                              │
│  Layer 1: Route-Level RBAC (rbac.middleware)                 │
│  ─────────────────────────────────────────                   │
│  Checks: Does the user's role appear in the route's          │
│          allowed roles list?                                  │
│  Example: rbac(['HR_ADMIN', 'SYS_ADMIN'])                    │
│  Result: 403 Forbidden if role not in list                   │
│                                                              │
│  Layer 2: Resource-Level Authorization (service layer)       │
│  ─────────────────────────────────────────                   │
│  Checks: Does the user own this resource?                    │
│          Is the user the mentor/manager of the resource       │
│          owner? Does the resource visibility allow access?    │
│  Example: Only entry owner can edit; mentor can view          │
│           MENTOR_ONLY entries of their mentee                 │
│  Result: 403 Forbidden or 404 Not Found                      │
│                                                              │
│  Layer 3: Field-Level Filtering (service layer)              │
│  ─────────────────────────────────────────                   │
│  Checks: Should certain fields be hidden based on role?      │
│  Example: password_hash never returned; email hidden from     │
│           non-admin users viewing other profiles              │
│  Result: Filtered response object                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 RBAC Middleware Design

```typescript
// Middleware signature
rbac(allowedRoles: Role[]): RequestHandler

// Usage in routes
router.post('/', auth, rbac([Role.RECRUIT]), validate(schema), controller.create);
router.get('/', auth, rbac([Role.HR_ADMIN, Role.SYS_ADMIN]), controller.list);
```

The middleware reads `req.user.role` (set by `auth.middleware`) and checks against the allowlist. If the role is not allowed, it throws a `ForbiddenError`.

### 6.3 Diary Entry Visibility Enforcement

Visibility is enforced at the **query level** in the service layer, not just at the response level. This ensures no data leaks even through count queries.

```
When a user requests diary entries for another user:

1. Determine the relationship between requester and entry author:
   - Is requester the author?           → all entries
   - Is requester the author's mentor?  → entries with visibility IN (MENTOR_ONLY, TEAM, PUBLIC)
   - Is requester the author's manager? → entries with visibility IN (TEAM, PUBLIC)
   - Is requester HR_ADMIN?             → entries with visibility IN (TEAM, PUBLIC)
   - Is requester SYS_ADMIN?            → all entries
   - Otherwise?                         → entries with visibility = PUBLIC only

2. Build Prisma WHERE clause accordingly
3. Apply to all queries: list, detail, search, count
```

### 6.4 Permission Resolution Flow

```
Incoming Request
  │
  ├─ auth.middleware: Extract user from JWT
  │   └─ req.user = { id, role, email }
  │
  ├─ rbac.middleware: Check route-level role
  │   └─ req.user.role ∈ allowedRoles? → proceed / 403
  │
  └─ service layer: Check resource-level access
      │
      ├─ Ownership check:
      │   └─ resource.user_id === req.user.id? → full access
      │
      ├─ Relationship check (for diary/milestone viewing):
      │   ├─ query MentorAssignment table
      │   │   └─ is active mentor of resource owner? → scoped access
      │   ├─ query User table
      │   │   └─ is manager (same department)? → scoped access
      │   └─ is HR_ADMIN/SYS_ADMIN? → admin access
      │
      └─ Visibility check (for diary entries):
          └─ apply visibility WHERE clause
```

---

## 7. Database Architecture

### 7.1 Prisma Schema Planning

The Prisma schema maps directly to the entity design in [REQUIREMENTS.md §7](./REQUIREMENTS.md#7-database-entity-design). Below is the schema organization and key design decisions.

#### 7.1.1 Schema Organization

The schema is defined in a single `schema.prisma` file. Prisma does not natively support multi-file schemas in stable releases, so we use comments to delineate sections:

```prisma
// ============================================================
// Generator & Datasource
// ============================================================

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]   // PostgreSQL full-text search
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// Enums
// ============================================================

enum Role { ... }
enum UserStatus { ... }
enum Visibility { ... }
enum MilestoneCategory { ... }
enum EnrollmentStatus { ... }
enum CompletionStatus { ... }
enum NotificationType { ... }

// ============================================================
// Models
// ============================================================

model User { ... }
model DiaryEntry { ... }
model Tag { ... }
model DiaryEntryTag { ... }
model Attachment { ... }
model Comment { ... }
model OnboardingProgram { ... }
model Milestone { ... }
model ProgramEnrollment { ... }
model MilestoneCompletion { ... }
model MentorAssignment { ... }
model Notification { ... }
model RefreshToken { ... }
```

#### 7.1.2 Key Prisma Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ID strategy | UUID (`@default(uuid())`) | Prevents enumeration attacks, safe for distributed systems |
| Timestamps | `@default(now())` + `@updatedAt` | Prisma auto-manages `updatedAt` |
| Soft delete | `deletedAt DateTime?` | Application-level; enforced via Prisma middleware |
| Relations | Explicit `@relation` with `onDelete` | Cascade for owned resources; Restrict for references |
| Indexes | `@@index`, `@@unique` | Defined per entity as specified in REQUIREMENTS.md §7 |
| Full-text search | `previewFeatures = ["fullTextSearch"]` | Native PostgreSQL tsvector support |
| Enum mapping | Prisma `enum` → PostgreSQL `ENUM` type | Type-safe at DB level |

#### 7.1.3 Soft Delete Middleware

A Prisma middleware (or `$extends` client extension) intercepts all queries to automatically:

1. **On `findMany` / `findFirst` / `findUnique` / `count`:** Add `WHERE deletedAt IS NULL` unless explicitly overridden with `{ where: { deletedAt: { not: null } } }`
2. **On `delete`:** Convert to `update { deletedAt: new Date() }` instead of a hard delete
3. **On `deleteMany`:** Convert to `updateMany { deletedAt: new Date() }`

This ensures soft delete is consistent across the entire application without manual filtering.

#### 7.1.4 Migration Strategy

| Aspect | Approach |
|--------|----------|
| Tool | `prisma migrate dev` (development), `prisma migrate deploy` (production) |
| Naming | Timestamped with descriptive suffix: `20260524_init`, `20260601_add_notifications` |
| Seed data | `prisma/seed.ts` creates: 1 SYS_ADMIN, 1 HR_ADMIN, sample program with milestones, 2 recruits, 1 mentor |
| Rollback | Prisma does not support down migrations; roll forward with corrective migrations |
| CI | Run `prisma migrate deploy` in CI before tests |

#### 7.1.5 Connection Management

| Setting | Value | Rationale |
|---------|-------|-----------|
| Connection pool size | 10 (default) | Sufficient for 500 concurrent users with short-lived queries |
| Connection timeout | 5 seconds | Fail fast on DB unavailability |
| Idle timeout | 10 seconds | Release unused connections |
| Query logging | Enabled in development (`log: ['query']`) | Debug slow queries |

### 7.2 Index Strategy Summary

**Primary access patterns and their supporting indexes:**

| Access Pattern | Index | Type |
|----------------|-------|------|
| Login by email | `idx_user_email` UNIQUE | B-tree |
| List entries by user + date | `idx_diary_user_date` UNIQUE (partial) | B-tree |
| Filter entries by visibility | `idx_diary_visibility` | B-tree |
| Search entries by keyword | GIN on tsvector(`title`, `body`) | GIN |
| List comments by entry | `idx_comment_entry_id` | B-tree |
| List milestones by program | `idx_milestone_program_id` | B-tree |
| Find mentor for mentee | `idx_mentor_assignment_active` (partial) | B-tree |
| Unread notifications | `idx_notification_read` (partial) | B-tree |
| Active (non-deleted) records | `idx_*_deleted_at` (partial WHERE NULL) | B-tree |

All partial indexes use `WHERE deleted_at IS NULL` or similar conditions to keep the index compact and relevant.

---

## 8. Shared Types Strategy

### 8.1 Package: `@onboarding-diary/shared`

This package is the **single source of truth** for all types, enums, constants, and validation schemas shared between client and server.

### 8.2 What Lives in Shared

| Category | Examples | Consumed By |
|----------|----------|-------------|
| **Enums** | `Role`, `Visibility`, `MilestoneCategory`, `UserStatus`, `EnrollmentStatus`, `CompletionStatus`, `NotificationType` | Client + Server |
| **DTO Interfaces** | `UserDto`, `DiaryEntryDto`, `CreateDiaryEntryInput`, `PaginatedResponse<T>`, `ApiError` | Client + Server |
| **Zod Schemas** | `createDiaryEntrySchema`, `loginSchema`, `registerSchema` | Server (validation middleware) + Client (form validation) |
| **Constants** | `MAX_FILE_SIZE`, `MAX_TAGS_PER_ENTRY`, `PAGINATION_DEFAULTS`, `ALLOWED_MIME_TYPES` | Client + Server |

### 8.3 What Does NOT Live in Shared

| Category | Reason | Lives In |
|----------|--------|----------|
| Prisma-generated types | Tightly coupled to DB schema | `server/` (auto-generated) |
| React component types | Frontend-only | `client/src/types/` |
| Express augmentations | Backend-only | `server/src/types/express.d.ts` |
| Internal service types | Implementation details | `server/src/modules/*/types.ts` |
| UI state types | Component-specific | Co-located with components |

### 8.4 Type Flow

```
Prisma Schema (source of truth for DB)
  │
  ├─ generates → Prisma Client types (server-only)
  │
  └─ informs → @onboarding-diary/shared DTOs (manually aligned)
                  │
                  ├─ Server uses: validate input (Zod), shape output (DTO)
                  └─ Client uses: type API responses, validate forms (Zod)
```

**Alignment discipline:** When the Prisma schema changes, the corresponding shared DTO and Zod schema must be updated in the same PR. This is enforced by code review, not automated tooling (v1).

### 8.5 DTO Naming Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `*Dto` | `UserDto`, `DiaryEntryDto` | API response shape (what the client receives) |
| `Create*Input` | `CreateDiaryEntryInput` | POST request body shape |
| `Update*Input` | `UpdateDiaryEntryInput` | PATCH request body shape |
| `*ListParams` | `DiaryEntryListParams` | Query parameters for list endpoints |
| `PaginatedResponse<T>` | `PaginatedResponse<DiaryEntryDto>` | Paginated list response wrapper |

---

## 9. Error Handling Architecture

### 9.1 Error Class Hierarchy

```
Error (built-in)
  └── AppError (base class for all application errors)
        ├── BadRequestError        (400)
        │     └── ValidationError  (400 + field-level details)
        ├── UnauthorizedError      (401)
        ├── ForbiddenError         (403)
        ├── NotFoundError          (404)
        └── ConflictError          (409)
```

**AppError base class design:**

```
AppError
  ├── statusCode: number        (HTTP status code)
  ├── code: string              (machine-readable error code, e.g., 'VALIDATION_ERROR')
  ├── message: string           (human-readable message)
  ├── isOperational: boolean    (true = expected error; false = programming bug)
  └── details?: object[]        (optional field-level details for validation errors)
```

### 9.2 Error Response Contract

All error responses follow this schema:

```
{
  "error": {
    "code": "VALIDATION_ERROR",          // Machine-readable (constant)
    "message": "Validation failed",      // Human-readable (may vary)
    "details": [                         // Optional, present for validation errors
      { "field": "email", "message": "Email is already registered" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### 9.3 Error Code Catalog

| Code | Status | Trigger |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Zod schema validation failure |
| `BAD_REQUEST` | 400 | Malformed request (missing body, bad JSON) |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `TOKEN_EXPIRED` | 401 | Access token has expired (triggers client refresh) |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password on login |
| `FORBIDDEN` | 403 | User lacks role or resource-level permission |
| `NOT_FOUND` | 404 | Resource does not exist (or is soft-deleted) |
| `CONFLICT` | 409 | Duplicate resource (e.g., email, diary entry for same date) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### 9.4 Backend Error Handling Flow

```
Service throws AppError subclass
  │
  └─ Caught by error.middleware
      │
      ├─ isOperational === true (expected error)
      │   ├─ Log at WARN level
      │   └─ Return structured JSON error response
      │
      ├─ isOperational === false (programming bug)
      │   ├─ Log at ERROR level with full stack trace
      │   └─ Return generic 500 response (no internal details exposed)
      │
      └─ Prisma-specific errors (caught and mapped):
          ├─ P2002 (unique constraint) → ConflictError
          ├─ P2025 (record not found)  → NotFoundError
          └─ Others                    → InternalError (logged)
```

### 9.5 Frontend Error Handling Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    Frontend Error Handling Layers                  │
│                                                                   │
│  Layer 1: Axios Response Interceptor (api/client.ts)              │
│  ──────────────────────────────────────────────                   │
│  • 401 TOKEN_EXPIRED → attempt silent refresh → retry request     │
│  • 401 UNAUTHORIZED  → logout, redirect to /login                 │
│  • 403              → throw (caught by component/hook)            │
│  • 5xx              → throw with user-friendly message            │
│  • Network error    → throw "You appear to be offline"            │
│                                                                   │
│  Layer 2: React Query Error Handling (hooks)                      │
│  ──────────────────────────────────────────────                   │
│  • onError callback → show toast notification                     │
│  • isError state    → render error UI in component                │
│  • retry: 3         → automatic retry with exponential backoff    │
│                                                                   │
│  Layer 3: React Error Boundaries (components/common)              │
│  ──────────────────────────────────────────────                   │
│  • Wraps major page sections                                      │
│  • Catches render-time exceptions                                  │
│  • Shows fallback UI with "Try Again" button                      │
│  • Logs error to console (and to error tracking service, future)  │
│                                                                   │
│  Layer 4: Form Validation (React Hook Form + Zod)                 │
│  ──────────────────────────────────────────────                   │
│  • Client-side validation BEFORE submission                       │
│  • Server validation errors mapped to form field errors           │
│  • Inline error messages under each field                         │
│                                                                   │
│  Layer 5: Global Toast System                                     │
│  ──────────────────────────────────────────────                   │
│  • Success toasts for mutations (create, update, delete)          │
│  • Error toasts for unexpected failures                           │
│  • Auto-dismiss after 5 seconds                                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 10. Logging Strategy

### 10.1 Library Choice

**Pino** — chosen for its performance (fastest Node.js logger), native JSON output, and low overhead.

### 10.2 Log Levels

| Level | Usage | Environment |
|-------|-------|-------------|
| `fatal` | Process cannot continue; immediate shutdown | All |
| `error` | Unhandled exceptions, failed DB queries, external service failures | All |
| `warn` | Validation failures, deprecated API usage, rate limit approached, auth failures | All |
| `info` | Request/response lifecycle, auth events, CRUD operations, milestone completions | All |
| `debug` | SQL queries (Prisma), request/response bodies, internal state | Development only |
| `trace` | Fine-grained debugging (rarely used) | Development only |

### 10.3 Log Format

All logs are structured JSON for machine parsing:

```json
{
  "level": "info",
  "timestamp": "2026-05-24T10:30:00.000Z",
  "requestId": "req-a1b2c3d4",
  "userId": "user-uuid-123",
  "method": "POST",
  "path": "/api/v1/diary-entries",
  "statusCode": 201,
  "durationMs": 45,
  "message": "Diary entry created",
  "userAgent": "Mozilla/5.0 ...",
  "ip": "192.168.1.1"
}
```

### 10.4 What Gets Logged

| Event | Level | Fields |
|-------|-------|--------|
| Incoming request | `info` | requestId, method, path, ip, userAgent |
| Response sent | `info` | requestId, statusCode, durationMs |
| Login success | `info` | userId, email (masked), ip |
| Login failure | `warn` | email (masked), ip, reason |
| Token refresh | `info` | userId |
| Token refresh failure | `warn` | reason, ip |
| Resource created/updated/deleted | `info` | userId, resourceType, resourceId |
| Validation failure | `warn` | requestId, path, errors (field names only, no values) |
| Authorization failure | `warn` | userId, path, requiredRole, actualRole |
| Unhandled error | `error` | requestId, error message, stack trace |
| DB query (dev only) | `debug` | query, params, durationMs |

### 10.5 What NEVER Gets Logged

- Passwords (plain or hashed)
- JWT tokens (access or refresh)
- Full email addresses (masked: `j***@company.com`)
- Request bodies containing sensitive data
- Credit card numbers, SSNs, or other PII

### 10.6 Request ID Tracing

Every request receives a unique ID (`X-Request-ID` header or server-generated UUID). This ID is:

1. Attached to the request context (`req.requestId`)
2. Included in every log line for that request
3. Returned in the response `X-Request-ID` header
4. Passed to error responses for support reference

### 10.7 Production Log Management

| Aspect | Strategy |
|--------|----------|
| Output | stdout/stderr (12-factor app) |
| Collection | Container runtime → log aggregator (e.g., CloudWatch, Datadog, ELK) |
| Retention | 30 days hot, 90 days cold |
| Alerting | Error rate > 1% in 5 min window → alert |
| Rotation | Managed by container runtime, not the application |

---

## 11. Testing Strategy

### 11.1 Testing Pyramid

```
         ┌─────────┐
         │  E2E    │  ← Few (critical user flows only)
         │  Tests  │     Playwright / Cypress
        ┌┴─────────┴┐
        │Integration │  ← Moderate (API + DB)
        │   Tests    │     Supertest + test DB
       ┌┴────────────┴┐
       │  Unit Tests   │  ← Many (services, utils, components)
       │               │     Vitest
       └───────────────┘
```

### 11.2 Testing Tools

| Tool | Purpose | Package |
|------|---------|---------|
| **Vitest** | Unit + integration test runner | `server`, `client`, `shared` |
| **@testing-library/react** | React component testing | `client` |
| **Supertest** | HTTP integration testing | `server` |
| **Prisma Test Environment** | Isolated test database | `server` |
| **MSW (Mock Service Worker)** | Mock API responses in frontend tests | `client` |
| **Playwright** | End-to-end browser testing (future) | Root |
| **c8 / istanbul** | Code coverage (via Vitest) | All |

### 11.3 Backend Testing Strategy

#### 11.3.1 Unit Tests (Services)

- Test each service method in isolation
- Mock the Prisma client using `vitest.mock()` or a Prisma mock library
- Test business logic: validation, authorization checks, data transformation
- Test error cases: not found, forbidden, conflict
- No real database interaction

**File pattern:** `server/src/modules/*/__.service.test.ts`

**Example test areas:**
```
diary.service.test.ts
  ├── create()
  │   ├── creates entry with valid data
  │   ├── rejects if entry already exists for date
  │   ├── sanitizes HTML body
  │   └── creates tags if they don't exist
  ├── findById()
  │   ├── returns entry if user is owner
  │   ├── returns entry if user is mentor and visibility allows
  │   ├── throws NotFoundError if entry doesn't exist
  │   └── throws ForbiddenError if visibility blocks access
  └── delete()
      ├── soft-deletes entry
      └── throws ForbiddenError if not owner
```

#### 11.3.2 Integration Tests (API)

- Test full request → response cycle using Supertest
- Use a real PostgreSQL test database (separate from dev)
- Run migrations before tests, truncate tables between tests
- Test authentication, authorization, validation, and business logic end-to-end
- Test pagination, filtering, and error responses

**File pattern:** `server/src/modules/*/__. routes.test.ts`

**Test database setup:**
```
Before all tests:
  1. Create test database (onboarding_diary_test)
  2. Run prisma migrate deploy
  3. Seed minimal test data

Before each test:
  1. Truncate all tables (preserve schema)
  2. Insert test fixtures

After all tests:
  1. Drop test database
```

### 11.4 Frontend Testing Strategy

#### 11.4.1 Component Tests

- Test components in isolation using `@testing-library/react`
- Use MSW to mock API responses
- Test rendering, user interactions, and error states
- Test form validation (Zod schema enforcement)
- Do not test implementation details (internal state, function calls)

**File pattern:** `client/src/components/*/*.test.tsx`

#### 11.4.2 Hook Tests

- Test custom hooks using `renderHook` from `@testing-library/react`
- Mock React Query's `QueryClient` with predictable responses
- Test loading, success, and error states

**File pattern:** `client/src/hooks/*.test.ts`

#### 11.4.3 Page Tests (Integration)

- Test full page rendering with mocked API (MSW)
- Test navigation, form submission, and data display
- Wrap with necessary providers (QueryClientProvider, AuthProvider, MemoryRouter)

**File pattern:** `client/src/pages/*/*.test.tsx`

### 11.5 Shared Package Tests

- Test Zod schemas with valid and invalid inputs
- Test utility functions
- Test enum value correctness

**File pattern:** `packages/shared/src/**/*.test.ts`

### 11.6 E2E Tests (Future - v1.1+)

- Playwright for critical user flows:
  1. Register → Login → Create Diary Entry → View Entry
  2. HR Admin: Create Program → Add Milestones → Enroll Recruit
  3. Recruit: Complete Milestone → Mentor Verifies
  4. Password Reset Flow
- Run against a full stack (docker-compose)
- Part of CI pipeline (post-deploy to staging)

### 11.7 Coverage Targets

| Package | Target | Enforcement |
|---------|--------|-------------|
| `shared` | 90% | CI gate |
| `server` (services) | 80% | CI gate |
| `server` (controllers) | 70% | Advisory |
| `client` (components) | 70% | Advisory |
| `client` (hooks) | 80% | CI gate |

### 11.8 CI Test Pipeline

```
┌─────────────────────────────────────────────────┐
│                CI Pipeline                       │
│                                                  │
│  1. Install dependencies (npm ci)                │
│  2. Lint (ESLint + Prettier check)               │
│  3. Type check (tsc --noEmit per workspace)      │
│  4. Unit tests (vitest run, all workspaces)      │
│  5. Integration tests (server, with test DB)     │
│  6. Build (vite build for client, tsc for server)│
│  7. Coverage report                              │
│                                                  │
│  Future additions:                               │
│  8. E2E tests (Playwright against staging)       │
│  9. Security audit (npm audit)                   │
│  10. Docker image build + push                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 12. Deployment Strategy

### 12.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Production Environment                     │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   CDN /       │     │          Application Server          │  │
│  │   Static Host │     │                                      │  │
│  │  (Vercel,     │     │  ┌─────────────────────────────────┐ │  │
│  │   Netlify,    │     │  │     Node.js + Express           │ │  │
│  │   CloudFront) │     │  │     (Docker Container)          │ │  │
│  │               │     │  │                                  │ │  │
│  │  Serves:      │     │  │  Port 3000                       │ │  │
│  │  - index.html │     │  │  /api/v1/*                       │ │  │
│  │  - JS bundles │     │  └──────────┬──────────────────────┘ │  │
│  │  - CSS        │     │             │                        │  │
│  │  - Assets     │     └─────────────┼────────────────────────┘  │
│  │               │                   │                           │
│  └──────┬───────┘                   │                           │
│         │                           ▼                           │
│         │                  ┌────────────────┐                   │
│         │                  │  PostgreSQL     │                   │
│         │                  │  (Managed:      │                   │
│         │                  │   RDS, Supabase,│                   │
│         │                  │   Neon, etc.)   │                   │
│         │                  └────────────────┘                   │
│         │                                                       │
│         │         ┌─────────────────┐                           │
│         │         │  File Storage    │                           │
│         └────────>│  (S3 / GCS)     │  (future: attachments)   │
│                   └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Deployment Options

| Component | Option A (Simple) | Option B (Scalable) |
|-----------|-------------------|---------------------|
| Frontend | Vercel / Netlify | CloudFront + S3 |
| Backend | Railway / Render | AWS ECS / GCP Cloud Run |
| Database | Supabase / Neon | AWS RDS PostgreSQL |
| File Storage | Local filesystem | AWS S3 |
| CI/CD | GitHub Actions | GitHub Actions |

**Recommended for v1: Option A** (simplicity, cost-effectiveness, fast iteration).

### 12.3 Docker Setup

#### 12.3.1 Local Development (`docker-compose.yml`)

```yaml
# Services:
#   postgres:    PostgreSQL 16, port 5432, persistent volume
#   pgadmin:     pgAdmin 4, port 5050 (optional, for DB inspection)
#
# The Node.js server and Vite dev server run on the host (not containerized)
# for fast HMR and debugging.
```

#### 12.3.2 Production (`Dockerfile`)

Multi-stage build:

```
Stage 1: "deps" — install all dependencies (npm ci)
Stage 2: "builder" — build shared package, generate Prisma client, compile server (tsc)
Stage 3: "runner" — copy compiled output + production deps, run with node
```

**Image details:**
- Base: `node:20-alpine`
- Non-root user: `node`
- Health check: `GET /api/v1/health`
- Exposed port: 3000

### 12.4 CI/CD Pipeline (GitHub Actions)

```
Trigger: Push to main, PR to main

Jobs:
  ┌──────────────────────────────────────────────────┐
  │  lint-and-typecheck                               │
  │  ├─ npm ci                                        │
  │  ├─ npm run lint (all workspaces)                 │
  │  └─ npx tsc --noEmit (all workspaces)             │
  └──────────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────────┐
  │  test                                             │
  │  ├─ Start PostgreSQL service container            │
  │  ├─ Run migrations (prisma migrate deploy)        │
  │  ├─ npm run test (all workspaces)                 │
  │  └─ Upload coverage report                        │
  └──────────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────────┐
  │  build                                            │
  │  ├─ npm run build (all workspaces)                │
  │  └─ Docker build + push to registry (on main)     │
  └──────────────────────────────────────────────────┘
          │
          ▼ (only on main)
  ┌──────────────────────────────────────────────────┐
  │  deploy                                           │
  │  ├─ Run prisma migrate deploy (production DB)     │
  │  ├─ Deploy backend (Railway / ECS / Cloud Run)    │
  │  └─ Deploy frontend (Vercel / Netlify)            │
  └──────────────────────────────────────────────────┘
```

### 12.5 Health Check Endpoint

```
GET /api/v1/health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2026-05-24T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "connected",
    "memory": { "rss": "45MB", "heapUsed": "30MB" }
  }
}
```

### 12.6 Environment Promotion Strategy

```
Feature Branch → PR → main → Staging → Production

Feature Branch:
  - PR preview deployment (Vercel/Netlify preview URLs)
  - CI runs all tests

main:
  - Auto-deploy to staging environment
  - Staging uses a separate database (seeded with test data)

Production:
  - Manual promotion from staging (GitHub Actions manual trigger)
  - Run migrations before deploy
  - Health check verification post-deploy
  - Rollback = redeploy previous Docker image
```

---

## 13. Environment Variables

### 13.1 Variable Catalog

#### 13.1.1 Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development`, `staging`, `production`, `test` |
| `PORT` | No | `3000` | HTTP server port |
| `API_PREFIX` | No | `/api/v1` | API route prefix |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing/verifying refresh tokens |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | No | `12` | Bcrypt cost factor |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_AUTH_MAX` | No | `10` | Max auth requests per window |
| `MAX_FILE_SIZE` | No | `10485760` | Max upload file size in bytes (10 MB) |
| `UPLOAD_DIR` | No | `./uploads` | File upload directory |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `REQUEST_BODY_LIMIT` | No | `1mb` | Max JSON body size |

#### 13.1.2 Client Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:3000/api/v1` | Backend API base URL |
| `VITE_APP_NAME` | No | `Onboarding Diary` | Application display name |
| `VITE_APP_VERSION` | No | from `package.json` | Application version |

### 13.2 Configuration Loading

The server loads and validates all environment variables at startup using a Zod schema:

```
Startup Flow:
  1. Load .env file (dotenv, development only)
  2. Parse all env vars through Zod schema
  3. If validation fails → log error with missing/invalid vars → exit(1)
  4. Export typed config object used throughout the app
```

This ensures the application fails fast with a clear error message if configuration is missing, rather than crashing later with a cryptic runtime error.

### 13.3 Environment Files

| File | Purpose | Git-tracked |
|------|---------|-------------|
| `.env.example` | Documented template with placeholder values | Yes |
| `.env` | Local development values | No (in .gitignore) |
| `.env.test` | Test environment overrides (test DB URL) | No (in .gitignore) |
| Production vars | Set via deployment platform (Railway, Vercel, etc.) | N/A |

### 13.4 Secret Rotation Strategy

| Secret | Rotation Frequency | Rotation Process |
|--------|--------------------|-----------------|
| `JWT_ACCESS_SECRET` | 90 days | Deploy new secret → old tokens expire naturally (15 min) |
| `JWT_REFRESH_SECRET` | 90 days | Deploy new secret → force re-login (revoke all refresh tokens) |
| `DATABASE_URL` | As needed | Update in deployment platform → restart service |

---

## Appendix A: Architecture Decision Records (ADRs)

### ADR-001: Monorepo with npm Workspaces

**Decision:** Use npm workspaces without Turborepo/Nx.

**Context:** The project has 3 packages (shared, server, client). Adding a build orchestrator introduces complexity for minimal benefit at this scale.

**Consequences:** Simple setup; manual dependency ordering for builds; revisit if package count exceeds 5.

### ADR-002: TanStack Query over Redux/Zustand

**Decision:** Use TanStack Query for server state, React Context for global UI state.

**Context:** The app is CRUD-heavy with minimal cross-component client state. TanStack Query provides caching, refetching, pagination, and optimistic updates out of the box.

**Consequences:** No global store boilerplate; simpler mental model; excellent DevTools; minor learning curve for team members unfamiliar with TanStack Query.

### ADR-003: Pino over Winston

**Decision:** Use Pino for server-side logging.

**Context:** Pino is 5-10x faster than Winston in benchmarks, produces JSON by default, and has a smaller API surface. Winston's transport flexibility is not needed for a 12-factor app that logs to stdout.

**Consequences:** Fast logging with no performance overhead; JSON output works directly with log aggregators; `pino-pretty` for human-readable dev logs.

### ADR-004: Zod for Shared Validation

**Decision:** Use Zod schemas in the shared package for both server validation middleware and client form validation.

**Context:** Defining validation rules once and using them everywhere prevents drift between client and server validation. Zod integrates with React Hook Form (`@hookform/resolvers/zod`) and Express middleware seamlessly.

**Consequences:** Single source of truth for validation; type inference from schemas; slight bundle size increase on client (~13 KB gzipped).

### ADR-005: UUID Primary Keys

**Decision:** Use UUIDs (v4) for all primary keys instead of auto-incrementing integers.

**Context:** UUIDs prevent ID enumeration attacks, allow client-side ID generation (future), and are safe for distributed systems. The performance difference vs. integers is negligible at our scale (<1M records per table).

**Consequences:** Slightly larger indexes; no sequential ordering from IDs (use `created_at` instead); 36-character strings in URLs.

### ADR-006: Soft Delete with Prisma Middleware

**Decision:** Implement soft delete via a `deletedAt` timestamp column and Prisma middleware that transparently filters and converts deletes.

**Context:** Soft delete enables data recovery, audit trails, and compliance with data retention policies. Prisma middleware makes it transparent to the application code.

**Consequences:** All queries automatically exclude deleted records; explicit override needed to query deleted records; scheduled job needed for permanent purge after retention period.
