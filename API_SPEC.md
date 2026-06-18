# API Specification — Onboarding Diary

REST API, JSON over HTTPS. Versioned under `/api/v1`. All timestamps are
ISO-8601 UTC. This spec maps to the requirements in `REQUIREMENTS.md` and the
schema in `DATABASE_SCHEMA.md`.

## 1. Conventions

- **Base URL:** `https://<host>/api/v1`
- **Content type:** `application/json` for requests and responses.
- **Auth:** `Authorization: Bearer <JWT>` on all endpoints except auth/login.
- **IDs:** server-generated, opaque (`long`/UUID — see schema).
- **Pagination:** `?page=<0-based>&size=<n>` (default `size=20`, max `100`).
  List responses are wrapped (see §3).
- **Sorting:** `?sort=field,asc|desc` (whitelisted fields per resource).
- **Filtering:** resource-specific query params (documented per endpoint).
- **Idempotency:** `PUT`/`DELETE` idempotent; `POST` creates.
- **Validation errors:** `400` with a structured error body (§4).

## 2. Roles & Access Summary

| Resource | Recruit (self) | Manager (assigned) | Admin/HR |
|----------|----------------|--------------------|----------|
| Own profile | RW | R | RW |
| Recruits | — | R (assigned) | RW (all) |
| Diary entries | RW (own) | R (non-private) | R (all) |
| Milestones | RW (own) | R | RW (templates) |
| Tags | use | use | RW (manage) |
| Feedback (v1.1) | R (on own) | RW | RW |
| Reports | — | R (assigned) | R (all) |

## 3. Standard Response Envelopes

**Single resource** → the resource object directly.

**Paginated list:**
```json
{
  "content": [ { "...": "..." } ],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "sort": "entryDate,desc"
}
```

## 4. Error Format
```json
{
  "timestamp": "2026-06-18T09:36:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/entries",
  "fieldErrors": [
    { "field": "title", "message": "must not be blank" },
    { "field": "entryDate", "message": "must not be in the future" }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Validation / malformed request |
| 401 | Missing/invalid auth |
| 403 | Authenticated but not allowed |
| 404 | Not found (also used to avoid existence disclosure) |
| 409 | Conflict (e.g. duplicate email/tag) |
| 422 | Semantically invalid state transition |
| 429 | Rate limited |
| 500 | Server error |

## 5. Endpoints

### 5.1 Auth

#### POST `/auth/login`
Request:
```json
{ "email": "alex@acme.com", "password": "••••••••" }
```
Response `200`:
```json
{ "token": "<jwt>", "expiresIn": 3600, "user": { "id": 12, "role": "RECRUIT", "name": "Alex" } }
```
Errors: `400` invalid body, `401` bad credentials, `429` too many attempts.

#### POST `/auth/refresh`
Exchanges a valid refresh token for a new access token. `200` → same shape as login.

#### POST `/auth/logout`
Invalidates the current token/refresh token. `204`.

#### POST `/auth/accept-invite`
```json
{ "inviteToken": "<token>", "password": "••••••••" }
```
`200` → login payload. `400` invalid/expired token.

---

### 5.2 Recruits

#### GET `/recruits` — *Manager/Admin*
Query: `page`, `size`, `department`, `managerId`, `q` (name/email search),
`sort` (`name`, `joinDate`).
`200` → paginated list of recruit summaries.

#### POST `/recruits` — *Admin*
```json
{ "name": "Alex Lee", "email": "alex@acme.com", "department": "Engineering",
  "joinDate": "2026-06-01", "managerId": 4, "applyTemplates": true }
