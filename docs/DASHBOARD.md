# Dashboard API

## Overview

Three role-specific dashboard endpoints that aggregate data from tasks, issues, notes, and feedback into efficient summaries. Each endpoint is RBAC-gated to the appropriate role.

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Endpoints

### GET `/api/v1/dashboard/recruit`

**Role:** RECRUIT only

Returns the authenticated recruit's personal dashboard with task completion stats, issue summary, recent entries, and activity streak.

**Response (200):**
```json
{
  "data": {
    "task_stats": {
      "total": 12,
      "by_status": [
        { "status": "PENDING", "count": 3 },
        { "status": "IN_PROGRESS", "count": 2 },
        { "status": "COMPLETED", "count": 6 },
        { "status": "BLOCKED", "count": 1 }
      ],
      "completion_rate": 50,
      "overdue": 1
    },
    "issue_summary": {
      "total": 5,
      "open": 2,
      "in_progress": 1,
      "resolved": 1,
      "closed": 1
    },
    "recent_tasks": [
      { "id": "...", "title": "Set up dev environment", "type": "task", "status": "COMPLETED", "created_at": "..." }
    ],
    "recent_issues": [
      { "id": "...", "title": "VPN not working", "type": "issue", "status": "OPEN", "created_at": "..." }
    ],
    "recent_notes": [
      { "id": "...", "title": "Day 3 reflections", "type": "note", "created_at": "..." }
    ],
    "streak": {
      "current_days": 5,
      "last_entry_date": "2026-05-24T18:00:00.000Z"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `task_stats.completion_rate` | Percentage (0-100) of tasks in COMPLETED status |
| `task_stats.overdue` | Tasks with `due_date` in the past and not COMPLETED |
| `streak.current_days` | Consecutive days with at least one entry (task, issue, or note) |

---

### GET `/api/v1/dashboard/manager`

**Role:** MANAGER, ADMIN

Returns team overview with per-recruit stats, open blockers, and recent activity across assigned recruits.

**Response (200):**
```json
{
  "data": {
    "team_overview": {
      "total_recruits": 4,
      "active_recruits": 3,
      "avg_task_completion_rate": 62
    },
    "recruits": [
      {
        "id": "...",
        "first_name": "John",
        "last_name": "Recruit",
        "email": "john@example.com",
        "task_completion_rate": 75,
        "open_issues": 2,
        "total_entries_this_week": 8,
        "last_activity_at": "2026-05-24T15:30:00.000Z"
      }
    ],
    "open_blockers": {
      "total": 3,
      "critical": 1,
      "high": 2,
      "entries": [
        { "id": "...", "title": "Cannot access production DB", "type": "issue", "status": "OPEN", "created_at": "..." }
      ]
    },
    "recent_activity": [
      { "id": "...", "title": "Complete API docs", "type": "task", "status": "IN_PROGRESS", "created_at": "..." }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `recruits[].task_completion_rate` | Per-recruit completion percentage |
| `recruits[].total_entries_this_week` | Task entries created in last 7 days |
| `open_blockers` | HIGH/CRITICAL issues + BLOCKED tasks from non-PRIVATE entries |

---

### GET `/api/v1/dashboard/admin`

**Role:** ADMIN only

Returns system-wide metrics, user statistics, issue overview, and recent signups.

**Response (200):**
```json
{
  "data": {
    "user_stats": {
      "total": 25,
      "by_role": [
        { "role": "RECRUIT", "count": 18 },
        { "role": "MANAGER", "count": 5 },
        { "role": "ADMIN", "count": 2 }
      ],
      "by_status": [
        { "status": "ACTIVE", "count": 20 },
        { "status": "INACTIVE", "count": 3 },
        { "status": "INVITED", "count": 2 }
      ],
      "new_this_month": 4
    },
    "system_metrics": {
      "total_tasks": 156,
      "total_issues": 42,
      "total_notes": 89,
      "total_feedback": 31,
      "total_assignments": 18
    },
    "issue_overview": {
      "open": 12,
      "critical_open": 2,
      "avg_resolution_time_hours": 48.5
    },
    "recent_signups": [
      {
        "id": "...",
        "email": "newuser@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "role": "RECRUIT",
        "created_at": "2026-05-24T10:00:00.000Z"
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `issue_overview.avg_resolution_time_hours` | Average hours between issue creation and resolution (last 500 resolved issues). `null` if no issues have been resolved. |
| `recent_signups` | Last 10 user registrations |

---

## Performance Notes

- All queries use Prisma `$transaction` for consistent reads and minimal round-trips
- Admin dashboard batches 16 count queries + 2 findMany into a single transaction
- Manager dashboard parallelizes per-recruit stats with `Promise.all`
- Recruit streak uses raw SQL for `DISTINCT DATE()` aggregation (not available in Prisma API)
- No N+1 queries — all data fetched in bounded batches
