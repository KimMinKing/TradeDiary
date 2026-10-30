-- [파일 용도] 운영 데이터 무결성, 기본 데이터 및 조회 성능 보강

-- Repository가 단건을 전제로 하는 사용자별 거래소 키의 중복을 DB에서도 차단한다.
CREATE UNIQUE INDEX IF NOT EXISTS uk_exchange_keys_user_exchange
    ON exchange_keys(user_id, exchange);

-- 애플리케이션 enum과 DB 값을 일치시킨다.
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_side_check;
ALTER TABLE trades ADD CONSTRAINT trades_side_check CHECK (side IN ('BUY', 'SELL'));
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_side_check;
ALTER TABLE positions ADD CONSTRAINT positions_side_check CHECK (side IN ('LONG', 'SHORT'));

-- 초기 스키마에 있었지만 통합 마이그레이션 이전에는 누락될 수 있던 보조 테이블이다.
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
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, period_type, period_date)
);

CREATE TABLE IF NOT EXISTS streak_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INT NOT NULL DEFAULT 0,
    max_streak INT NOT NULL DEFAULT 0,
    last_trade_date DATE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 초기 수동 스키마에서 기본값 없이 만들어진 체크리스트 컬럼을 먼저 정규화한다.
UPDATE checklist_items SET is_active = TRUE WHERE is_active IS NULL;
UPDATE checklist_items SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE checklist_items ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE checklist_items ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE checklist_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE checklist_items ALTER COLUMN created_at SET NOT NULL;

-- NULL user_id에는 일반 UNIQUE 제약이 적용되지 않으므로 NOT EXISTS로 기본값을 멱등 삽입한다.
INSERT INTO strategy_tags (user_id, name, color)
SELECT NULL, seed.name, seed.color
FROM (VALUES
    ('추세추종', '#3b82f6'), ('역추세', '#8b5cf6'), ('브레이크아웃', '#06b6d4'),
    ('지지/저항', '#14b8a6'), ('이평선', '#22c55e'), ('단타', '#f59e0b'),
    ('스윙', '#ec4899'), ('뇌동매매', '#ef4444')
) AS seed(name, color)
WHERE NOT EXISTS (
    SELECT 1 FROM strategy_tags existing WHERE existing.user_id IS NULL AND existing.name = seed.name
);

INSERT INTO checklist_items (user_id, category, content, sort_order)
SELECT NULL, seed.category, seed.content, seed.sort_order
FROM (VALUES
    ('ENTRY', '매수 기준(조건)이 충족되었는가?', 10),
    ('ENTRY', '손절가를 설정했는가?', 20),
    ('ENTRY', '포지션 사이즈가 적절한가?', 30),
    ('ENTRY', '리스크-리워드 비율이 1:2 이상인가?', 40),
    ('EXIT', '매도 기준(조건)에 도달했는가?', 10),
    ('EXIT', '욕심 때문에 늦게 매도하진 않았는가?', 20),
    ('EXIT', '손절가를 지켰는가?', 30),
    ('REVIEW', '계획대로 실행했는가?', 10),
    ('REVIEW', '감정이 판단에 영향을 미쳤는가?', 20),
    ('REVIEW', '다음에 개선할 점은?', 30)
) AS seed(category, content, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM checklist_items existing
    WHERE existing.user_id IS NULL
      AND existing.category = seed.category
      AND existing.content = seed.content
);

-- 실제 Repository 조회 패턴과 일치하는 복합 인덱스다.
CREATE INDEX IF NOT EXISTS idx_exchange_keys_active ON exchange_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_trades_user_exchange_time ON trades(user_id, exchange, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_rebuild ON trades(user_id, exchange, symbol, traded_at, id);
CREATE INDEX IF NOT EXISTS idx_positions_user_exchange_closed ON positions(user_id, exchange, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_journals_user_exchange_date ON trade_journals(user_id, exchange, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_symbol_created ON notifications(user_id, symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_desc ON notifications(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_trade_stats_user_period ON trade_stats(user_id, period_type, period_date DESC);
