-- S6: additional notes. Free-form entries with 0-10 normalized tags (REQ-FUNC-060..063).
-- Tags live in a child table so `?tag=` is an indexed exact match; the set is
-- replaced wholesale on every PUT.
CREATE TABLE additional_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruit_id  UUID           NOT NULL REFERENCES users (id),
    entry_date  DATE           NOT NULL,
    title       VARCHAR(200)   NOT NULL,
    content     VARCHAR(10000) NOT NULL,
    version     BIGINT         NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT additional_notes_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT additional_notes_content_not_blank CHECK (btrim(content) <> '')
);

CREATE INDEX additional_notes_recruit_date_idx ON additional_notes (recruit_id, entry_date DESC);

CREATE TABLE note_tags (
    note_id     UUID        NOT NULL REFERENCES additional_notes (id) ON DELETE CASCADE,
    tag         VARCHAR(30) NOT NULL CHECK (tag ~ '^[a-z0-9][a-z0-9-]{0,29}$'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (note_id, tag)
);

CREATE INDEX note_tags_tag_idx ON note_tags (tag);
