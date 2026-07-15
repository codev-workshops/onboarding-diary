# Planning Decisions

- **run_id:** `20260715-115254-onboarding-diary`
- **spec_revision:** `null`
- **status:** `BLOCKED_CLARIFICATION`

No material unresolved choice has been treated as approved. The records below preserve context and alternatives for human decision.

## ADR-001 — In-memory database lifetime

- **Status:** Open; blocks `REQ-015`, `E005-S001`, `G-A`
- **Context:** The BRD says data should be persisted in a database. The invocation mandates SQLite in-memory. Data normally disappears when the owning process/connection lifecycle ends.
- **Choice:** Not selected.
- **Alternatives:**
  1. Data is required only for the lifetime of one running backend process.
  2. Data must survive restart, requiring an explicitly approved snapshot/restore or a change away from purely in-memory storage.
  3. Data resets at a defined event such as each startup or test run.
- **Consequences:** Determines schema initialization, process model, test fixtures, user expectations, and acceptance evidence.
- **Required answer:** Q-001.

## ADR-002 — Role provisioning and authorization model

- **Status:** Open; blocks `REQ-003`, `REQ-004`, `REQ-013`, `E001`, `G-A`, `G-B`
- **Context:** The BRD names three roles but not how roles or manager/recruit relationships are assigned.
- **Choice:** Not selected.
- **Alternatives:** Recruit-only public sign-up with admin-created privileged accounts; invite-only accounts; seeded demonstration accounts; another explicitly approved model.
- **Consequences:** Determines privilege-escalation controls, user-management scope, ownership schema, navigation, and endpoint authorization.
- **Required answers:** Q-002, Q-003, Q-004, Q-005.

## ADR-003 — Authentication and API contract

- **Status:** Open; blocks `REQ-001`, `REQ-017`, `E001-S001`, `G-A`
- **Context:** FastAPI is mandated, but session/cookie versus bearer-token authentication, password rules, endpoint shapes, and error statuses are not defined.
- **Choice:** Not selected.
- **Alternatives:** Server-managed session cookie; signed bearer token; another simple approved mechanism.
- **Consequences:** Affects frontend state, CORS/CSRF handling, logout, expiration, API tests, and security acceptance.
- **Required answers:** Q-010 and Q-011.

## ADR-004 — Dashboard calculation contract

- **Status:** Open; blocks `REQ-009`, `REQ-010`, `E003`, `G-E`
- **Context:** “Summary,” “recent,” “completion progress,” and “open” are not quantified.
- **Choice:** Not selected.
- **Alternatives:** Must be supplied as exact formulas, scopes, order, and seeded examples rather than inferred.
- **Consequences:** Determines aggregation queries, UI labels, empty states, and expected test results.
- **Required answer:** Q-008.

## ADR-005 — Report content and artifact contract

- **Status:** Open; blocks `REQ-011`, `REQ-012`, `E004`, `G-F`
- **Context:** The BRD names report categories and formats but does not define content, boundaries, ordering, or representation.
- **Choice:** Not selected.
- **Alternatives:** Detail-only, summary-only, or detail-plus-summary reports; each requires explicit columns and formatting.
- **Consequences:** Determines query logic, PDF/CSV generation, artifact verification, performance, and data exposure.
- **Required answer:** Q-009.

## ADR-006 — Two extension features

- **Status:** Open; blocks `REQ-018`, `E006`, `G-H`
- **Context:** Step 3 requires at least two new features and gives examples, but no features are selected.
- **Choice:** Not selected.
- **Alternatives:** Examples in the BRD include search, charts, manager dashboards, and onboarding checklists; listing them does not approve them.
- **Consequences:** Affects scope, dependencies, data, authorization, stories, acceptance criteria, and schedule.
- **Required answer:** Q-012.

## ADR-007 — Mandated technology stack

- **Status:** Accepted by invocation, pending overall plan approval
- **Context:** The BRD originally leaves the stack to the candidate, while the invocation explicitly mandates the stack.
- **Choice:** React + Vite + Tailwind CSS frontend; Python FastAPI backend; SQLite in-memory database.
- **Alternatives:** None within this planning run unless the user changes the mandate.
- **Consequences:** All implementation groups must use this stack and avoid unnecessary infrastructure.
- **Affected IDs:** `REQ-015`, `REQ-016`, `E005`, `G-A`.
