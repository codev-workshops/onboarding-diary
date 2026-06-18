# Implementation Plan — Onboarding Diary

Phased delivery plan tying together the requirements, API, schema, UI, and
architecture documents. No code is written yet; this is the build roadmap.

## 1. Guiding Principles
- Ship a thin, end-to-end **vertical slice** first (auth → entry CRUD) to
  de-risk the stack, then broaden.
- Backend contracts (OpenAPI) lead; frontend consumes a generated typed client.
- Every phase ships with tests, migrations, and updated docs.
- Keep PRs small and reviewable; trunk-based with feature branches.

## 2. Workstreams
1. **Platform/DevEx** — repo structure, CI, docker-compose, migrations, OpenAPI.
2. **Backend** — entities, services, controllers, auth, validation.
3. **Frontend** — shell, routing, auth, feature screens.
4. **Quality** — unit/integration/e2e tests, accessibility, security review.

## 3. Phases & Milestones

### Phase 0 — Foundations (Sprint 0)
**Goal:** project skeleton runnable locally and in CI.
- Repo layout: `backend/`, `frontend/`, `docker-compose.yml`, `docs/`.
- Backend bootstrap (Spring Boot), frontend bootstrap (React/TS).
- PostgreSQL via docker-compose; Flyway baseline migration.
- CI pipeline: build, lint, test, image build.
- OpenAPI scaffolding + health endpoints.
- **Exit criteria:** `docker-compose up` serves an empty app + DB; CI green.

### Phase 1 — Auth & Recruit Profile (MVP core) · FR-1..3, FR-10..12
- `users` + `recruits` tables and migrations.
- Login, token issue/refresh/logout; password hashing; RBAC scaffolding.
- Recruit profile read/update; admin create recruit.
- Frontend: login, accept-invite, route guards, profile screen.
- Tests: auth flow, RBAC denials.
- **Exit:** a recruit can sign in and see an (empty) dashboard.

### Phase 2 — Diary Entries (vertical slice) · FR-20..23, FR-40..41
- `diary_entries`, `tags`, `diary_entry_tags` schema.
- Entry CRUD endpoints + DTO validation; tag find-or-create.
- Frontend: entries list, entry editor (with tags/mood), delete confirm.
- Tests: entry CRUD, ownership authorization, validation rules.
- **Exit:** recruit can create/edit/delete/list entries with tags & mood (US-B1..B4, US-D1).

### Phase 3 — Milestones & Dashboard · FR-30..32, FR-60
- `milestones` schema + CRUD + complete transition.
- Dashboard aggregation endpoint (progress, recent entries, streak).
- Frontend: milestones screen, dashboard cards.
- Tests: state-transition rules, dashboard math.
- **Exit:** recruit can track/complete milestones and see dashboard (US-C1,C2,F1). **→ MVP v1.0 release candidate.**

### Phase 4 — Manager/HR Visibility · FR-50, FR-51
- Assigned-recruit listing; read-only entry/milestone views with privacy filter.
- Frontend: `/manage/recruits`, recruit detail (read-only tabs).
- Tests: manager can read assigned, cannot write; cannot see others.
- **Exit:** managers can review recruits (US-E1, US-E2).

### Phase 5 — Filtering, Search & Templates (v1.1) · FR-24,25,33,42, FR-52,61
- Entry filters + full-text search (GIN index).
- Milestone templates + auto-apply on recruit creation.
- Admin tag management (rename/merge/delete).
- Feedback on entries/milestones; mood timeline chart.
- **Exit:** v1.1 stories (US-A2, US-B5, US-C3, US-D2, US-E3, US-F2).

### Phase 6 — Privacy, Reporting & Hardening (v1.2) · FR-26,53, NFR-40,41
- Private entries; data export; deletion/anonymization + retention policy.
- HR reports (completion rates, mood trends) + CSV export.
- Security review, audit log, accessibility audit, load test against NFRs.
- **Exit:** v1.2 stories (US-B6, US-E4, US-G1, US-G2) and NFR sign-off.

## 4. Dependency Order
```
Phase 0 ─▶ Phase 1 ─▶ Phase 2 ─▶ Phase 3 ─▶ (v1.0)
                         └──────────▶ Phase 4 ─▶ Phase 5 ─▶ Phase 6
```
Phase 4 depends on Phases 1–3; Phases 5–6 build on the full MVP.

## 5. Testing Strategy
- **Unit:** services (business rules, transitions, authorization) ≥ 70% (NFR-31).
- **Integration:** controller↔DB with a test Postgres (Testcontainers); migration
  verification.
- **Contract:** OpenAPI kept in sync; generated client compiles.
- **E2E:** Playwright flows (login → create entry → complete milestone →
  manager review).
- **Non-functional:** load test (NFR-1/2), accessibility (axe), security (SCA,
  dependency + image scans, basic DAST).

## 6. Definition of Done (per feature)
- Code + tests merged, CI green.
- Validation + authorization enforced server-side.
- OpenAPI and relevant docs updated.
- Accessibility checks pass for new UI.
- No new high/critical security findings.

## 7. Environments & Release
- `dev` (compose) → `staging` (prod-like, seeded) → `prod`.
- Migrations run automatically in the pipeline, gated before prod.
- Versioned releases; changelog maintained; rollback via previous image +
  backward-compatible migrations.

## 8. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Privacy expectations (mood/private entries) unclear | Rework, trust | Resolve open questions in REQUIREMENTS §9 with People team before Phase 4 |
| Scope creep into HRIS features | Delay | Enforce non-goals; defer to backlog |
| Full-text search performance | Slow lists | GIN index, pagination, measure early |
| Auth/RBAC gaps | Security incident | Centralized auth, ownership checks, security review in Phase 6 |
| Multi-tenancy later required | Redesign | Keep tenant-agnostic boundaries; isolate data access layer |

## 9. Rough Sizing (indicative)
| Phase | Est. effort |
|-------|-------------|
| 0 | 1 sprint |
| 1 | 1–2 sprints |
| 2 | 1–2 sprints |
| 3 | 1 sprint |
| 4 | 1 sprint |
| 5 | 2 sprints |
| 6 | 2 sprints |

Assumes a small team (≈1–2 backend, 1 frontend, shared QA). Re-estimate after
Phase 0.

## 10. Traceability Matrix (high level)
| Requirement area | API | Schema | UI | Phase |
|------------------|-----|--------|----|-------|
| Auth | `/auth/*` | `users` | Login/Invite | 1 |
| Recruit profile | `/recruits/*` | `recruits` | Profile/Manage | 1,4 |
| Entries | `/entries/*` | `diary_entries`,`tags` | Entries/Editor | 2 |
| Milestones | `/milestones/*` | `milestones` | Milestones | 3 |
| Dashboard | `/recruits/{id}/dashboard` | (aggregate) | Dashboard | 3 |
| Manager views | `/recruits/{id}/entries|milestones` | (FKs) | Manage | 4 |
| Templates/Tags | `/milestone-templates`,`/tags/*` | `milestone_templates`,`tags` | Admin | 5 |
| Feedback | `/feedback` | `feedback` | Recruit detail | 5 |
| Privacy/Reports | `/export`,`/reports/*` | `audit_log` | Reports | 6 |
