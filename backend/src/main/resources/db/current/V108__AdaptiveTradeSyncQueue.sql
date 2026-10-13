CREATE TABLE portfolio_versions (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exchange_sync_state (
    id BIGSERIAL PRIMARY KEY,
    exchange_key_id BIGINT NOT NULL UNIQUE REFERENCES exchange_keys(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'IDLE',
    priority INTEGER NOT NULL DEFAULT 0,
    active_until TIMESTAMP,
    last_started_at TIMESTAMP,
    last_success_at TIMESTAMP,
    last_cursor_at TIMESTAMP,
    next_sync_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(500),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_exchange_sync_status CHECK (status IN ('IDLE','QUEUED','RUNNING','BACKOFF','ACTION_REQUIRED')),
    CONSTRAINT ck_exchange_sync_failure_count CHECK (failure_count >= 0)
);

CREATE INDEX idx_exchange_sync_due ON exchange_sync_state(status, next_sync_at, priority DESC);
CREATE INDEX idx_exchange_sync_user ON exchange_sync_state(user_id, exchange);

INSERT INTO portfolio_versions(user_id)
SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;

INSERT INTO exchange_sync_state(exchange_key_id, user_id, exchange, next_sync_at)
SELECT ek.id, ek.user_id, ek.exchange, CURRENT_TIMESTAMP
FROM exchange_keys ek WHERE ek.is_active = TRUE
ON CONFLICT (exchange_key_id) DO NOTHING;
