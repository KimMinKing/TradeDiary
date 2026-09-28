-- [파일 용도] 모든 DB 마이그레이션 실행 (컬럼 누락 해결)
-- 실행: docker exec -i tradediary-postgres psql -U tradediary -d tradediary < database/run_all_migrations.sql

-- users 테이블
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_assets DECIMAL(30,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS diary_public BOOLEAN;
UPDATE users SET diary_public = FALSE WHERE diary_public IS NULL;
ALTER TABLE users ALTER COLUMN diary_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN diary_public SET DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assets_updated_at TIMESTAMP;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- exchange_keys 테이블
ALTER TABLE exchange_keys ADD COLUMN IF NOT EXISTS passphrase VARCHAR(512);

-- positions 테이블
ALTER TABLE positions ADD COLUMN IF NOT EXISTS side VARCHAR(5) NOT NULL DEFAULT 'LONG';

-- trade_journals 테이블
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS trade_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS trade_refs_json TEXT;

-- strategy_tags 테이블
ALTER TABLE strategy_tags ADD COLUMN IF NOT EXISTS color VARCHAR(20) NOT NULL DEFAULT '#00d4aa';

-- 없는 테이블 생성
CREATE TABLE IF NOT EXISTS position_strategy_tags (
    position_id BIGINT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES strategy_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (position_id, tag_id)
);

CREATE TABLE IF NOT EXISTS trade_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(10) NOT NULL,
    period_date DATE NOT NULL,
    total_trades INT NOT NULL DEFAULT 0,
    win_count INT NOT NULL DEFAULT 0,
    loss_count INT NOT NULL DEFAULT 0,
    total_pnl DECIMAL(30,10) NOT NULL DEFAULT 0,
    win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    UNIQUE (user_id, period_type, period_date)
);

CREATE TABLE IF NOT EXISTS streak_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(20) NOT NULL,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_date DATE NOT NULL,
    UNIQUE (user_id, streak_type)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_daily_summary (
    id BIGSERIAL PRIMARY KEY,
    summary_date DATE NOT NULL UNIQUE,
    summary_en TEXT,
    summary_ko TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_month VARCHAR(7) NOT NULL,
    win_rate_goal DECIMAL(5,2),
    max_loss_goal DECIMAL(30,10),
    trade_count_goal INT,
    memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, goal_month)
);

CREATE TABLE IF NOT EXISTS trader_type_advice (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advice_text  TEXT         NOT NULL,
    generated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- journal_strategy_tags 유니크 제약
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_strategy_tags_journal_id_tag_id_key') THEN
    ALTER TABLE journal_strategy_tags ADD CONSTRAINT journal_strategy_tags_journal_id_tag_id_key UNIQUE (journal_id, tag_id);
  END IF;
END $$;

-- notifications type 체크 제약 최신화
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'TRADE_EXECUTED',
            'POSITION_OPENED',
            'POSITION_CLOSED',
            'PROFIT_TAKEN',
            'LOSS_CUT',
            'EXCHANGE_CONNECTED',
            'EXCHANGE_DISCONNECTED',
            'MARGIN_WARNING',
            'DAILY_SUMMARY',
            'WEEKLY_SUMMARY',
            'MONTHLY_SUMMARY',
            'AI_REPORT_READY',
            'NEWS_ALERT',
            'SYSTEM_ALERT',
            'FOLLOWER_TRADE'
        )
    );
