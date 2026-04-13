-- [파일 용도] 매매 계획 메모 테이블 생성

CREATE TABLE trade_plans (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date   DATE NOT NULL,
    symbol      VARCHAR(30),
    direction   VARCHAR(10),  -- LONG, SHORT, null
    content     TEXT NOT NULL,
    done        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_plans_user_date ON trade_plans(user_id, plan_date DESC);
