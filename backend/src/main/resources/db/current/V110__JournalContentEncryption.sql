ALTER TABLE trade_journals
    ADD COLUMN IF NOT EXISTS content_encryption_version SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS content_encrypted_at TIMESTAMP;

ALTER TABLE trade_journals ALTER COLUMN emotion TYPE TEXT;

CREATE INDEX IF NOT EXISTS idx_trade_journals_encryption_version
    ON trade_journals(content_encryption_version)
    WHERE content_encryption_version = 0;
