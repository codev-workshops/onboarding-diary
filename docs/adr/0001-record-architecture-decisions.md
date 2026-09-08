# 1. Record architecture decisions

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The Onboarding Diary is a greenfield project whose requirements and technical assumptions were
elaborated and then revised through several rounds of review. Decisions such as the stack, the
authentication model, and the branching strategy were locked by the project owner, but the
reasoning behind them lived only in chat and would be lost to anyone reading the repository
later.

## Decision

We keep lightweight Architecture Decision Records in `docs/adr/`, one markdown file per
decision, numbered sequentially and following `template.md`. A record is immutable once
accepted; a change of course is expressed as a new ADR that supersedes the previous one.

## Consequences

- Every significant technical choice has a discoverable rationale next to the code.
- Reviewers can challenge a decision by proposing a superseding ADR rather than reopening chat
  threads.
- A small amount of process overhead: each locked decision needs a record.

## Alternatives considered

- **Rationale in the implementation plan only** — the plan is a living document that gets
  rewritten, so historical reasoning would be overwritten.
- **No records** — cheapest, but leaves future maintainers guessing why, for example, refresh
  tokens are absent.
