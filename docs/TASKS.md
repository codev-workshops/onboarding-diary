# Task Log API

## Overview

The Task Log module lets recruits track onboarding tasks (e.g., "Set up dev environment", "Complete security training"). Tasks have a priority, status lifecycle, optional due date, tags (used as categories), and visibility controls.

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Data Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | — | Owner (the authenticated user who created it) |
| `title` | string (3-255) | — | Task title |
| `description` | text (≤50,000) | null | Detailed description |
| `priority` | enum | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | enum | `PENDING` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED` |
| `due_date` | date | null | Deadline (YYYY-MM-DD) |
| `completed_at` | datetime | null | Auto-set when status → COMPLETED, cleared otherwise |
| `visibility` | enum | `MANAGER_ONLY` | `PRIVATE`, `MANAGER_ONLY`, `PUBLIC` |
| `tags` | string[] | `[]` | Category tags (alphanumeric + hyphens, max 10, each ≤50 chars) |
| `created_at` | datetime | auto | |
| `updated_at` | datetime | auto | |
| `deleted_at` | datetime | null | Soft delete timestamp |

---

## Authorization Rules

| Action | RECRUIT | MANAGER | ADMIN |
|--------|---------|---------|-------|
| Create task | Own only | Own only | Own only |
| View task | Own only | Own + assigned recruits' (non-PRIVATE) | All |
| Edit task | Own only | Own only | Own + any |
| Delete task | Own only | Own only | Own + any |
| List tasks | Own only | Own + assigned recruits' (non-PRIVATE) | All |

---

## Endpoints

### POST `/api/v1/tasks`

Create a new task for the authenticated user.

**Request:**
```json
{
  "title": "Set up development environment",
  "description": "Install Node.js, Docker, VS Code and run the project locally.",
  "priority": "HIGH",
  "due_date": "2026-06-01",
  "visibility": "MANAGER_ONLY",
  "tags": ["technical", "setup"]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Set up development environment",
    "description": "Install Node.js, Docker, VS Code and run the project locally.",
    "priority": "HIGH",
    "status": "PENDING",
    "due_date": "2026-06-01T00:00:00.000Z",
    "completed_at": null,
    "visibility": "MANAGER_ONLY",
    "tags": ["technical", "setup"],
    "created_at": "2026-05-24T10:00:00.000Z",
    "updated_at": "2026-05-24T10:00:00.000Z"
  }
}
```

---

### GET `/api/v1/tasks`

List tasks with pagination, filtering, sorting, and search.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field: `created_at`, `updated_at`, `due_date`, `priority`, `status`, `title` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `status` | enum | — | Filter by status |
| `priority` | enum | — | Filter by priority |
| `visibility` | enum | — | Filter by visibility |
| `from_date` | date | — | Filter tasks created on or after (YYYY-MM-DD) |
| `to_date` | date | — | Filter tasks created on or before (YYYY-MM-DD) |
| `tag` | string | — | Filter by tag (exact match, acts as category filter) |
| `q` | string | — | Search title and description (case-insensitive) |

**Example:**
```
GET /api/v1/tasks?status=PENDING&priority=HIGH&tag=technical&page=1&limit=10&sort_by=due_date&sort_order=asc
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "user_id": "...",
      "title": "Set up development environment",
      "description": "...",
      "priority": "HIGH",
      "status": "PENDING",
      "due_date": "2026-06-01T00:00:00.000Z",
      "completed_at": null,
      "visibility": "MANAGER_ONLY",
      "tags": ["technical", "setup"],
      "created_at": "2026-05-24T10:00:00.000Z",
      "updated_at": "2026-05-24T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_count": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

---

### GET `/api/v1/tasks/:id`

Get a single task by ID.

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "...",
    "title": "Set up development environment",
    "description": "...",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "due_date": "2026-06-01T00:00:00.000Z",
    "completed_at": null,
    "visibility": "MANAGER_ONLY",
    "tags": ["technical", "setup"],
    "created_at": "2026-05-24T10:00:00.000Z",
    "updated_at": "2026-05-24T12:30:00.000Z"
  }
}
```

**Errors:**
| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Task is not yours and you lack permission |
| 404 | `NOT_FOUND` | Task does not exist or is deleted |

---

### PATCH `/api/v1/tasks/:id`

Update a task. Only the owner or ADMIN can edit. All fields are optional.

Setting `status` to `COMPLETED` auto-sets `completed_at`. Setting it to any other value clears `completed_at`.

**Request:**
```json
{
  "status": "COMPLETED",
  "priority": "MEDIUM"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "...",
    "title": "Set up development environment",
    "description": "...",
    "priority": "MEDIUM",
    "status": "COMPLETED",
    "due_date": "2026-06-01T00:00:00.000Z",
    "completed_at": "2026-05-25T14:00:00.000Z",
    "visibility": "MANAGER_ONLY",
    "tags": ["technical", "setup"],
    "created_at": "2026-05-24T10:00:00.000Z",
    "updated_at": "2026-05-25T14:00:00.000Z"
  }
}
```

**Errors:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 403 | `FORBIDDEN` | Not the task owner and not ADMIN |
| 404 | `NOT_FOUND` | Task not found |

---

### DELETE `/api/v1/tasks/:id`

Soft-delete a task. Only the owner or ADMIN can delete.

**Response:** `204 No Content`

**Errors:**
| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Not the task owner and not ADMIN |
| 404 | `NOT_FOUND` | Task not found |

---

## Tags as Categories

The `tags` field serves as the category system. Use consistent tag values across tasks (e.g., `hr`, `technical`, `training`, `social`, `security`) and filter with the `tag` query parameter:

```
GET /api/v1/tasks?tag=training
```

This returns all tasks that include `training` in their tags array.

---

## Service Layer

```
apps/api/src/modules/tasks/
├── tasks.routes.ts      # Route definitions with middleware
├── tasks.controller.ts  # Request/response handling
└── tasks.service.ts     # Business logic + Prisma queries
```

The service layer handles:
- **Ownership enforcement**: edit/delete restricted to owner or ADMIN
- **Visibility scoping**: managers see assigned recruits' non-PRIVATE tasks; recruits see only their own
- **Auto-completion tracking**: `completed_at` auto-managed when status changes to/from COMPLETED
- **Soft delete**: `deletedAt` timestamp, excluded from all queries
- **Pagination**: offset-based with total count for efficient client-side paging
