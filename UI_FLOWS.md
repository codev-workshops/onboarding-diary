# UI Flows — Onboarding Diary

Describes screens, navigation, and key interaction flows for the responsive web
app. Maps to user stories in `USER_STORIES.md`.

## 1. Information Architecture

```
/login
/accept-invite?token=...
/                         → redirect to role landing
  ├─ /dashboard           (Recruit landing)
  ├─ /entries
  │    ├─ /entries/new
  │    └─ /entries/:id    (view → edit)
  ├─ /milestones
  │    └─ /milestones/:id
  ├─ /profile
  └─ /settings
/manage                   (Manager/Admin)
  ├─ /manage/recruits
  ├─ /manage/recruits/:id          (read-only recruit detail)
  ├─ /manage/tags          (Admin)
  ├─ /manage/templates     (Admin)
  └─ /manage/reports       (HR/Admin)
```

## 2. Navigation Shell
- **Top bar:** app name/logo, global search (recruit's own entries), user menu
  (profile, settings, sign out).
- **Left sidebar (recruit):** Dashboard · Entries · Milestones · Profile.
- **Left sidebar (manager/admin):** adds a "Manage" section (Recruits, Tags,
  Templates, Reports) gated by role.
- **Responsive:** sidebar collapses to a hamburger drawer on < 768px; bottom tab
  bar on mobile for the 4 primary recruit sections.

## 3. Role-Based Landing
- On login, redirect by role:
  - `RECRUIT` → `/dashboard`
  - `MANAGER` → `/manage/recruits`
  - `ADMIN` → `/manage/recruits`
- Unauthorized route access redirects to the user's landing with a toast.

## 4. Key Screens

### 4.1 Login (`/login`)
- Email + password fields, "Sign in" button, "Forgot password" link.
- Inline error on failure; disabled submit while pending; rate-limit notice.

### 4.2 Accept Invite (`/accept-invite`)
- Validates token, prompts for new password (with strength meter), confirms,
  then logs in and routes to `/dashboard`.

### 4.3 Recruit Dashboard (`/dashboard`)
- **Cards:** milestone progress ring ("7/10"), current writing streak, mood
  timeline sparkline.
- **Recent entries** list (latest 5) with quick "New entry" CTA.
- **Upcoming milestones** (next target dates).
- Empty state: friendly prompt to write the first entry.

### 4.4 Entries List (`/entries`)
- Filter bar: date range, mood, tag chips, text search.
- Reverse-chronological cards (title, date, mood icon, tag chips, snippet).
- Pagination / infinite scroll. Primary CTA: "New entry".

### 4.5 Entry Editor (`/entries/new`, `/entries/:id` edit)
- Fields: title, content (rich-text/markdown), entry date (default today),
  mood selector, tag input (autocomplete + create), private toggle.
- Inline validation; autosave draft (local) ; "Save" / "Cancel".
- Delete action (with confirm modal) on existing entries.

### 4.6 Milestones (`/milestones`)
- Grouped by status (Pending / In Progress / Completed) or a checklist view.
- Each row: title, target date, status control, complete button.
- "New milestone" CTA; progress summary at top.

### 4.7 Profile (`/profile`)
- View/edit name, department; read-only email & role (admin-controlled).
- Join date display; data export button (v1.2).

### 4.8 Manager — Recruits (`/manage/recruits`)
- Table of assigned recruits: name, department, join date, progress, last entry.
- Search/filter; click → recruit detail.

### 4.9 Manager — Recruit Detail (`/manage/recruits/:id`)
- Read-only tabs: Overview (dashboard mirror), Entries (non-private),
  Milestones. Feedback composer per item (v1.1).

### 4.10 Admin — Tags / Templates / Reports
- **Tags:** list, rename, merge, delete.
- **Templates:** CRUD milestone templates with `offsetDays`, optional department.
- **Reports:** filters (department, date range), completion-rate and mood charts,
  CSV export.

## 5. Primary Flow Diagrams

### 5.1 Create a Diary Entry (US-B1)
```
Dashboard/Entries
   │ click "New entry"
   ▼
Entry Editor (blank, date=today)
   │ fill title, content, mood, tags
   │ click Save
   ▼
Validate (client) ──fail──▶ inline errors, stay
   │ pass
   ▼
POST /entries ──201──▶ toast "Saved" ──▶ Entry view / back to list (top)
            └──400──▶ map fieldErrors to inputs
```

### 5.2 Complete a Milestone (US-C2)
```
Milestones list
   │ click "Complete" on a milestone
   ▼
Confirm (optional) ──▶ POST /milestones/:id/complete
   │ 200
   ▼
Row moves to "Completed", progress ring updates, toast shown
```

### 5.3 Manager Reviews a Recruit (US-E2)
```
/manage/recruits → select recruit
   ▼
/manage/recruits/:id (Overview)
   │ switch tabs: Entries (non-private) / Milestones
   │ (v1.1) add feedback on an item
   ▼
All controls read-only; write attempts blocked client+server (403)
```

### 5.4 Auth / Session Expiry
```
Any protected action
   │ 401 from API
   ▼
Clear session → redirect /login?next=<route> → after login, return to <route>
```

## 6. States & Feedback
- **Loading:** skeletons for lists/cards; spinners on buttons.
- **Empty:** contextual empty states with a primary CTA.
- **Error:** non-blocking toasts for transient errors; inline for validation.
- **Optimistic UI:** milestone status toggles update optimistically with rollback
  on failure.
- **Confirmation:** destructive actions (delete entry/milestone, merge tags) use
  a modal confirm.

## 7. Accessibility (NFR-21)
- All interactive elements keyboard-reachable with visible focus rings.
- Form fields have associated `<label>`s and `aria-describedby` for errors.
- Mood icons paired with text/`aria-label`; charts have data-table fallbacks.
- Color contrast ≥ 4.5:1; no color-only status encoding.

## 8. Visual & Component Notes
- Component library: reusable Card, Button, Input, Textarea, Badge/Chip,
  Modal, Toast, Tabs (aligns with existing `frontend/components/ui/*` patterns).
- Mood represented by a small fixed icon set; tags as removable chips.
- Mobile-first spacing; max content width on desktop for readability.
