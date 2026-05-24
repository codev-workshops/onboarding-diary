# Issue Log API

## Overview

The Issue Log module lets recruits report problems and blockers encountered during onboarding (e.g., "VPN not working", "Missing repo access"). Issues have a severity level, a resolution lifecycle (OPEN → IN_PROGRESS → RESOLVED → CLOSED), and optional resolution notes.

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Data Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | — | Reporter (authenticated user) |
| `title` | string (3-255) | — | Issue title |
| `description` | text (10-50,000) | — | Detailed description (required) |
| `severity` | enum | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | enum | `OPEN` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `resolution_note` | text (≤10,000) | null | How the issue was resolved |
| `resolved_at` | datetime | null | Auto-set when status → RESOLVED/CLOSED |
| `visibility` | enum | `MANAGER_ONLY` | `PRIVATE`, `MANAGER_ONLY`, `PUBLIC` |
| `tags` | string[] | `[]` | Category tags (alphanumeric + hyphens) |
| `created_at` | datetime | auto | |
| `updated_at` | datetime | auto | |
| `deleted_at` | datetime | null | Soft delete timestamp |

---

## Status Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
                   ↘ OPEN (reopen)
```

- Moving to `RESOLVED` or `CLOSED` auto-sets `resolved_at` (preserves existing value if already set)
- Moving back to `OPEN` or `IN_PROGRESS` clears `resolved_at`
- `resolution_note` can be updated at any status but is typically set when resolving

---

## Authorization Rules

| Action | RECRUIT | MANAGER | ADMIN |
|--------|---------|---------|-------|
| Create issue | Own only | Own only | Own only |
| View issue | Own only | Own + assigned recruits' (non-PRIVATE) | All |
| Edit issue | Own only | Own only | Own + any |
| Delete issue | Own only | Own only | Own + any |
| List issues | Own only | Own + assigned recruits' (non-PRIVATE) | All |

---

## Endpoints

### POST `/api/v1/issues`

Create a new issue for the authenticated user.

**Request:**
```json
{
  "title": "Cannot access staging environment",
  "description": "Getting 403 Forbidden when trying to access the staging server at staging.example.com. Tried with VPN on and off.",
  "severity": "HIGH",
  "visibility": "MANAGER_ONLY",
  "tags": ["access", "infrastructure"]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Cannot access staging environment",
    "description": "Getting 403 Forbidden when trying to access the staging server...",
    "severity": "HIGH",
    "status": "OPEN",
    "resolution_note": null,
    "resolved_at": null,
    "visibility": "MANAGER_ONLY",
    "tags": ["access", "infrastructure"],
    "created_at": "2026-05-24T10:00:00.000Z",
    "updated_at": "2026-05-24T10:00:00.000Z"
  }
}
```

---

### GET `/api/v1/issues`

List issues with pagination, filtering, sorting, and search.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | `created_at`, `updated_at`, `severity`, `status`, `title` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `status` | enum | — | Filter by status |
| `severity` | enum | — | Filter by severity |
| `visibility` | enum | — | Filter by visibility |
| `from_date` | date | — | Filter issues created on or after (YYYY-MM-DD) |
| `to_date` | date | — | Filter issues created on or before (YYYY-MM-DD) |
| `tag` | string | — | Filter by tag (exact match) |
| `q` | string | — | Search title and description (case-insensitive) |

**Example:**
```
GET /api/v1/issues?status=OPEN&severity=HIGH&sort_by=severity&sort_order=desc
```

**Response (200 OK):**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total_count": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

---

### GET `/api/v1/issues/:id`

Get a single issue by ID.

**Errors:**
| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Not yours and you lack permission |
| 404 | `NOT_FOUND` | Issue does not exist or is deleted |

---

### PATCH `/api/v1/issues/:id`

Update an issue. Only the owner or ADMIN can edit.

**Request (resolution update):**
```json
{
  "status": "RESOLVED",
  "resolution_note": "IT team added the necessary IAM permissions. Access confirmed working."
}
```

**Response (200 OK):** Returns the updated issue with `resolved_at` auto-set.

**Errors:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 403 | `FORBIDDEN` | Not the owner and not ADMIN |
| 404 | `NOT_FOUND` | Issue not found |

---

### DELETE `/api/v1/issues/:id`

Soft-delete an issue. Only the owner or ADMIN can delete.

**Response:** `204 No Content`

---

## Service Layer

```
apps/api/src/modules/issues/
├── issues.routes.ts      # Route definitions with middleware
├── issues.controller.ts  # Request/response handling
└── issues.service.ts     # Business logic + Prisma queries
```

Follows the same patterns as the Task module:
- Ownership-based edit/delete
- Visibility-scoped listing by role
- Soft delete via `deletedAt`
- Offset-based pagination with total count
