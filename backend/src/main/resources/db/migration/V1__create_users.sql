-- Phase 1 MVP: single users table combining auth identity and recruit profile.
-- Per DESIGN_REVIEW.md simplification: collapse users + recruits into one table.

CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    name          VARCHAR(100) NOT NULL,
    department    VARCHAR(100),
    join_date     DATE,
    manager_id    BIGINT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role   CHECK (role   IN ('ADMIN', 'MANAGER', 'RECRUIT')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED')),
    CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Case-insensitive uniqueness for the login identity.
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

CREATE INDEX idx_users_manager    ON users (manager_id);
CREATE INDEX idx_users_role       ON users (role);
CREATE INDEX idx_users_department ON users (department);
