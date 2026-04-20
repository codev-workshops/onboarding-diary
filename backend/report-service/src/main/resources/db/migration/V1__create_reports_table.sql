CREATE TABLE generated_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_user_id TEXT,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    categories TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'GENERATED',
    report_data TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_reports_user ON generated_reports(user_id);
