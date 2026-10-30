-- [파일 용도] 기존 수동 스키마를 Flyway 기준선 이후의 현재 애플리케이션 스키마로 통합

-- 신규 DB에서도 동일한 마이그레이션 경로를 사용하도록 핵심 테이블을 먼저 생성한다.
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, email VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255),
    nickname VARCHAR(50) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS exchange_keys (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, api_key VARCHAR(512) NOT NULL, secret_key VARCHAR(512) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, exchange_trade_id VARCHAR(100) NOT NULL,
    symbol VARCHAR(30) NOT NULL, side VARCHAR(5) NOT NULL, qty DECIMAL(30,10) NOT NULL,
    price DECIMAL(30,10) NOT NULL, fee DECIMAL(30,10) NOT NULL DEFAULT 0,
    traded_at TIMESTAMP NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, exchange, exchange_trade_id)
);
CREATE TABLE IF NOT EXISTS positions (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, symbol VARCHAR(30) NOT NULL,
    entry_price DECIMAL(30,10) NOT NULL, exit_price DECIMAL(30,10) NOT NULL,
    qty DECIMAL(30,10) NOT NULL, pnl DECIMAL(30,10) NOT NULL, pnl_rate DECIMAL(10,4) NOT NULL,
    opened_at TIMESTAMP NOT NULL, closed_at TIMESTAMP NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS strategy_tags (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS trade_journals (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id BIGINT REFERENCES positions(id) ON DELETE SET NULL,
    trade_id BIGINT REFERENCES trades(id) ON DELETE SET NULL, symbol VARCHAR(30),
    entry_reason TEXT, exit_reason TEXT, emotion VARCHAR(20), memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS news_daily_summary (
    id BIGSERIAL PRIMARY KEY, summary_date DATE NOT NULL UNIQUE, summary_ko TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_assets DECIMAL(30,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS diary_public BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assets_updated_at TIMESTAMP;
UPDATE users SET diary_public = FALSE WHERE diary_public IS NULL;
ALTER TABLE users ALTER COLUMN diary_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN diary_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_kakao_id ON users(kakao_id) WHERE kakao_id IS NOT NULL;

ALTER TABLE exchange_keys ADD COLUMN IF NOT EXISTS passphrase VARCHAR(512);
ALTER TABLE exchange_keys ADD COLUMN IF NOT EXISTS last_trade_notified_at TIMESTAMP;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS side VARCHAR(5) NOT NULL DEFAULT 'LONG';
ALTER TABLE positions ADD COLUMN IF NOT EXISTS trade_id BIGINT REFERENCES trades(id) ON DELETE SET NULL;
ALTER TABLE strategy_tags ADD COLUMN IF NOT EXISTS color VARCHAR(20) NOT NULL DEFAULT '#00d4aa';

ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS exchange VARCHAR(20);
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS trade_date DATE;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS trade_refs_json TEXT;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS ai_feedback TEXT;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS ai_feedback_updated_at TIMESTAMP;
ALTER TABLE trade_journals ALTER COLUMN symbol TYPE TEXT;
UPDATE trade_journals journal SET exchange = trade.exchange FROM trades trade
WHERE journal.trade_id = trade.id AND journal.exchange IS NULL;
UPDATE trade_journals SET exchange = CASE WHEN symbol LIKE 'KRW-%' THEN 'UPBIT' ELSE 'BYBIT' END
WHERE exchange IS NULL;
UPDATE trade_journals SET trade_date = created_at::date WHERE trade_date IS NULL;
ALTER TABLE trade_journals ALTER COLUMN exchange SET DEFAULT 'UPBIT';
ALTER TABLE trade_journals ALTER COLUMN exchange SET NOT NULL;
ALTER TABLE trade_journals ALTER COLUMN trade_date SET DEFAULT CURRENT_DATE;
ALTER TABLE trade_journals ALTER COLUMN trade_date SET NOT NULL;

CREATE TABLE IF NOT EXISTS journal_strategy_tags (
    id BIGSERIAL PRIMARY KEY, journal_id BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES strategy_tags(id) ON DELETE CASCADE, UNIQUE (journal_id, tag_id)
);
CREATE TABLE IF NOT EXISTS checklist_items (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL, content TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journal_checklist (
    id BIGSERIAL PRIMARY KEY, journal_id BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    checklist_id BIGINT NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    checked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (journal_id, checklist_id)
);
ALTER TABLE journal_checklist ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
UPDATE journal_checklist SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE journal_checklist ALTER COLUMN created_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS trade_plans (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL, symbol VARCHAR(30), direction VARCHAR(10), content TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS monthly_goals (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, target_win_rate DECIMAL(5,2), target_pnl DECIMAL(20,2),
    target_trade_count INT, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, year_month)
);
ALTER TABLE monthly_goals ADD COLUMN IF NOT EXISTS year_month VARCHAR(7);
ALTER TABLE monthly_goals ADD COLUMN IF NOT EXISTS target_win_rate DECIMAL(5,2);
ALTER TABLE monthly_goals ADD COLUMN IF NOT EXISTS target_pnl DECIMAL(20,2);
ALTER TABLE monthly_goals ADD COLUMN IF NOT EXISTS target_trade_count INT;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'monthly_goals' AND column_name = 'goal_month') THEN
        EXECUTE 'UPDATE monthly_goals SET year_month = goal_month WHERE year_month IS NULL';
    END IF;
END $$;
UPDATE monthly_goals SET year_month = TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM') WHERE year_month IS NULL;
ALTER TABLE monthly_goals ALTER COLUMN year_month SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_monthly_goals_user_month ON monthly_goals(user_id, year_month);
CREATE TABLE IF NOT EXISTS trader_type_advice (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advice_text TEXT NOT NULL, generated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE (user_id)
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY, follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), last_follower_trade_notified_at TIMESTAMP,
    UNIQUE (follower_id, following_id), CHECK (follower_id <> following_id)
);
ALTER TABLE follows ADD COLUMN IF NOT EXISTS last_follower_trade_notified_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, title VARCHAR(500) NOT NULL, message VARCHAR(1000) NOT NULL,
    symbol VARCHAR(100), created_at TIMESTAMP NOT NULL DEFAULT NOW(), read_at TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE, related_id VARCHAR(255) NOT NULL
);
ALTER TABLE notifications ALTER COLUMN related_id TYPE VARCHAR(255);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'TRADE_EXECUTED', 'POSITION_OPENED', 'POSITION_CLOSED', 'PROFIT_TAKEN', 'LOSS_CUT',
    'EXCHANGE_CONNECTED', 'EXCHANGE_DISCONNECTED', 'MARGIN_WARNING', 'DAILY_SUMMARY',
    'WEEKLY_SUMMARY', 'MONTHLY_SUMMARY', 'AI_REPORT_READY', 'NEWS_ALERT', 'SYSTEM_ALERT', 'FOLLOWER_TRADE'
));

CREATE INDEX IF NOT EXISTS idx_trades_user_traded ON trades(user_id, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_exchange ON trades(user_id, exchange);
CREATE INDEX IF NOT EXISTS idx_positions_user_closed ON positions(user_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_journals_user_date ON trade_journals(user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_journals_exchange ON trade_journals(exchange);
CREATE INDEX IF NOT EXISTS idx_journal_tags_journal ON journal_strategy_tags(journal_id);
CREATE INDEX IF NOT EXISTS idx_checklist_user_category ON checklist_items(user_id, category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_journal_checklist_journal ON journal_checklist(journal_id);
CREATE INDEX IF NOT EXISTS idx_trade_plans_user_date ON trade_plans(user_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
