-- S1: identity. Profile fields are columns on users (3NF), not a table or JSON.
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(254) NOT NULL,
    password_hash  VARCHAR(255),
    role           VARCHAR(20)  NOT NULL CHECK (role IN ('NEW_RECRUIT', 'MANAGER', 'ADMIN')),
    status         VARCHAR(20)  NOT NULL CHECK (status IN ('INVITED', 'ACTIVE', 'DEACTIVATED')),
    full_name      VARCHAR(100) NOT NULL,
    department     VARCHAR(100),
    start_date     DATE,
    created_by_id  UUID REFERENCES users (id),
    invited_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    activated_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT users_invited_has_no_password CHECK ((status = 'INVITED') = (password_hash IS NULL))
);

CREATE UNIQUE INDEX users_email_uq ON users (email);
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_status_idx ON users (status);
