# Authentication & Authorization

## Overview

The Onboarding Diary API uses **JWT-based authentication** with an **opaque refresh token rotation** strategy and **role-based access control (RBAC)**.

| Concern | Implementation |
|---------|---------------|
| Password hashing | bcrypt (cost factor 12, configurable via `BCRYPT_ROUNDS`) |
| Access tokens | JWT signed with HS256, 15-minute expiry (configurable via `JWT_ACCESS_EXPIRY`) |
| Refresh tokens | Opaque `randomBytes(64)` stored as SHA-256 hash, 7-day expiry (configurable via `JWT_REFRESH_EXPIRY`) |
| RBAC | Middleware-based role check against `ADMIN`, `MANAGER`, `RECRUIT` |
| Rate limiting | Auth endpoints: 10 req/min per IP; Global: 100 req/min per IP |

---

## Roles

| Role | Description | Capabilities |
|------|-------------|-------------|
| `RECRUIT` | Default role for new sign-ups | Create/edit own diary entries (tasks, issues, notes), view own profile and reports |
| `MANAGER` | Supervises recruits | Everything RECRUIT can do + view assigned recruits' entries, give feedback, generate reports |
| `ADMIN` | Full system access | Everything MANAGER can do + manage users, assign managers, change roles/statuses |

---

## API Endpoints

### POST `/api/v1/auth/register`

Create a new account. New users default to role `RECRUIT`.

**Rate limited:** 10 requests/minute per IP.

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecureP@ss1",
  "first_name": "Jane",
  "last_name": "Recruit",
  "department": "Engineering"
}
```

**Validation rules:**
- `email` — valid email, max 255 chars, unique
- `password` — min 8 chars, must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character
- `first_name` / `last_name` — 1-100 chars, letters/spaces/hyphens only
- `department` — optional, max 100 chars

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Recruit",
    "role": "RECRUIT"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2gg...",
    "expires_in": 900
  }
}
```

**Error responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input (details array with field-level errors) |
| 409 | `CONFLICT` | Email already registered |
| 429 | `RATE_LIMITED` | Too many requests |

---

### POST `/api/v1/auth/login`

Authenticate with email and password.

**Rate limited:** 10 requests/minute per IP.

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecureP@ss1"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Recruit",
    "role": "RECRUIT"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2gg...",
    "expires_in": 900
  }
}
```

**Error responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing email or password |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (same message for both to prevent user enumeration) |
| 401 | `UNAUTHORIZED` | Account is inactive |
| 429 | `RATE_LIMITED` | Too many requests |

---

### POST `/api/v1/auth/refresh`

Exchange a valid refresh token for a new access token + refresh token pair. The old refresh token is revoked (rotation).

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2gg..."
}
```

**Response (200 OK):**
```json
{
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4...",
    "expires_in": 900
  }
}
```

**Error responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing refresh_token |
| 401 | `UNAUTHORIZED` | Token invalid, expired, or already revoked |

---

### GET `/api/v1/auth/me`

Get the authenticated user's profile. Returns recruit profile data if the user is a recruit.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Recruit",
    "avatar_url": null,
    "role": "RECRUIT",
    "status": "ACTIVE",
    "created_at": "2026-01-15T09:30:00.000Z",
    "recruit_profile": {
      "department": "Engineering",
      "position": "Junior Software Engineer",
      "start_date": "2026-01-15T00:00:00.000Z",
      "expected_end_date": "2026-04-15T00:00:00.000Z",
      "bio": "New engineering recruit",
      "onboarding_status": "IN_PROGRESS"
    }
  }
}
```

For non-recruit users, the `recruit_profile` field is omitted.

**Error responses:**
| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |

---

### POST `/api/v1/auth/logout`

Revoke the current refresh token. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2gg..."
}
```

**Response:** `204 No Content`

**Error responses:**
| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |

---

## Middleware Architecture

```
Request
  │
  ├─ requestIdMiddleware     ← Adds X-Request-Id header (UUID) for tracing
  ├─ loggerMiddleware        ← Logs method, url, status, duration (Pino JSON)
  ├─ helmet()                ← Security headers (CSP, HSTS, etc.)
  ├─ cors()                  ← CORS with configurable origin
  ├─ express.json()          ← Body parser (1 MB limit)
  ├─ globalRateLimiter       ← 100 req/min per IP
  │
  ├─ [Auth endpoints]
  │   ├─ authRateLimiter     ← 10 req/min per IP (login/register only)
  │   ├─ validate(schema)    ← Zod schema validation (returns field-level errors)
  │   └─ controller          ← Business logic
  │
  ├─ [Protected endpoints]
  │   ├─ authMiddleware      ← Verify JWT, attach req.user = { id, role }
  │   ├─ rbac([roles])       ← Check req.user.role against allowed roles
  │   ├─ validate(schema)    ← Zod schema validation
  │   └─ controller          ← Business logic
  │
  ├─ notFoundMiddleware      ← 404 for unmatched routes
  └─ errorMiddleware         ← Centralized error handler
```

### Auth Middleware (`authMiddleware`)

Extracts the JWT from the `Authorization: Bearer <token>` header, verifies it, and attaches the decoded payload to `req.user`:

```typescript
req.user = {
  id: string;   // User UUID from JWT `sub` claim
  role: Role;   // RECRUIT | MANAGER | ADMIN
};
```

If the token is missing, malformed, or expired, throws `UnauthorizedError` (401).

### RBAC Middleware (`rbac(allowedRoles)`)

