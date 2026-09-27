-- S3: optimistic locking for task entries. `version` is bumped on every UPDATE and
-- exposed as the ETag; PUT with a stale If-Match is rejected with 409 CONFLICT.
ALTER TABLE task_entries ADD COLUMN version BIGINT NOT NULL DEFAULT 1;
