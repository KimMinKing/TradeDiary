ALTER TABLE exchange_sync_state
    ADD COLUMN IF NOT EXISTS latest_ready BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS history_complete BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sync_phase VARCHAR(24) NOT NULL DEFAULT 'QUICK_SYNC';

-- Connections that existed before staged imports were introduced have already
-- completed their legacy historical import. Only newly inserted states start cold.
UPDATE exchange_sync_state
SET latest_ready = TRUE,
    history_complete = TRUE,
    sync_phase = 'READY';

ALTER TABLE exchange_sync_state
    ADD CONSTRAINT chk_exchange_sync_phase
    CHECK (sync_phase IN ('QUICK_SYNC','BACKFILL','READY'));
