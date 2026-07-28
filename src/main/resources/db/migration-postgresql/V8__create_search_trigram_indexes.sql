-- Trigram GIN indexes for the free-text search of REQUIREMENTS 9.3. A leading-wildcard LIKE cannot
-- use a B-tree index, so every searched text column gets a pg_trgm index over its lower-cased value,
-- matching the `lower(field) like lower(...)` form of the repository queries.
--
-- Unlike migrations V1-V7 this one is PostgreSQL-only, so it lives outside db/migration on the
-- PostgreSQL-only path db/migration-postgresql, which only the application's spring.flyway.locations
-- loads; the H2 test database keeps scanning db/migration alone and skips it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX ix_task_entry_title_trgm ON task_entry USING gin (lower(title) gin_trgm_ops);
CREATE INDEX ix_task_entry_description_trgm ON task_entry USING gin (lower(description) gin_trgm_ops);

CREATE INDEX ix_issue_entry_title_trgm ON issue_entry USING gin (lower(title) gin_trgm_ops);
CREATE INDEX ix_issue_entry_description_trgm ON issue_entry USING gin (lower(description) gin_trgm_ops);
CREATE INDEX ix_issue_entry_resolution_notes_trgm ON issue_entry USING gin (lower(resolution_notes) gin_trgm_ops);

CREATE INDEX ix_feedback_note_subject_trgm ON feedback_note USING gin (lower(subject) gin_trgm_ops);
CREATE INDEX ix_feedback_note_details_trgm ON feedback_note USING gin (lower(details) gin_trgm_ops);

CREATE INDEX ix_additional_note_title_trgm ON additional_note USING gin (lower(title) gin_trgm_ops);
CREATE INDEX ix_additional_note_content_trgm ON additional_note USING gin (lower(content) gin_trgm_ops);

-- Tags are stored already lower-cased, but the index mirrors the query's lower(...) form.
CREATE INDEX ix_note_tag_tag_trgm ON note_tag USING gin (lower(tag) gin_trgm_ops);
