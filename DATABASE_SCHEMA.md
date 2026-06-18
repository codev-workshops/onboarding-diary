# Database Schema — Onboarding Diary

Relational schema (PostgreSQL dialect shown; portable to MySQL). Maps to the
domain in `REQUIREMENTS.md` and the API in `API_SPEC.md`.

## 1. Entity-Relationship Overview

```
            ┌──────────────┐         ┌──────────────┐
            │    users     │         │   recruits   │
            │ (auth/login) │ 1     1 │  (profile)   │
            └──────┬───────┘─────────└──────┬───────┘
                   │                         │ 1
                   │ manager (self-ref)      │
                   │                         │ *            * ┌────────┐
                   ▼                  ┌──────▼────────┐  *────│  tags  │
            (manager_id on recruits) │ diary_entries │       └────────┘
                                     └──────┬────────┘   via diary_entry_tags
                                            │ 1
                                     ┌──────▼────────┐
                                     │  milestones   │
                                     └───────────────┘
```

Relationships:
- `users 1—1 recruits` (a recruit is a user; managers/admins are users without a
  recruit row, or with one if they are also onboarding).
- `recruits *—1 recruits` self-reference via `manager_id` (a manager is a user;
  see note below) — modeled as `recruits.manager_user_id → users.id`.
- `recruits 1—* diary_entries`
- `recruits 1—* milestones`
- `diary_entries *—* tags` through join table `diary_entry_tags`
- `feedback *—1 users` (author) and polymorphic target (entry/milestone) — v1.1

## 2. Tables

### 2.1 `users`
Authentication & role identity, separate from recruit profile for clean RBAC.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `email` | VARCHAR(254) | NOT NULL, UNIQUE (citext / lower-indexed) |
| `password_hash` | VARCHAR(255) | NOT NULL (argon2/bcrypt) |
| `role` | VARCHAR(20) | NOT NULL, CHECK in (`RECRUIT`,`MANAGER`,`ADMIN`) |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `ACTIVE`, CHECK in (`ACTIVE`,`INVITED`,`DISABLED`) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Indexes: `UNIQUE(lower(email))`.

