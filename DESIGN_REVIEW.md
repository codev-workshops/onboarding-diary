# Design Review — Onboarding Diary

Staff-engineer review of the seven design documents (`REQUIREMENTS.md`,
`USER_STORIES.md`, `API_SPEC.md`, `DATABASE_SCHEMA.md`, `UI_FLOWS.md`,
`ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`).

**Overall:** the document set is coherent, well cross-referenced (FR-/NFR-/US-
IDs), and appropriately scoped for a small app. The issues below are mostly
*tightening* — closing gaps between docs and trimming the MVP. None are
architectural dead-ends.

Severity legend: **[H]** high (fix before build), **[M]** medium, **[L]** low.

---

## 1. Inconsistencies Across Documents

1. **[H] Private-entry feature ships after the code that depends on it.**
   `is_private` is in the core `diary_entries` table (DATABASE_SCHEMA §2.3) and
   Phase 4 manager views "filter non-private" (IMPLEMENTATION_PLAN), but the
   private-entry capability is `FR-26` (Could) / `US-B6` mapped to **v1.2**. So
   Phase 4 (v1.0/1.1) filters on a feature that doesn't exist yet.
   → Decide: either pull privacy into MVP, or have Phase 4 treat all entries as
   visible and add the filter with US-B6. Make the docs agree.

2. **[H] `applyTemplates` in core recruit creation, but templates are v1.1.**
   `POST /recruits` (Phase 1) accepts `applyTemplates: true` and references
   `milestone_templates` (API_SPEC §5.2/§5.5), yet templates are `FR-33` (v1.1).
   → Drop the flag from the Phase 1 contract or pull templates forward.

3. **[M] ID type mismatch.** API_SPEC §1 says IDs are "opaque (`long`/UUID)",
   while every table uses `BIGSERIAL` (sequential `long`). Sequential IDs are
   *not* opaque and enable enumeration. Pick one: keep `BIGSERIAL` and drop the
   "opaque" claim, or move to UUIDs (recommended if enumeration is a concern).

