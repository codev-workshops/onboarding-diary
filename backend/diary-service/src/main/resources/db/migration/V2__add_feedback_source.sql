ALTER TABLE feedback_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'OTHER';
CREATE INDEX idx_feedback_source ON feedback_entries(user_id, source);
