-- [파일 용도] 트레이더 유형 AI 코칭 결과 캐싱 테이블 추가

CREATE TABLE IF NOT EXISTS trader_type_advice (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advice_text  TEXT         NOT NULL,                       -- AI 코칭 요약 전문 (마크다운)
    generated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);
