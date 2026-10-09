ALTER TABLE follows
    ADD COLUMN IF NOT EXISTS trade_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_follows_trade_alert_publishers
    ON follows(following_id)
    WHERE trade_alerts_enabled = TRUE;
