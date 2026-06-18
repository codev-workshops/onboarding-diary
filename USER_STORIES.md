# User Stories — Onboarding Diary

Stories use the format **"As a … I want … so that …"** with acceptance criteria.
Each story links to the functional requirements in `REQUIREMENTS.md`.
Priority: **M** = Must, **S** = Should, **C** = Could.

---

## Epic A — Authentication & Accounts

### US-A1 — Sign in (M) · FR-1, FR-2
**As a** registered user **I want** to sign in with my email and password
**so that** I can securely access my onboarding diary.
- **AC:** Valid credentials return a session token and land me on my dashboard.
- **AC:** Invalid credentials return an error without revealing which field was wrong.
- **AC:** Token expires after the configured TTL and forces re-auth.

### US-A2 — Invite a recruit (S) · FR-4, FR-12
**As an** admin **I want** to invite a new recruit by email and assign a manager
**so that** they can start their diary on day one.
- **AC:** Invited recruit receives a one-time setup link to set their password.
- **AC:** The recruit is linked to the chosen manager and department.

### US-A3 — Sign out (M) · FR-2
**As a** user **I want** to sign out **so that** my session cannot be reused on a
shared machine.
- **AC:** After sign-out, the token is invalidated/cleared and protected routes redirect to login.

---

## Epic B — Diary Entries

### US-B1 — Create an entry (M) · FR-20
**As a** recruit **I want** to write a dated diary entry with a title, content,
mood, and tags **so that** I can capture how my onboarding is going.
- **AC:** Saving a valid entry returns 201 and shows it at the top of my list.
- **AC:** Blank title or content shows inline validation and does not save.
- **AC:** `entryDate` cannot be in the future.

### US-B2 — View my entries (M) · FR-21
**As a** recruit **I want** to see my entries in reverse-chronological order
**so that** I can review my journey.
- **AC:** Entries are paginated (20/page) and sorted by `entryDate` desc.
- **AC:** Each item shows title, date, mood, and tags.

### US-B3 — Edit an entry (M) · FR-22, FR-23
**As a** recruit **I want** to edit an existing entry **so that** I can fix or
expand my notes.
- **AC:** Saving updates `updatedAt`; `createdAt` is unchanged.
- **AC:** I can only edit entries I own (others get 403/404).

### US-B4 — Delete an entry (M) · FR-22
**As a** recruit **I want** to delete an entry **so that** I can remove something
I no longer want recorded.
- **AC:** A confirmation step prevents accidental deletion.
- **AC:** Deleted entries no longer appear and return 404 on direct fetch.

### US-B5 — Filter & search entries (S) · FR-24, FR-25
**As a** recruit **I want** to filter by date range, mood, or tag and search text
**so that** I can find a specific reflection quickly.
- **AC:** Combined filters apply with AND semantics and remain paginated.
- **AC:** Search matches title and content for my own entries only.

### US-B6 — Private entry (C) · FR-26
**As a** recruit **I want** to mark an entry private **so that** my manager cannot
see especially personal reflections.
- **AC:** Private entries are excluded from manager/HR views.

---

## Epic C — Milestones

### US-C1 — Track a milestone (M) · FR-30, FR-31
**As a** recruit **I want** to create milestones with target dates **so that** I
know what I should accomplish during onboarding.
- **AC:** New milestones default to `PENDING`.
- **AC:** I can edit title, description, target date, and status.

### US-C2 — Complete a milestone (M) · FR-32
**As a** recruit **I want** to mark a milestone complete **so that** I can see my
progress.
- **AC:** Completing sets `status=COMPLETED` and stamps `completedAt`.
- **AC:** Dashboard progress count updates immediately.

### US-C3 — Standard milestone templates (S) · FR-33
**As an** admin **I want** standard 30/60/90-day milestones auto-created for new
recruits **so that** every recruit follows a consistent program.
- **AC:** On recruit creation, template milestones are generated with computed
  target dates relative to `joinDate`.

---

## Epic D — Tags

### US-D1 — Tag an entry (M) · FR-40, FR-41
**As a** recruit **I want** to add tags to entries **so that** I can categorize
themes (training, tools, blockers).
- **AC:** Typing a new tag creates it; existing tags autocomplete.
- **AC:** Max 10 tags per entry; duplicates are ignored.

### US-D2 — Manage the tag list (S) · FR-42
**As an** admin **I want** to rename, merge, or delete tags **so that** the tag
vocabulary stays clean.
- **AC:** Merging re-points all entries to the surviving tag.

---

## Epic E — Manager / HR Visibility

### US-E1 — View my recruits (M) · FR-50
**As a** manager **I want** a list of recruits assigned to me **so that** I can
keep track of who is onboarding.
- **AC:** Only recruits assigned to me are listed.

### US-E2 — Review a recruit's progress (M) · FR-51
**As a** manager **I want** to read a recruit's entries and milestones
**so that** I can support them.
- **AC:** I see non-private entries and all milestones, read-only.
- **AC:** Any write attempt returns 403.

### US-E3 — Leave feedback (S, v1.1) · FR-52
**As a** manager **I want** to comment on an entry or milestone **so that** I can
give encouragement or guidance.
- **AC:** Feedback is attributed to me with a timestamp and visible to the recruit.

### US-E4 — Program reporting (S) · FR-53
**As** HR **I want** aggregate stats (milestone completion rates, mood trends)
**so that** I can improve the onboarding program.
- **AC:** Reports respect privacy settings and are exportable (CSV).

---

## Epic F — Dashboard & Insights

### US-F1 — Recruit dashboard (M) · FR-60
**As a** recruit **I want** a dashboard with recent entries, milestone progress,
and my writing streak **so that** I get a quick snapshot of my journey.
- **AC:** Shows latest 5 entries, "X of Y milestones complete", current streak.

### US-F2 — Mood timeline (S) · FR-61
**As a** recruit **I want** to visualize my mood over time **so that** I can
reflect on trends.
- **AC:** A chart plots mood per entry over the selected period.

---

## Epic G — Privacy & Compliance

### US-G1 — Export my data (S) · NFR-40
**As a** recruit **I want** to export all my data **so that** I retain a copy.
- **AC:** Export produces a downloadable JSON/CSV of my profile, entries, milestones.

### US-G2 — Delete my account (S) · NFR-40, NFR-41
**As a** recruit (or admin on their behalf) **I want** account/data deletion
**so that** privacy obligations are met.
- **AC:** Deletion removes or anonymizes PII per the retention policy and is audit-logged.

---

## Story Map (priority overview)

| Release | Stories |
|---------|---------|
| **MVP (v1.0)** | US-A1, US-A3, US-B1–B4, US-C1, US-C2, US-D1, US-E1, US-E2, US-F1 |
| **v1.1** | US-A2, US-B5, US-C3, US-D2, US-E3, US-F2 |
| **v1.2** | US-B6, US-E4, US-G1, US-G2 |
