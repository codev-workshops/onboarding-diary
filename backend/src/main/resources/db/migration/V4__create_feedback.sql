-- Phase 4: feedback notes owned by a user (recruit).

CREATE TABLE feedback (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id       BIGINT       NOT NULL,
    feedback_date  DATE         NOT NULL,
    subject        VARCHAR(200) NOT NULL,
    type           VARCHAR(20)  NOT NULL,
    details        TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_feedback_type CHECK (type IN ('POSITIVE', 'SUGGESTION', 'CONCERN')),
    CONSTRAINT fk_feedback_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_feedback_owner      ON feedback (owner_id);
CREATE INDEX idx_feedback_owner_date ON feedback (owner_id, feedback_date);
CREATE INDEX idx_feedback_owner_type ON feedback (owner_id, type);