```
`201` → created recruit. `409` if email exists.

#### GET `/recruits/{id}` — *self / assigned manager / admin*
`200` → recruit detail (profile + counts). `403`/`404` otherwise.

#### PUT `/recruits/{id}` — *self (profile fields) / admin (all)*
`200` → updated recruit.

#### DELETE `/recruits/{id}` — *Admin*
Soft-delete / anonymize per retention policy. `204`.

#### GET `/recruits/{id}/dashboard` — *self / assigned manager / admin*
`200`:
```json
{
  "recentEntries": [ { "id": 9, "title": "Week 1", "entryDate": "2026-06-05", "mood": "GOOD" } ],
  "milestones": { "total": 10, "completed": 7, "inProgress": 2, "pending": 1 },
  "streakDays": 4,
  "moodTimeline": [ { "date": "2026-06-05", "mood": "GOOD" } ]
}
```

---

### 5.3 Diary Entries

Entries are scoped to a recruit. Recruits operate on their own; managers/admins
read others'.

#### GET `/entries` — *recruit (own)*
Query filters: `from`, `to` (date range), `mood`, `tag` (repeatable),
`q` (full-text), `page`, `size`, `sort` (`entryDate`, `createdAt`).
`200` → paginated entries.

#### POST `/entries` — *recruit*
```json
{
  "title": "First standup",
  "content": "Met the team, learned the deploy flow...",
  "entryDate": "2026-06-02",
  "mood": "GOOD",
  "tags": ["team", "tools"],
  "private": false
}
```
`201` → created entry. `400` validation.

#### GET `/entries/{id}` — *owner / assigned manager (if not private) / admin*
`200` → entry. `403`/`404` otherwise.

#### PUT `/entries/{id}` — *owner*
Full update; `updatedAt` refreshed. `200` → entry.

#### PATCH `/entries/{id}` — *owner*
Partial update (e.g. tags or mood only). `200` → entry.

#### DELETE `/entries/{id}` — *owner / admin*
`204`.

#### GET `/recruits/{recruitId}/entries` — *assigned manager / admin*
Read-only view of a specific recruit's non-private entries. Same filters as
`/entries`.

---

### 5.4 Milestones

#### GET `/milestones` — *recruit (own)*
Query: `status`, `from`, `to` (target date), `page`, `size`,
`sort` (`targetDate`, `status`).

#### POST `/milestones` — *recruit*
```json
{ "title": "Complete security training", "description": "LMS course #12",
  "targetDate": "2026-06-15", "status": "PENDING" }
```
`201`.

#### GET `/milestones/{id}` — *owner / assigned manager / admin*

#### PUT `/milestones/{id}` — *owner*

#### POST `/milestones/{id}/complete` — *owner*
Transitions to `COMPLETED`, sets `completedAt`. `200` → milestone.
`422` if already completed.

#### DELETE `/milestones/{id}` — *owner / admin* → `204`

#### GET `/recruits/{recruitId}/milestones` — *assigned manager / admin*

---

### 5.5 Milestone Templates — *Admin* (v1.1)

#### GET `/milestone-templates`
#### POST `/milestone-templates`
```json
{ "title": "30-day check-in", "description": "...", "offsetDays": 30 }
```
Templates are materialized into milestones when a recruit is created with
`applyTemplates=true`, using `targetDate = joinDate + offsetDays`.

---

### 5.6 Tags

#### GET `/tags`
Query: `q` (prefix search for autocomplete), `page`, `size`. `200` → tags.

#### POST `/tags` — *any authenticated (create-on-use) / Admin (explicit)*
```json
{ "name": "blocker" }
```
`201`, or `200` returning the existing tag if name already exists (case-insensitive).

#### PUT `/tags/{id}` — *Admin* (rename)
#### POST `/tags/{id}/merge` — *Admin*
```json
{ "targetTagId": 7 }
```
Re-points all entry associations to `targetTagId`, deletes the source. `200`.
#### DELETE `/tags/{id}` — *Admin* → `204` (removes associations)

---

### 5.7 Feedback — *Manager/HR* (v1.1)

#### POST `/feedback`
```json
{ "targetType": "ENTRY", "targetId": 9, "comment": "Great progress!" }
```
`201`. `targetType` ∈ `ENTRY|MILESTONE`.

#### GET `/feedback?targetType=ENTRY&targetId=9`
Returns feedback for a target (recruit sees feedback on their own items).

#### DELETE `/feedback/{id}` — *author / admin* → `204`

---

### 5.8 Reports — *HR/Admin* (v1.2)

#### GET `/reports/onboarding-summary`
Query: `department`, `from`, `to`, `format=json|csv`.
Returns milestone-completion rates and mood distribution. `200`.

---

### 5.9 Privacy — (v1.2)

#### GET `/recruits/{id}/export` — *self / admin*
Returns a downloadable archive (JSON) of profile, entries, milestones. `200`.

---

### 5.10 System

#### GET `/health` → `200 {"status":"UP"}` (liveness)
#### GET `/ready` → readiness incl. DB check
#### GET `/openapi.json` → machine-readable spec (NFR-33)

## 6. Rate Limiting & Security Headers
- `/auth/login` and `/auth/accept-invite` are rate-limited per IP + per account.
- Responses set `Cache-Control: no-store` for authenticated data.
- CORS restricted to the configured frontend origin(s).
- See `ARCHITECTURE.md` §Security for token handling and threat model.

## 7. Versioning & Deprecation
- Breaking changes bump the path version (`/api/v2`).
- Additive changes (new optional fields/endpoints) are non-breaking within `v1`.
- Deprecated endpoints return a `Deprecation` header and are documented for ≥ 1
  minor release before removal.
