# ADR-014. Testing strategy

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Work lands directly on `main` (ADR-007), so there is no review gate and CI is the only automated
safety net. The riskiest logic is authorization and validation, not UI rendering.

## Decision

Four layers, with effort concentrated on the first two:

| Layer | Tooling | Scope |
|---|---|---|
| Unit | xUnit + FluentAssertions | validators, issue status transitions, permission handler, report builders |
| Integration | `WebApplicationFactory` + a temp-file SQLite database per test class | every endpoint: happy path, validation failure, and each role |
| Frontend unit | Vitest + React Testing Library | forms, route guards, filter state, API client 401 handling |
| End-to-end | Playwright, from M6 | golden-path journeys per role |

Integration tests run against **real SQLite**, not the EF Core in-memory provider, so relational
constraints are exercised. Coverage target is ≥ 80% on service and permission layers, reported
in CI but not a hard gate initially. CI runs backend build and test, and frontend lint and build,
on every push to `main`.

## Consequences

- Regressions in permissions and validation surface in CI rather than in a demo.
- Integration tests are slower than in-memory ones; acceptable at this size, and each test class
  gets an isolated database file so they parallelise.
- End-to-end tests arrive only in M6, so earlier milestones rely on integration plus manual
  verification.

## Alternatives considered

- **EF Core in-memory provider** — faster, but it ignores relational constraints and would give
  false confidence exactly where SQLite behaves differently.
- **Heavy end-to-end coverage from M0** — slow, brittle while the UI is still moving, and
  duplicates cheaper integration tests.
