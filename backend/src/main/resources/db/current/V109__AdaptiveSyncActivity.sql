ALTER TABLE exchange_sync_state
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_exchange_sync_activity
    ON exchange_sync_state(last_activity_at);
