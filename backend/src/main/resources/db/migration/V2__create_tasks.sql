-- Phase 2: task-log entries owned by a user (recruit).

CREATE TABLE tasks (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id    BIGINT       NOT NULL,
    task_date   DATE         NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    category    VARCHAR(20)  NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'TODO',
    priority    VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_tasks_category CHECK (category IN ('LEARNING', 'SETUP', 'MEETING', 'DOCUMENTATION', 'NETWORKING', 'OTHER')),
    CONSTRAINT chk_tasks_status   CHECK (status   IN ('TODO', 'IN_PROGRESS', 'DONE')),
    CONSTRAINT chk_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT fk_tasks_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_owner          ON tasks (owner_id);
CREATE INDEX idx_tasks_owner_date     ON tasks (owner_id, task_date);
CREATE INDEX idx_tasks_owner_status   ON tasks (owner_id, status);
CREATE INDEX idx_tasks_owner_priority ON tasks (owner_id, priority);
CREATE INDEX idx_tasks_owner_category ON tasks (owner_id, category);
