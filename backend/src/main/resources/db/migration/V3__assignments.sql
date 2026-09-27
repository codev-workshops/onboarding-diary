-- S2: manager <-> recruit assignments (REQ-FUNC-016..019, INV-04, INV-05).

-- An invite may be revoked (INVITED -> DEACTIVATED, REQ-FUNC-012a) before a
-- password exists, so DEACTIVATED rows may carry either a hash or NULL.
ALTER TABLE users DROP CONSTRAINT users_invited_has_no_password;
ALTER TABLE users ADD CONSTRAINT users_password_matches_status CHECK (
    (status <> 'INVITED' OR password_hash IS NULL)
    AND (status <> 'ACTIVE' OR password_hash IS NOT NULL)
);

CREATE TABLE assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruit_id      UUID NOT NULL REFERENCES users (id),
    manager_id      UUID NOT NULL REFERENCES users (id),
    assigned_by_id  UUID NOT NULL REFERENCES users (id),
    status          VARCHAR(20)  NOT NULL CHECK (status IN ('ACTIVE', 'REASSIGNED', 'ENDED')),
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    note            VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assignments_recruit_not_manager CHECK (recruit_id <> manager_id),
    CONSTRAINT assignments_ended_when_closed CHECK ((status = 'ACTIVE') = (ended_at IS NULL))
);

-- INV-04: at most one ACTIVE assignment per recruit.
CREATE UNIQUE INDEX assignments_one_active_per_recruit
    ON assignments (recruit_id) WHERE status = 'ACTIVE';

CREATE INDEX assignments_manager_active_idx ON assignments (manager_id) WHERE status = 'ACTIVE';
CREATE INDEX assignments_recruit_assigned_at_idx ON assignments (recruit_id, assigned_at DESC);
