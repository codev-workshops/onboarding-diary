# Architecture Decision Records

Each ADR captures one decision, its context, and its consequences. Records are immutable once
accepted: to change a decision, add a new ADR that supersedes the old one and update the old
record's status.

Naming: `ADR-NNN-kebab-title.md`, numbered sequentially. Template: `template.md`.
For the consolidated system view these decisions produce, see [`../architecture.md`](../architecture.md).

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-repository-structure.md) | Repository structure | Accepted |
| [ADR-002](ADR-002-frontend-and-backend-stack.md) | Frontend and backend stack | Accepted |
| [ADR-003](ADR-003-database-choice.md) | Database choice | Accepted |
| [ADR-004](ADR-004-authentication-strategy.md) | Authentication strategy | Accepted |

Decisions that are **not** recorded as ADRs are still binding and live in the working documents:
trunk-based development on `main`, hard deletes, Department as reference data, incremental schema
per milestone, no outbound email, API conventions, the authorization model and the testing
strategy are specified in
[`../architecture.md`](../architecture.md) and [`../implementation-plan.md`](../implementation-plan.md),
with the rules for contributors in [`../../AGENTS.md`](../../AGENTS.md).
