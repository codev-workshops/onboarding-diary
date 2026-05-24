# Notes API

## Overview

The Notes module provides free-form journaling for recruits to document their onboarding experience (e.g., "Day 3: felt overwhelmed but the team was helpful"). Notes have a mood rating, entry date, visibility controls, and tag support for categorization.

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Data Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | — | Author (authenticated user) |
| `title` | string (3-255) | — | Note title |
| `body` | text (10-50,000) | — | Note content (required) |
| `mood_rating` | int (1-5) | null | Optional mood indicator |
| `entry_date` | date | — | The date the note is about (YYYY-MM-DD, required) |
| `visibility` | enum | `PRIVATE` | `PRIVATE`, `MANAGER_ONLY`, `PUBLIC` |
| `tags` | string[] | `[]` | Category tags (alphanumeric + hyphens, max 10) |
| `created_at` | datetime | auto | |
| `updated_at` | datetime | auto | |
| `deleted_at` | datetime | null | Soft delete timestamp |

---

## Authorization Rules

| Action | RECRUIT | MANAGER | ADMIN |
|--------|---------|---------|-------|
| Create | Own only | Own only | Own only |
| View | Own only | Own + assigned recruits' (non-PRIVATE) | All |
| Edit | Own only | Own only | Own + any |
| Delete | Own only | Own only | Own + any |
| List | Own only | Own + assigned recruits' (non-PRIVATE) | All |

---

## Endpoints

### POST `/api/v1/notes`

Create a new note.

**Request:**
```json
{
  "title": "Day 3 — First code review",
  "body": "Submitted my first PR today. Got great feedback from the team. Still need to understand the deployment pipeline better.",
  "mood_rating": 4,
  "entry_date": "2026-05-24",
  "visibility": "MANAGER_ONLY",
  "tags": ["reflection", "code-review"]
}
```

**Response (201):** Returns the created note.

---

### GET `/api/v1/notes`

List notes with pagination, filtering, and search.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sort_by` | string | `entry_date` | `created_at`, `updated_at`, `entry_date`, `title` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `visibility` | enum | — | Filter by visibility |
| `from_date` | date | — | Entry date on or after |
| `to_date` | date | — | Entry date on or before |
| `tag` | string | — | Filter by tag (exact match) |
| `q` | string | — | Search title and body |

**Example:**
```
GET /api/v1/notes?tag=reflection&from_date=2026-05-20&to_date=2026-05-31&sort_by=entry_date&sort_order=asc
```

---

### GET `/api/v1/notes/:id`

Get single note. Access checked by ownership/visibility.

### PATCH `/api/v1/notes/:id`

Update note (title, body, mood_rating, visibility, tags). Owner or ADMIN only.

### DELETE `/api/v1/notes/:id`

Soft delete. Owner or ADMIN only. Returns `204 No Content`.

---

## Response Shape

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Day 3 — First code review",
    "body": "Submitted my first PR today...",
    "mood_rating": 4,
    "entry_date": "2026-05-24T00:00:00.000Z",
    "visibility": "MANAGER_ONLY",
    "tags": ["reflection", "code-review"],
    "created_at": "2026-05-24T18:00:00.000Z",
    "updated_at": "2026-05-24T18:00:00.000Z"
  }
}
```

---

## Notes vs Tasks vs Issues

| Feature | Notes | Tasks | Issues |
|---------|-------|-------|--------|
| Purpose | Journaling | Action items | Problem tracking |
| Status lifecycle | None | PENDING→COMPLETED | OPEN→RESOLVED |
| Default visibility | PRIVATE | MANAGER_ONLY | MANAGER_ONLY |
| Required fields | title, body, entry_date | title | title, description |
| Mood tracking | Yes (1-5) | No | No |
