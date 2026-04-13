-- [파일 용도] 월별 거래 목표 테이블 추가

CREATE TABLE IF NOT EXISTS monthly_goals (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month          VARCHAR(7)     NOT NULL,  -- 예: "2024-01"
    target_win_rate     DECIMAL(5,2),             -- 목표 승률 (%)
    target_pnl          DECIMAL(20,2),            -- 목표 수익 금액
    target_trade_count  INT,                      -- 목표 거래 횟수
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id);
