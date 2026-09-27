-- S3: task log. One row per daily task entry a recruit writes (REQ-FUNC-030..036).
CREATE TABLE task_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruit_id  UUID          NOT NULL REFERENCES users (id),
    entry_date  DATE          NOT NULL,
    title       VARCHAR(200)  NOT NULL,
    description VARCHAR(4000),
    category    VARCHAR(20)   NOT NULL CHECK (category IN ('TRAINING', 'SETUP', 'DEVELOPMENT', 'MEETING', 'DOCUMENTATION', 'OTHER')),
    status      VARCHAR(20)   NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
    priority    VARCHAR(10)   NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT task_entries_title_not_blank CHECK (btrim(title) <> '')
);

CREATE INDEX task_entries_recruit_date_idx ON task_entries (recruit_id, entry_date DESC);
