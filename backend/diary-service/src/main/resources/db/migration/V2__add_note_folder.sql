ALTER TABLE note_entries ADD COLUMN folder TEXT;
CREATE INDEX idx_note_folder ON note_entries(user_id, folder);
