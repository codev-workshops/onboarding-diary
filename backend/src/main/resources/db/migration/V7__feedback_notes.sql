-- S5: feedback notes. One row per note a recruit submits (REQ-FUNC-050..054).
-- Read visibility (D3: owner, ADMIN, currently assigned MANAGER) is enforced by
-- FeedbackVisibility at request time against the live assignment; nothing is
-- denormalised here so a reassignment takes effect immediately.
CREATE TABLE feedback_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruit_id  UUID          NOT NULL REFERENCES users (id),
    entry_date  DATE          NOT NULL,
    subject     VARCHAR(200)  NOT NULL,
    type        VARCHAR(20)   NOT NULL CHECK (type IN ('POSITIVE', 'SUGGESTION', 'CONCERN')),
    details     VARCHAR(4000) NOT NULL,
    version     BIGINT        NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT feedback_notes_subject_not_blank CHECK (btrim(subject) <> ''),
    CONSTRAINT feedback_notes_details_not_blank CHECK (btrim(details) <> '')
);

CREATE INDEX feedback_notes_recruit_date_idx ON feedback_notes (recruit_id, entry_date DESC);