### 2.2 `recruits`
Onboarding profile (1–1 with a `users` row of role `RECRUIT`).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, UNIQUE, FK → `users(id)` ON DELETE CASCADE |
| `name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(254) | NOT NULL, UNIQUE (mirror of users.email) |
| `department` | VARCHAR(100) | NULL |
| `join_date` | DATE | NULL |
| `manager_user_id` | BIGINT | NULL, FK → `users(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Indexes: `idx_recruits_manager (manager_user_id)`, `idx_recruits_department (department)`.

### 2.3 `diary_entries`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `recruit_id` | BIGINT | NOT NULL, FK → `recruits(id)` ON DELETE CASCADE |
| `title` | VARCHAR(150) | NOT NULL |
| `content` | TEXT | NOT NULL |
| `mood` | VARCHAR(20) | NULL, CHECK in (`GREAT`,`GOOD`,`OKAY`,`LOW`,`STRESSED`) |
| `entry_date` | DATE | NOT NULL |
| `is_private` | BOOLEAN | NOT NULL DEFAULT false |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Indexes:
- `idx_entries_recruit_date (recruit_id, entry_date DESC)` — primary list query.
- `idx_entries_mood (recruit_id, mood)`.
- Full-text: `GIN (to_tsvector('english', title || ' ' || content))` for search (FR-25).

### 2.4 `milestones`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `recruit_id` | BIGINT | NOT NULL, FK → `recruits(id)` ON DELETE CASCADE |
| `title` | VARCHAR(150) | NOT NULL |
| `description` | VARCHAR(2000) | NULL |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `PENDING`, CHECK in (`PENDING`,`IN_PROGRESS`,`COMPLETED`) |
| `target_date` | DATE | NULL |
| `completed_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Constraints:
- CHECK: `status <> 'COMPLETED' OR completed_at IS NOT NULL`.
Indexes: `idx_milestones_recruit_status (recruit_id, status)`,
`idx_milestones_target (recruit_id, target_date)`.

### 2.5 `tags`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `name` | VARCHAR(30) | NOT NULL, UNIQUE (lower), CHECK `name ~ '^[a-z0-9-]+$'` |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index: `UNIQUE(lower(name))`.

### 2.6 `diary_entry_tags` (join)

| Column | Type | Constraints |
|--------|------|-------------|
| `diary_entry_id` | BIGINT | NOT NULL, FK → `diary_entries(id)` ON DELETE CASCADE |
| `tag_id` | BIGINT | NOT NULL, FK → `tags(id)` ON DELETE CASCADE |

PK: `(diary_entry_id, tag_id)`. Index: `idx_det_tag (tag_id)` for reverse lookup.

### 2.7 `milestone_templates` (v1.1)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `title` | VARCHAR(150) | NOT NULL |
| `description` | VARCHAR(2000) | NULL |
| `offset_days` | INT | NOT NULL (days after join_date) |
| `department` | VARCHAR(100) | NULL (NULL = applies to all) |
| `active` | BOOLEAN | NOT NULL DEFAULT true |

### 2.8 `feedback` (v1.1)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `author_user_id` | BIGINT | NOT NULL, FK → `users(id)` |
| `target_type` | VARCHAR(20) | NOT NULL, CHECK in (`ENTRY`,`MILESTONE`) |
| `target_id` | BIGINT | NOT NULL |
| `comment` | VARCHAR(2000) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index: `idx_feedback_target (target_type, target_id)`.
(Polymorphic target kept simple; integrity enforced in the service layer.)

### 2.9 `audit_log` (NFR-14)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PK |
| `actor_user_id` | BIGINT | NULL, FK → `users(id)` |
| `action` | VARCHAR(60) | NOT NULL (e.g. `RECRUIT_DELETE`) |
| `entity_type` | VARCHAR(40) | NOT NULL |
| `entity_id` | BIGINT | NULL |
| `metadata` | JSONB | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

## 3. DDL Sketch (PostgreSQL)

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('RECRUIT','MANAGER','ADMIN')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','INVITED','DISABLED')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

CREATE TABLE recruits (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(254) NOT NULL UNIQUE,
  department      VARCHAR(100),
  join_date       DATE,
  manager_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE diary_entries (
  id          BIGSERIAL PRIMARY KEY,
  recruit_id  BIGINT NOT NULL REFERENCES recruits(id) ON DELETE CASCADE,
  title       VARCHAR(150) NOT NULL,
  content     TEXT NOT NULL,
  mood        VARCHAR(20) CHECK (mood IN ('GREAT','GOOD','OKAY','LOW','STRESSED')),
  entry_date  DATE NOT NULL,
  is_private  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entries_recruit_date ON diary_entries (recruit_id, entry_date DESC);

CREATE TABLE milestones (
  id           BIGSERIAL PRIMARY KEY,
  recruit_id   BIGINT NOT NULL REFERENCES recruits(id) ON DELETE CASCADE,
  title        VARCHAR(150) NOT NULL,
  description  VARCHAR(2000),
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
  target_date  DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_completed CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE tags (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(30) NOT NULL CHECK (name ~ '^[a-z0-9-]+$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_tags_name ON tags (lower(name));

CREATE TABLE diary_entry_tags (
  diary_entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  tag_id         BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (diary_entry_id, tag_id)
);
```

## 4. Data Lifecycle & Integrity
- **Cascades:** deleting a recruit cascades to entries, milestones, and tag
  links; tags themselves persist.
- **Soft delete / anonymize:** recruit deletion under GDPR sets `users.status =
  DISABLED` and scrubs PII, retaining anonymized aggregates per the retention
  policy (NFR-40/41).
- **Timestamps:** `updated_at` maintained by triggers or the ORM (`@PreUpdate`).
- **Migrations:** managed by Flyway/Liquibase; every change is a versioned,
  forward-only migration.

## 5. Seed Data (dev)
- Default tags: `training`, `team`, `tools`, `process`, `blocker`, `win`.
- One admin user, one manager, two sample recruits with a handful of entries
  and the 30/60/90-day milestone templates applied.
