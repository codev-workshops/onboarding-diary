-- Phase 5: additional notes owned by a user (recruit), with free-form tags.

CREATE TABLE notes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id    BIGINT       NOT NULL,
    note_date   DATE         NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_notes_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_owner      ON notes (owner_id);
CREATE INDEX idx_notes_owner_date ON notes (owner_id, note_date);

CREATE TABLE note_tags (
    note_id BIGINT       NOT NULL,
    tag     VARCHAR(50)  NOT NULL,
    CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
    CONSTRAINT pk_note_tags PRIMARY KEY (note_id, tag)
);

CREATE INDEX idx_note_tags_tag ON note_tags (tag);
