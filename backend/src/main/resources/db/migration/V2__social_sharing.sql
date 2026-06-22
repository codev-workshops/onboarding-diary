CREATE TABLE social_connections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    access_token VARCHAR(1024) NOT NULL,
    refresh_token VARCHAR(1024),
    platform_user_id VARCHAR(255),
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

CREATE TABLE share_history (
    id BIGSERIAL PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    shared_at TIMESTAMP NOT NULL DEFAULT NOW(),
    post_url VARCHAR(1024)
);

CREATE INDEX idx_social_connections_user_id ON social_connections(user_id);
CREATE INDEX idx_share_history_entry_id ON share_history(entry_id);
CREATE INDEX idx_share_history_user_id ON share_history(user_id);
