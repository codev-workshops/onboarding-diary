# Reports API

## Overview

The Reports module generates aggregated reports for recruit onboarding progress over a date range. Reports can be exported as PDF or CSV. Four content types are supported: tasks-only, issues-only, feedback-only, and combined (all three).

Reports go through a lifecycle: `DRAFT → GENERATED → REVIEWED → ARCHIVED`. When generated, the computed data is stored as a JSON snapshot so it doesn't change when underlying entries are later modified.

All endpoints require authentication via `Authorization: Bearer <access_token>`.

---

## Report Content Types

| Type | Sections | Description |
|------|----------|-------------|
| `TASKS` | Task stats + entries | Completion rate, overdue count, per-task details |
| `ISSUES` | Issue stats + entries | Severity breakdown, resolution time, per-issue details |
| `FEEDBACK` | Feedback stats + entries | Given/received counts, avg rating, per-feedback details |
| `COMBINED` | All three sections | Full onboarding progress report |

---

## Authorization Rules

| Action | RECRUIT | MANAGER | ADMIN |
|--------|---------|---------|-------|
| Generate | Own reports only | Own + assigned recruits | Any recruit |
| View | Own reports | Own + assigned recruits' reports | All |
| Edit | Own generated | Own generated | Any |
| Delete | Own generated | Own generated | Any |
| Download | Own reports | Own + assigned recruits' reports | All |

---

## Endpoints

### POST `/api/v1/reports`

Generate a new report with aggregated data.

**Request:**
```json
{
  "recruit_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "WEEKLY",
  "content_type": "COMBINED",
  "title": "Week 1 Onboarding Progress",
  "summary": "First week review for John",
  "period_start": "2026-05-18",
  "period_end": "2026-05-24"
}
```

**Response (201):** Returns the report with `generated_data` containing aggregated metrics and entry lists.

The `generated_data` JSON includes:
```json
{
  "content_type": "COMBINED",
  "period_start": "2026-05-18",
  "period_end": "2026-05-24",
  "recruit_name": "John Recruit",
  "generated_at": "2026-05-24T18:00:00.000Z",
  "tasks": {
    "total": 8, "completed": 5, "completion_rate": 63, "overdue": 1,
    "entries": [ ... ]
  },
  "issues": {
    "total": 3, "open": 1, "critical": 0, "avg_resolution_hours": 24.5,
    "entries": [ ... ]
  },
  "feedback": {
    "total": 4, "received": 3, "given": 1, "avg_rating": 4.2,
    "entries": [ ... ]
  }
}
```

---

### GET `/api/v1/reports`

List reports with pagination and filtering.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | `created_at`, `updated_at`, `period_start`, `type`, `status` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `type` | enum | — | Filter by report type (WEEKLY/MONTHLY/FINAL/CUSTOM) |
| `status` | enum | — | Filter by status (DRAFT/GENERATED/REVIEWED/ARCHIVED) |
| `recruit_id` | UUID | — | Filter by recruit |
| `from_date` | date | — | Period start on or after |
| `to_date` | date | — | Period start on or before |

---

### GET `/api/v1/reports/:id`

Get a single report with full generated data.

### PATCH `/api/v1/reports/:id`

Update report metadata (title, summary, status). Creator or ADMIN only.

### DELETE `/api/v1/reports/:id`

Soft delete. Creator or ADMIN only. Returns `204 No Content`.

---

### GET `/api/v1/reports/:id/download?format=PDF|CSV`

Download the report as a file.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | enum | Yes | `PDF` or `CSV` |

**Response:** Binary file download with appropriate `Content-Type` and `Content-Disposition` headers.

**PDF Features:**
- Professional A4 layout with header, sections, and page numbers
- Summary statistics for each section
- Tabular entry details (up to 30 entries per section)
- Auto page breaks for long reports

**CSV Features:**
- Report metadata header
- Section headers with summary stats
- Tabular entry data with proper escaping
- Compatible with Excel, Google Sheets, etc.

---

## Architecture

```
apps/api/src/modules/reports/
├── reports.routes.ts          # Route definitions
├── reports.controller.ts      # Request handlers
├── reports.service.ts         # Business logic (CRUD, auth, orchestration)
├── reports.aggregation.ts     # Data aggregation queries (tasks, issues, feedback)
└── export/
    ├── pdf.export.ts          # PDFKit-based PDF generator
    └── csv.export.ts          # CSV generator
```

The aggregation layer and export services are decoupled from the report CRUD service, making them independently reusable and testable.

---

## Export Format Comparison

| Feature | PDF | CSV |
|---------|-----|-----|
| Visual formatting | ✓ Tables, colors, headers | Plain text |
| Summary statistics | ✓ In-document | ✓ As header rows |
| Entry details | ✓ Tabular | ✓ Tabular |
| Page numbers | ✓ | N/A |
| Import to spreadsheet | Manual | Direct |
| File size | Larger | Smaller |
