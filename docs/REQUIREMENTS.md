# Onboarding Diary — elaborated requirements

Expansion of the supplied brief into user stories, API contracts, UI flows and validation rules.
Terms: **recruit** (new employee), **manager** (oversees recruits), **admin** (manages everything).

## 1. User stories

### Authentication and profile

- As a recruit I can create an account with my email, password, name, role, department and start
  date so that my diary is private to me.
- As any user I can sign in and stay signed in for the duration of my session (12h token).
- As any user I can update my name, department, start date and manager from the profile page.

### Task log

- As a recruit I can create a task entry with date, title, description, category, status and
  priority so that my daily work is recorded.
- As a recruit I can edit or delete my own task entries when details change.
- As a recruit I can filter my tasks by date range, category and status to find past work.

### Issue log

- As a recruit I can log an issue with date, title, description, severity, status and resolution
  notes so blockers are visible.
- As a recruit I can filter issues by status and severity.
- As a manager I can see my recruits' open issues so I can unblock them.

### Feedback

- As a recruit I can submit feedback with date, subject, type (Positive / Suggestion / Concern) and
  details so the process improves.

### Notes

- As a recruit I can keep free-form notes with date, title, content and comma-separated tags.

### Dashboard

- As a recruit I see summary counts, my task completion rate, open issue count and my most recent
  entries in each category.
- As a manager I can switch the dashboard between all my recruits and one specific recruit.

### Reports

- As a recruit I can generate a report for a date range covering tasks, issues, feedback or all
  categories, and download it as PDF or CSV.
- As a manager I can generate the same report for any recruit I oversee.

### Extensions delivered

1. **Cross-category search** — one query returns matching tasks, issues, feedback and notes,
   scoped to the entries the actor may see.
2. **Manager dashboards and charts** — per-recruit dashboard scoping plus tasks-by-status,
   issues-by-severity and daily activity charts.

## 2. Data model

```
users(id, email UNIQUE, password_hash, name, role[recruit|manager|admin], department,
      start_date, manager_id -> users.id, created_at)
tasks(id, user_id -> users.id, date, title, description, category, status, priority,
      created_at, updated_at)
issues(id, user_id, date, title, description, severity, status, resolutionNotes, …)
feedback(id, user_id, date, subject, type, details, …)
notes(id, user_id, date, title, content, tags, …)
```

Enumerations:

- task category: Setup, Training, Documentation, Shadowing, Development, Meeting, Other
- task status: Not started, In progress, Completed, Blocked
- task priority: Low, Medium, High
- issue severity: Low, Medium, High, Critical
- issue status: Open, In progress, Resolved
- feedback type: Positive, Suggestion, Concern

## 3. API contract

See the table in [`../README.md`](../README.md#api). Conventions:

- Request and response bodies are JSON; entries are returned as
  `{ entries: [...] }` / `{ entry: {...} }` with `userId` and `userName` attached.
- Errors are `{ error: string }` with the message phrased as the corrective action.
- Status codes: `400` validation, `401` missing/expired token, `403` visibility violation,
  `404` unknown entry, `409` duplicate email.
- List filters: `from`, `to` (inclusive, `YYYY-MM-DD`), `q` (substring), `userId`, plus the
  per-resource enumerated fields (`category`, `status`, `priority`, `severity`, `type`).

## 4. Validation rules

| Field | Rule | Message |
| --- | --- | --- |
| email | valid address, unique, lowercased | "Please enter a valid email address" |
| password | ≥ 8 characters | "Please use a password of at least 8 characters" |
| date | `YYYY-MM-DD` | "Please enter a date in YYYY-MM-DD format" |
| title / subject | non-empty, ≤ 140 chars | "Please enter a title" / "Please enter a subject" |
| description / details / content | ≤ 4000 (notes: 8000) chars | truncation is rejected, not silent |
| enum fields | must be one of the values above | field-level error |
| report range | `from` ≤ `to` | "Please choose an end date on or after the start date" |

Client-side validation runs on submit and on blur, never while first typing into a field, per the
input spec in `devin_context/design-system/components/INPUT.md`.

## 5. UI flows

1. **Sign in** → dashboard. Unauthenticated users are redirected to `/login`; authenticated users
   landing on an unknown route go to `/dashboard`.
2. **Log a task** → Task log → "New task" (primary rounded button) → modal form → "Save entry" →
   list refreshes with the new entry at the top.
3. **Filter** → Task log → filter card (date range + dropdowns) → list updates; "Clear filters"
   resets it.
4. **Review as a manager** → Dashboard → recruit dropdown → charts, counts and recent entries scope
   to that recruit.
5. **Generate a report** → Reports → type, date range, recruit → "Download PDF" or "Download CSV".
6. **Search** → Search → term (≥ 2 characters) → grouped results per category.
7. **Verify styling** → Style guide → live palette, type scale, button variants, dropdown and input
   states.

## 6. Non-functional requirements

- Responsive down to a 900px breakpoint, where the sidebar becomes a horizontal nav.
- Keyboard operable: dropdowns support Enter/Space/Arrow/Esc/Tab and every interactive element has
  a visible focus ring.
- Data persisted in SQLite with foreign keys and WAL enabled; deleting a user cascades to entries.
- TypeScript strict mode, named exports, functional components, ESLint clean.

## 7. Suggested future work

- Onboarding checklist templates per department with completion tracking.
- Email or Slack digests of open issues to managers.
- Entry attachments and rich text.
- Audit trail for admin edits.
