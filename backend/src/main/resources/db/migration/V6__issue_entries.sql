-- S4: issue log. One row per issue a recruit logs (REQ-FUNC-040..046).
-- RESOLVED / CLOSED rows must carry non-blank resolution_notes (INV-07); the
-- service enforces the rule, the CHECK keeps the invariant at the storage level.
CREATE TABLE issue_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruit_id       UUID          NOT NULL REFERENCES users (id),
    entry_date       DATE          NOT NULL,
    title            VARCHAR(200)  NOT NULL,
    description      VARCHAR(4000),
    severity         VARCHAR(10)   NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status           VARCHAR(20)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    resolution_notes VARCHAR(4000),
    version          BIGINT        NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT issue_entries_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT issue_entries_resolution_notes_required
        CHECK (status NOT IN ('RESOLVED', 'CLOSED') OR btrim(coalesce(resolution_notes, '')) <> '')
);

CREATE INDEX issue_entries_recruit_date_idx ON issue_entries (recruit_id, entry_date DESC);
