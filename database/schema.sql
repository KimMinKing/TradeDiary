-- [파일 용도] TradeDiary DB 테이블 초기 생성 스크립트
-- Docker 컨테이너 최초 실행 시 자동으로 실행됨

-- =============================================
-- 사용자 계정
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    nickname        VARCHAR(50)  NOT NULL,
    avatar          TEXT,                                 -- base64 프로필 이미지 (~5KB 압축)
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
-- 기존 DB 마이그레이션
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

-- =============================================
-- JWT RefreshToken 저장
-- =============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(512) NOT NULL UNIQUE,
    expires_at      TIMESTAMP    NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 거래소 API Key (AES-256 암호화 저장)
-- =============================================
CREATE TABLE IF NOT EXISTS exchange_keys (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange        VARCHAR(20)  NOT NULL,  -- BYBIT, UPBIT
    api_key         VARCHAR(512) NOT NULL,  -- 암호화된 값
    secret_key      VARCHAR(512) NOT NULL,  -- 암호화된 값
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 거래 원본 데이터 (거래소에서 가져온 것)
-- =============================================
CREATE TABLE IF NOT EXISTS trades (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange        VARCHAR(20)    NOT NULL,  -- BYBIT, UPBIT
    exchange_trade_id VARCHAR(100) NOT NULL,  -- 거래소 고유 ID (중복 방지)
    symbol          VARCHAR(30)    NOT NULL,  -- 예: BTCUSDT
    side            VARCHAR(5)     NOT NULL,  -- BUY, SELL
    qty             DECIMAL(30,10) NOT NULL,
    price           DECIMAL(30,10) NOT NULL,
    fee             DECIMAL(30,10) NOT NULL DEFAULT 0,
    traded_at       TIMESTAMP      NOT NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, exchange, exchange_trade_id)
);

-- =============================================
-- 묶인 포지션 (trades를 묶은 것)
-- =============================================
CREATE TABLE IF NOT EXISTS positions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange        VARCHAR(20)    NOT NULL,
    symbol          VARCHAR(30)    NOT NULL,
    side            VARCHAR(5)     NOT NULL DEFAULT 'LONG',  -- LONG(매수), SHORT(매도)
    entry_price     DECIMAL(30,10) NOT NULL,  -- 평균 진입가
    exit_price      DECIMAL(30,10) NOT NULL,  -- 평균 청산가
    qty             DECIMAL(30,10) NOT NULL,
    pnl             DECIMAL(30,10) NOT NULL,  -- 손익 금액
    pnl_rate        DECIMAL(10,4)  NOT NULL,  -- 손익률 (%)
    opened_at       TIMESTAMP      NOT NULL,  -- 첫 거래 시각
    closed_at       TIMESTAMP      NOT NULL,  -- 마지막 거래 시각
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- =============================================
-- 전략 태그
-- =============================================
CREATE TABLE IF NOT EXISTS strategy_tags (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       REFERENCES users(id) ON DELETE CASCADE,  -- NULL이면 기본 제공 태그
    name            VARCHAR(50)  NOT NULL,
    color           VARCHAR(20)  NOT NULL DEFAULT '#00d4aa',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 매매 일기
-- =============================================
CREATE TABLE IF NOT EXISTS trade_journals (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id     BIGINT       REFERENCES positions(id) ON DELETE SET NULL,   -- 포지션 구현 후 연결
    trade_id        BIGINT       REFERENCES trades(id)    ON DELETE SET NULL,   -- 현재는 개별 거래에 연결
    trade_date      DATE         NOT NULL DEFAULT CURRENT_DATE,  -- 거래 발생 날짜 (캘린더 기준)
    symbol          VARCHAR(30),
    entry_reason    TEXT,                   -- 진입 이유
    exit_reason     TEXT,                   -- 청산 이유
    emotion         VARCHAR(20),            -- CALM, CONFIDENT, FOMO, GREEDY, FEARFUL, ANXIOUS
    memo            TEXT,                   -- 자유 메모
    image           TEXT,                   -- 첨부 이미지 (base64, JPEG 압축)
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),   -- 실제 작성일시
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 일기 ↔ 전략태그 다대다 매핑
CREATE TABLE IF NOT EXISTS journal_strategy_tags (
    id              BIGSERIAL PRIMARY KEY,
    journal_id      BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    tag_id          BIGINT NOT NULL REFERENCES strategy_tags(id)  ON DELETE CASCADE,
    UNIQUE (journal_id, tag_id)
);

-- 기존 trade_journals 마이그레이션
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS image TEXT;

-- 포지션 ↔ 전략태그 다대다 매핑 (포지션 구현 시 사용)
CREATE TABLE IF NOT EXISTS position_strategy_tags (
    position_id     BIGINT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    tag_id          BIGINT NOT NULL REFERENCES strategy_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (position_id, tag_id)
);

-- =============================================
-- 통계 캐시
-- =============================================
CREATE TABLE IF NOT EXISTS trade_stats (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type     VARCHAR(10)  NOT NULL,  -- DAY, WEEK, MONTH
    period_date     DATE         NOT NULL,
    total_trades    INT          NOT NULL DEFAULT 0,
    win_count       INT          NOT NULL DEFAULT 0,
    loss_count      INT          NOT NULL DEFAULT 0,
    total_pnl       DECIMAL(30,10) NOT NULL DEFAULT 0,
    win_rate        DECIMAL(5,2)   NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, period_type, period_date)
);

