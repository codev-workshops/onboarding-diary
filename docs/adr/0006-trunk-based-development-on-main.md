# 6. Work directly on `main`

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The default workflow for this agent is a feature branch plus a pull request per unit of work.
The exercise instructions state the work is to happen on `main`, and the project owner locked
that as a correction to the implementation plan.

## Decision

Commit directly to **`main`**. No `devin/*` feature branches and no milestone pull requests
unless the project owner later asks for them. Work still lands as small, coherent, conventional
commits, one milestone at a time, with CI green on `main` before the next milestone starts.

## Consequences

- No review gate before code reaches `main`, so CI on push is the only automated safety net —
  it must stay green and fast.
- History is linear and easy to follow; no merge or rebase overhead.
- If the owner later wants review, switching to PRs is a workflow change only, with no
  repository restructuring.

## Alternatives considered

- **Branch plus PR per milestone** — the agent default and better for review, but it contradicts
  the exercise instructions.