A higher-order middleware that takes an array of allowed roles:

```typescript
// Only admins can manage users
router.patch('/users/:id/role', authMiddleware, rbac([Role.ADMIN]), controller.updateRole);

// Managers and admins can view all recruits
router.get('/recruits', authMiddleware, rbac([Role.MANAGER, Role.ADMIN]), controller.list);
```

If `req.user.role` is not in `allowedRoles`, throws `ForbiddenError` (403).

### Validation Middleware (`validate(schema, target?)`)

Validates `req.body` (default), `req.query`, or `req.params` against a Zod schema:

```typescript
router.post('/register', validate(registerSchema), controller.register);
router.get('/entries', validate(entryListParamsSchema, 'query'), controller.list);
```

On failure, throws `ValidationError` (400) with field-level details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "password", "message": "Must contain at least one uppercase letter" },
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

---

## Refresh Token Strategy

```
Client                              Server
  │                                    │
  │  POST /auth/login                  │
  │  { email, password }               │
  │ ──────────────────────────────────► │
  │                                    │ ─ Verify credentials
  │                                    │ ─ Sign JWT access token (15m)
  │                                    │ ─ Generate opaque refresh token
  │                                    │ ─ Store SHA-256(refresh_token) in DB
  │  { access_token, refresh_token }   │
  │ ◄────────────────────────────────── │
  │                                    │
  │  GET /auth/me                      │
  │  Authorization: Bearer <access>    │
  │ ──────────────────────────────────► │
  │  { user data }                     │
  │ ◄────────────────────────────────── │
  │                                    │
  │  ... access token expires ...      │
  │                                    │
  │  POST /auth/refresh                │
  │  { refresh_token }                 │
  │ ──────────────────────────────────► │
  │                                    │ ─ Hash token, look up in DB
  │                                    │ ─ Verify not revoked/expired
  │                                    │ ─ Revoke old token
  │                                    │ ─ Create new refresh token
  │                                    │ ─ Sign new access token
  │  { new access_token,               │
  │    new refresh_token }             │
  │ ◄────────────────────────────────── │
  │                                    │
  │  POST /auth/logout                 │
  │  Authorization: Bearer <access>    │
  │  { refresh_token }                 │
  │ ──────────────────────────────────► │
  │                                    │ ─ Revoke refresh token
  │  204 No Content                    │
  │ ◄────────────────────────────────── │
```

**Key design decisions:**

1. **Opaque refresh tokens** (not JWTs) — refresh tokens are `randomBytes(64)` stored as SHA-256 hashes. This allows server-side revocation without a token blacklist.

2. **Token rotation** — every refresh request revokes the old token and issues a new one. If a stolen token is used after the legitimate user has refreshed, the stolen token is already revoked.

3. **No refresh token in JWT** — the refresh token never goes through `jwt.sign()`. It's purely a database-backed random string, making it immune to JWT-specific attacks.

4. **Access token is stateless** — the server never queries the DB to validate an access token. The JWT signature + expiry is sufficient. This keeps most API calls fast.

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/query/params failed Zod validation (includes `details` array) |
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_EXPIRED` | 401 | JWT access token has expired |
| `FORBIDDEN` | 403 | User lacks the required role |
| `NOT_FOUND` | 404 | Resource or route not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already registered) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error (message hidden in production) |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | — | HMAC secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | HMAC secret for refresh token operations (min 32 chars) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token lifetime (e.g., `7d`, `30d`) |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt cost factor |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window (global) |

---

## File Structure

```
apps/api/src/
├── config/
│   ├── index.ts              # Zod-validated env vars
│   ├── cors.ts               # CORS configuration
│   └── database.ts           # Prisma client singleton
├── errors/
│   └── AppError.ts           # Error class hierarchy (BadRequest, Unauthorized, Forbidden, NotFound, Conflict, Validation)
├── middleware/
│   ├── auth.middleware.ts     # JWT verification → req.user
│   ├── rbac.middleware.ts     # Role-based access control
│   ├── validate.middleware.ts # Zod schema validation (body/query/params)
│   ├── error.middleware.ts    # Centralized error handler (AppError, Prisma, unknown)
│   ├── rateLimiter.middleware.ts  # express-rate-limit (global + auth-specific)
│   ├── requestId.middleware.ts    # UUID request tracing
│   ├── logger.middleware.ts       # Pino request logging
│   └── notFound.middleware.ts     # 404 catch-all
├── modules/
│   └── auth/
│       ├── auth.routes.ts     # Route definitions with middleware chains
│       ├── auth.controller.ts # Request/response handling
│       └── auth.service.ts    # Business logic (register, login, refresh, me, logout)
├── utils/
│   ├── jwt.ts                # signAccessToken, verifyAccessToken
│   ├── hash.ts               # hashPassword, comparePassword (bcrypt)
│   └── logger.ts             # Pino logger instance
├── types/
│   └── express.d.ts          # Express Request augmentation (req.user, req.requestId)
├── app.ts                    # Express app with middleware pipeline
└── index.ts                  # Server entrypoint
```

---

## Seed Data

The database seed (`prisma/seed.ts`) creates three test users:

| Email | Role | Password |
|-------|------|----------|
| `admin@onboarding-diary.local` | `ADMIN` | `Password1!` |
| `manager@onboarding-diary.local` | `MANAGER` | `Password1!` |
| `recruit@onboarding-diary.local` | `RECRUIT` | `Password1!` |

Run the seed: `pnpm db:seed`