4. **[M] Tag creation authority conflicts.** API_SPEC §5.6 allows "any
   authenticated (create-on-use)" to `POST /tags`, but the RBAC matrix
   (API_SPEC §2) lists Tags as recruit=`use`, admin=`RW (manage)`. Either
   recruits can mint tags (then the matrix is wrong) or only admins can (then
   create-on-use breaks `US-D1`'s "typing a new tag creates it").
   → Recommend: allow recruit create-on-use; fix the matrix to say `use/create`.

5. **[M] Reports/Feedback appear in core RBAC matrix but are deferred.**
   The §2 access table lists Feedback and Reports as if present, while they are
   v1.1 (`/feedback`) and v1.2 (`/reports`). Annotate the matrix rows with their
   release to avoid implying they're MVP.

6. **[L] Manager modeling wording drifts.** DATABASE_SCHEMA §1 first says
   "`recruits *—1 recruits` self-reference via `manager_id`" then corrects to
   `manager_user_id → users.id`. The self-reference framing is misleading
   (managers are `users`, not `recruits`). Clean up the ER prose.

7. **[L] `streak` is surfaced but never defined.** Dashboard returns
   `streakDays` (API_SPEC §5.2), UI shows "current writing streak" (UI_FLOWS,
   USER_STORIES US-F1), but no doc defines it (consecutive calendar days with an
   entry? based on `entryDate` or `createdAt`? timezone?). Define it where
   `FR-60` lives.

---

## 2. Missing Requirements

1. **[H] Password reset / "forgot password".** UI_FLOWS §4.1 has a "Forgot
   password" link, but there is no API endpoint, no token storage, and no
   `FR-`. Add `POST /auth/forgot-password` + `POST /auth/reset-password` and a
   reset-token store (hashed, single-use, expiring).

2. **[H] Invite issuance + token storage.** `POST /auth/accept-invite` consumes
   an `inviteToken`, and `users.status = INVITED` exists, but nothing *creates*
   or *stores* invites. Add an invite-creation endpoint (admin) and an
   invite/verification token table (hashed, expiring). Same gap as reset tokens —
   solve them with one token table.

3. **[H] Email/notification service.** Invites and password resets require
   sending email; ARCHITECTURE lists no mail provider/outbox. Add it (and decide
   sync vs. async/outbox).

4. **[M] Refresh-token / session revocation store.** ARCHITECTURE promises
   "revocable" refresh tokens and `POST /auth/logout` "invalidates the token",
   but stateless JWTs cannot be revoked without server state. Either add a
   refresh-token table (rotation + revocation list) or downgrade the claim to
   "short-TTL access token; logout is client-side" (acceptable for MVP).

5. **[M] Optimistic concurrency on edits.** `updatedAt` exists but no
   concurrency control is specified for concurrent edits (recruit on two
   devices, or manager-view vs. edit). Specify `If-Match`/version (`@Version`)
   or last-write-wins explicitly.

6. **[M] Timezone semantics.** Entries use a `DATE` `entry_date` and "not in the
   future" validation, plus streak/dashboard math — all timezone-sensitive.
   Define the reference timezone (recruit-local vs. UTC) once.

7. **[L] Audit-log read path + data-export format.** `audit_log` is written but
   no read API; export (`/recruits/{id}/export`) doesn't pin a schema/format.

8. **[L] Account lockout / brute-force policy.** Rate limiting is mentioned;
   lockout thresholds and reset behavior are not specified.

---

## 3. Security Concerns

1. **[H] PII "encrypted at rest" vs. `UNIQUE(lower(email))` + email lookups.**
   `NFR-15` says name/email are encrypted at rest, but the schema relies on a
   functional unique index on `lower(email)` and email-based login/search.
   Application-level/deterministic field encryption breaks normal indexing and
   case-insensitive uniqueness. → Clarify: rely on **disk/tablespace (TDE)
   encryption** for PII (compatible with indexes) rather than per-field
   encryption, or accept blind-index complexity. As written it's not
   implementable as stated.

2. **[H] Token revocation gap (see §2.4).** Without a refresh store, logout and
   "compromised token" handling are weaker than the threat model claims. Decide
   the model explicitly.

3. **[M] Duplicated `email` in `users` and `recruits`.** Two sources of truth
   for the login identity can drift and become an auth/authorization hazard.
   Drop `recruits.email` (join to `users`) or make it a generated/synced mirror
   with a hard invariant.

4. **[M] 403-vs-404 policy is inconsistent.** Several endpoints say "403 (or
   404)". Pick one rule (recommend: 404 for cross-tenant resource access to
   avoid existence disclosure, 403 for role-but-not-owner) and apply uniformly.

5. **[M] Rich-text XSS surface.** Entry content allows rich text/markdown
   (UI_FLOWS §4.5). Mandate server-side sanitization (allowlist) and storing
   markdown (not raw HTML); ARCHITECTURE mentions it but the API/validation docs
   don't enforce it.

6. **[L] Rate limiting only on auth endpoints.** Consider limits on write
   endpoints (entry/milestone create) to bound abuse.

---

## 4. Scalability Concerns

1. **[M] Reporting queries (v1.2) over all recruits.** Mood trends + completion
   rates scan `diary_entries`/`milestones` across the org. On a single primary
   this competes with OLTP. → Use a read replica and/or materialized views, and
   make report generation async/exportable. (Out of MVP, but design now.)

2. **[M] Many-to-many tag fetch strategy.** The prior `onboarding-diary-fullstack`
   entity used `@ManyToMany(fetch = EAGER)` on entry tags, which causes
   over-fetch and N+1 on list endpoints. ARCHITECTURE already says "don't expose
   entities" — also specify **LAZY + explicit fetch joins / projections** for
   list queries.

3. **[L] Full-text GIN index cost.** The `to_tsvector` GIN index (DATABASE
   §2.3) adds write overhead and storage. Fine at target scale; just confirm
   search is needed in v1.1 (see simplification below) before paying for it.

