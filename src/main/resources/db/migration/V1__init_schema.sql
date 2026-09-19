CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL,
    password_hash VARCHAR(100)  NOT NULL,
    role          VARCHAR(20)   NOT NULL,
    department    VARCHAR(100),
    start_date    DATE,
    manager_id    BIGINT        REFERENCES users (id),
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('RECRUIT', 'MANAGER', 'ADMIN'))
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));
CREATE INDEX ix_users_manager ON users (manager_id);

CREATE TABLE tasks (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date  DATE         NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description VARCHAR(4000),
    category    VARCHAR(100) NOT NULL,
    status      VARCHAR(20)  NOT NULL,
    priority    VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT ck_tasks_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX ix_tasks_user_date ON tasks (user_id, entry_date);
CREATE INDEX ix_tasks_user_status ON tasks (user_id, status);

CREATE TABLE issues (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date       DATE         NOT NULL,
    title            VARCHAR(150) NOT NULL,
    description      VARCHAR(4000),
    severity         VARCHAR(20)  NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    resolution_notes VARCHAR(4000),
    created_at       TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT ck_issues_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX')),
    CONSTRAINT ck_issues_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX ix_issues_user_date ON issues (user_id, entry_date);
CREATE INDEX ix_issues_user_status ON issues (user_id, status);

CREATE TABLE feedback (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date DATE          NOT NULL,
    subject    VARCHAR(150)  NOT NULL,
    type       VARCHAR(20)   NOT NULL,
    details    VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT ck_feedback_type CHECK (type IN ('POSITIVE', 'SUGGESTION', 'CONCERN'))
);

CREATE INDEX ix_feedback_user_date ON feedback (user_id, entry_date);

CREATE TABLE notes (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date DATE           NOT NULL,
    title      VARCHAR(150)   NOT NULL,
    content    VARCHAR(10000) NOT NULL,
    tags       VARCHAR(500),
    created_at TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX ix_notes_user_date ON notes (user_id, entry_date);
