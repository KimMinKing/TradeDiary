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
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

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
    entry_price     DECIMAL(30,10) NOT NULL,  -- 평균 진입가
    exit_price      DECIMAL(30,10) NOT NULL,  -- 평균 청산가
    qty             DECIMAL(30,10) NOT NULL,
    pnl             DECIMAL(30,10) NOT NULL,  -- 손익 금액
    pnl_rate        DECIMAL(10,4)  NOT NULL,  -- 손익률 (%)
    opened_at       TIMESTAMP      NOT NULL,  -- 첫 매수 시각
    closed_at       TIMESTAMP      NOT NULL,  -- 마지막 매도 시각
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- =============================================
-- 매매 일기
-- =============================================
CREATE TABLE IF NOT EXISTS trade_journals (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id     BIGINT       NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    reason          TEXT,                   -- 진입 이유
    emotion         VARCHAR(20),            -- FEAR, GREED, NEUTRAL, CONFIDENT
    memo            TEXT,                   -- 자유 메모
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 전략 태그
-- =============================================
CREATE TABLE IF NOT EXISTS strategy_tags (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       REFERENCES users(id) ON DELETE CASCADE,  -- NULL이면 기본 제공 태그
    name            VARCHAR(50)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 포지션 ↔ 전략태그 다대다 매핑
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
