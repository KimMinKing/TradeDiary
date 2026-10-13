ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_preferred_language_check;
ALTER TABLE users ADD CONSTRAINT users_preferred_language_check CHECK (preferred_language IN ('en', 'ko'));
ALTER TABLE news_daily_summary ADD COLUMN IF NOT EXISTS summary_en TEXT;
ALTER TABLE trader_type_advice ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'ko';
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS ai_feedback_language VARCHAR(2);