4. **[L] Streak/dashboard computation.** If computed by scanning all entries per
   request it's wasteful. Cache or compute incrementally; define in §1.7 above.

5. **[L] Pagination is specified (good).** No offset-pagination deep-page issue
   at target scale (10k recruits × ~50 entries). Keyset pagination only if hot
   lists grow.

Overall the layered monolith + Postgres is the right call for the stated scale
(`NFR-5`); none of these require pre-emptive service decomposition.

---

## 5. Simplifications to Accelerate MVP

1. **[H] Collapse `users` + `recruits` into one table for MVP.** The split adds
   a join and a duplicated email on every read for little near-term benefit
   (managers/admins are few). The prior fullstack branch already models a single
   `Recruit` with `email` directly. Keep `role` on that row; reintroduce the
   split only if/when non-recruit users proliferate. Removes inconsistency §3.3.

2. **[H] Single short-lived JWT; defer refresh tokens & server-side logout.**
   Re-login on expiry is acceptable for an internal onboarding tool. Eliminates
   the revocation-store work (§2.4) and the threat-model gap for v1.

3. **[H] Seed/admin-create recruits; defer the invite + email flow.** Admin
   creates a recruit with a temporary password (or set-password link generated
   in-app). Removes the email service, invite tokens, and `accept-invite` from
   the critical path.

4. **[M] Defer full-text search; use `ILIKE` filter first.** Skip the GIN index
   in MVP; basic title/content `ILIKE` plus the date/mood/tag filters cover
   early needs.

5. **[M] Defer to backlog:** feedback (v1.1), milestone templates (v1.1), HR
   reports (v1.2), private entries (v1.2), data export/deletion (v1.2), SSO,
   mood-timeline chart, audit log. Keep `audit_log` only if a compliance
   requirement forces it.

6. **[L] Drop `PATCH` (keep `PUT`) for entries in MVP** — one update path is
   simpler; add `PATCH` when partial updates are actually needed.

7. **[L] Hardcode the mood enum and a small default tag set** rather than admin
   tag management in MVP.

---

## 6. Recommended MVP Scope

Goal: the smallest end-to-end product that delivers the core value —
*a recruit documents their journey and a manager can follow it.*

**In scope (v1.0):**
- **Auth:** email/password login, single short-TTL JWT, client-side logout
  (`US-A1`, `US-A3`). No invites/refresh/reset in MVP (use admin-set passwords).
- **Recruits:** admin-created profile; recruit edits own profile (`FR-10..12`).
  Single combined `users`-with-profile table (simplification §5.1).
- **Diary entries:** full CRUD with mood + tags (create-on-use), date/mood/tag
  filtering, ownership-enforced (`US-B1..B4`, `US-D1`).
- **Milestones:** CRUD + complete transition; progress count (`US-C1`, `US-C2`).
- **Dashboard:** recent entries + milestone progress (defer streak/mood chart or
  ship streak only if cheaply derivable) (`US-F1`).
- **Manager view:** list assigned recruits + read-only entries/milestones
  (`US-E1`, `US-E2`). All entries visible (no privacy flag yet).
- **Cross-cutting:** server-side validation, RBAC + ownership on every endpoint,
  pagination, standard error envelope, TLS, content sanitization, health
  endpoints, migrations, CI.

**Explicitly deferred:** invites/email, password reset, refresh tokens,
full-text search, milestone templates, feedback, private entries, HR reports,
data export/deletion, SSO, mood timeline, audit log.

**Maps to plan:** this is `IMPLEMENTATION_PLAN` Phases 1–4 **minus** invites,
refresh tokens, templates, and search — matching the existing MVP story map with
the simplifications above. Pre-work items to resolve before coding:
- §1.1 privacy timing, §1.2 templates flag, §1.3 ID type — decide and update docs.
- §1.7 define "streak".
- §3.1 settle the PII-encryption approach (recommend TDE).

**Suggested sequence:** Phase 0 (skeleton/CI) → auth+profile → entry CRUD
(vertical slice) → milestones+dashboard → manager read view. Ship, then layer
v1.1 features behind the now-validated contracts.
