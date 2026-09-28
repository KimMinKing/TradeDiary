ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(2) NOT NULL DEFAULT 'en';

ALTER TABLE follows
    ADD COLUMN IF NOT EXISTS trade_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_follows_trade_alert_publishers
    ON follows(following_id)
    WHERE trade_alerts_enabled = TRUE;
