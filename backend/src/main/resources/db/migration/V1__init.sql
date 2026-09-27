-- Baseline schema (S0). Domain tables arrive in later slices (V2+).
-- Convention (REQ-FUNC-093): every table carries
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- maintained by the backend in UTC.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS schema_baseline (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_baseline (id) VALUES (1) ON CONFLICT DO NOTHING;
