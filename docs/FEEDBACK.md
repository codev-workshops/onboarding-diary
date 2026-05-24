# Feedback API

## Overview

The Feedback module enables managers and recruits to exchange feedback. Feedback has an author (who wrote it) and a subject (who it's about), allowing bidirectional queries. Only users with an active manager-recruit relationship can exchange feedback (admins can give feedback to anyone).

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Data Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `author_id` | UUID | — | Who wrote the feedback (authenticated user) |
| `subject_id` | UUID | — | Who the feedback is about |
| `type` | enum | `NEUTRAL` | `POSITIVE`, `NEUTRAL`, `CONSTRUCTIVE` |
| `title` | string (3-255) | — | Feedback title |
| `body` | text (10-10,000) | — | Detailed feedback |
| `rating` | int (1-5) | null | Optional numeric rating |
| `created_at` | datetime | auto | |
| `updated_at` | datetime | auto | |
| `deleted_at` | datetime | null | Soft delete timestamp |

---

## Authorization Rules

| Action | RECRUIT | MANAGER | ADMIN |
|--------|---------|---------|-------|
| Create | To assigned managers only | To assigned recruits only | To anyone |
| View | Own (authored or about me) | Own (authored or about me) | All |
| Edit | Own authored only | Own authored only | Any |
| Delete | Own authored only | Own authored only | Any |
| List | Own (authored or about me) | Own (authored or about me) | All |

---

## Endpoints

### POST `/api/v1/feedback`

Create feedback. Author is the authenticated user. Must have an active assignment relationship with the subject (unless ADMIN).

**Request:**
```json
{
  "subject_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "POSITIVE",
  "title": "Great progress on onboarding tasks",
  "body": "You've completed all setup tasks ahead of schedule and your code reviews show strong attention to detail.",
  "rating": 5
}
```

**Response (201):** Returns the feedback with embedded author and subject info.

**Errors:**
| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Self-feedback attempt |
| 403 | `FORBIDDEN` | No active assignment with subject |
| 404 | `NOT_FOUND` | Subject user not found |

---

### GET `/api/v1/feedback`

List feedback with pagination and filtering.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | `created_at`, `updated_at`, `type`, `rating`, `title` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `type` | enum | — | Filter by feedback type |
| `subject_id` | UUID | — | Filter by subject |
| `author_id` | UUID | — | Filter by author |
| `from_date` | date | — | Created on or after |
| `to_date` | date | — | Created on or before |
| `q` | string | — | Search title and body |

---

### GET `/api/v1/feedback/:id`

Get single feedback. Accessible by author, subject, or ADMIN.

### PATCH `/api/v1/feedback/:id`

Update feedback (type, title, body, rating). Author or ADMIN only.

### DELETE `/api/v1/feedback/:id`

Soft delete. Author or ADMIN only. Returns `204 No Content`.

---

## Response Shape

```json
{
  "data": {
    "id": "...",
    "author_id": "...",
    "subject_id": "...",
    "type": "POSITIVE",
    "title": "Great progress",
    "body": "...",
    "rating": 5,
    "created_at": "2026-05-24T10:00:00.000Z",
    "updated_at": "2026-05-24T10:00:00.000Z",
    "author": {
      "id": "...",
      "first_name": "Jane",
      "last_name": "Manager",
      "role": "MANAGER"
    },
    "subject": {
      "id": "...",
      "first_name": "John",
      "last_name": "Recruit",
      "role": "RECRUIT"
    }
  }
}
```
