-- Phase 3: issue-log entries owned by a user (recruit).

CREATE TABLE issues (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id          BIGINT       NOT NULL,
    issue_date        DATE         NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    severity          VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    status            VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    resolution_notes  TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_issues_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_issues_status   CHECK (status   IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT fk_issues_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_issues_owner          ON issues (owner_id);
CREATE INDEX idx_issues_owner_date     ON issues (owner_id, issue_date);
CREATE INDEX idx_issues_owner_status   ON issues (owner_id, status);
CREATE INDEX idx_issues_owner_severity ON issues (owner_id, severity);
