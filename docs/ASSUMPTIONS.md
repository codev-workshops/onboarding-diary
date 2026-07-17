# Assumptions & Open Questions

This document records design assumptions and product decisions made while
planning the Onboarding Diary application. Items marked **(pending
product-owner confirmation)** are working assumptions that still need sign-off.

## Enum / value-set management

Rather than treating every categorical field as a single "define the enum
values" task, value sets are split into two tiers based on whether the app's
features depend on the *semantic meaning* of each value.

### Tier 1 — Admin-configurable

- **Task `category`** is managed by the Admin, who can **add, rename, and
  delete** categories at runtime.
- Deleting a category that is still referenced by existing task entries must be
  a **soft-disable / archive** (mark inactive so it no longer appears when
  creating or filtering new tasks) rather than a **hard delete**. This avoids
  orphaning existing task entries that reference the category.
- Category is safe to make free-form/admin-editable because no feature relies on
  the specific *meaning* of any given category — it is used only for grouping and
  filtering.

### Tier 2 — Seeded defaults (system-defined in v1, not free-form editable)

The following are **seeded** on first boot and are **system-defined** in v1;
they are **not** free-form editable by the Admin:

- Task `status`
- Task `priority`
- Issue `severity`
- Issue `status`

**Rationale:** the Dashboard and Reports depend on the semantic meaning of these
values, not just their labels. For example:

- The Dashboard's "task completion progress" needs to know *which* status means
  **done**.
- The Dashboard's "open issues at a glance" needs to know *which* issue statuses
  count as **open** vs. resolved.
- Priority and severity carry an inherent **ordering** (Low < Medium < High <
  …) that Reports and sorting rely on.

If these values were free-form editable, an Admin could rename or remove the
value that the analytics logic keys off of and silently break the Dashboard and
Reports.

**Future direction:** if these become configurable in a later version, they must
be exposed as a **managed list** where each entry carries a **protected semantic
flag** (e.g. `isTerminal` / `isOpen`, priority `rank`) rather than free text, so
that the semantic contract the Dashboard and Reports depend on is preserved
regardless of the display label.

### Fixed by mandate

- Feedback `type` is **hardcoded** to **Positive / Suggestion / Concern** and is
  **not** editable (Admin or otherwise). This is fixed by mandate.

### Default value sets to seed on first boot

These defaults are seeded on first boot so that a **zero-config** install
demonstrates every feature immediately (a fresh install has a working, populated
set of statuses/priorities/severities without any manual setup):

| Field           | Default values                          |
| --------------- | --------------------------------------- |
| Task `status`   | To Do, In Progress, Done                |
| Task `priority` | Low, Medium, High                       |
| Issue `severity`| Low, Medium, High, Critical             |
| Issue `status`  | Open, In Progress, Resolved             |

(Feedback `type` — Positive / Suggestion / Concern — is fixed by mandate, see
above, and is not a seeded/configurable list.)

## Pending product-owner confirmation

- **(pending product-owner confirmation)** The exact default value sets listed
  above (task status, task priority, issue severity, issue status).
- **(pending product-owner confirmation)** Whether deleting an in-use task
  `category` should be a **soft-disable / archive** or a **hard delete**. The
  current working assumption is soft-disable to avoid orphaning existing task
  entries.