-- =============================================
-- 불꽃 성장 기록
-- =============================================
CREATE TABLE IF NOT EXISTS streak_records (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak  INT          NOT NULL DEFAULT 0,  -- 현재 연속 일수
    max_streak      INT          NOT NULL DEFAULT 0,  -- 최대 연속 일수
    last_trade_date DATE,
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 코인 뉴스 일별 AI 요약
-- =============================================
CREATE TABLE IF NOT EXISTS news_daily_summary (
    id              BIGSERIAL PRIMARY KEY,
    summary_date    DATE         NOT NULL UNIQUE,    -- 요약 대상 날짜 (YYYY-MM-DD)
    summary_ko      TEXT         NOT NULL,           -- Gemini 한국어 시장 요약 (3~4문장)
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
-- 기존 news_articles 테이블 제거 (마이그레이션)
DROP TABLE IF EXISTS news_articles;

-- =============================================
-- 월별 거래 목표
-- =============================================
CREATE TABLE IF NOT EXISTS monthly_goals (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month          VARCHAR(7)     NOT NULL,
    target_win_rate     DECIMAL(5,2),
    target_pnl          DECIMAL(20,2),
    target_trade_count  INT,
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, year_month)
);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id);

-- =============================================
-- 기본 전략 태그 데이터
-- =============================================
INSERT INTO strategy_tags (user_id, name) VALUES
    (NULL, '추세추종'),
    (NULL, '역추세'),
    (NULL, '브레이크아웃'),
    (NULL, '지지/저항'),
    (NULL, '이평선'),
    (NULL, '단타'),
    (NULL, '스윙'),
    (NULL, '뇌동매매')
ON CONFLICT DO NOTHING;

-- =============================================
-- 성능 최적화 인덱스
-- =============================================
-- 포지션: 사용자별 + 종료일 기준 (대시보드, 통계, 랭킹에서 핵심)
CREATE INDEX IF NOT EXISTS idx_positions_user_closed ON positions(user_id, closed_at DESC);

-- 거래 원본: 사용자별 + 거래일시 (동기화, 포지션 계산, 당일 거래 조회)
CREATE INDEX IF NOT EXISTS idx_trades_user_traded ON trades(user_id, traded_at DESC);

-- 매매 일기: 사용자별 + 거래 날짜 (캘린더, 일기 목록 필터)
CREATE INDEX IF NOT EXISTS idx_journals_user_date ON trade_journals(user_id, trade_date DESC);

-- 전략 태그 매핑: 일기별 태그 조회 (일기 응답 DTO 변환 시)
CREATE INDEX IF NOT EXISTS idx_jst_journal ON journal_strategy_tags(journal_id);

-- 거래: 사용자별 + 거래소 (동기화 시 중복 체크)
CREATE INDEX IF NOT EXISTS idx_trades_user_exchange ON trades(user_id, exchange);
