-- [마이그레이션] trade_journals 테이블에 exchange 컬럼 추가 및 NOT NULL 제약조건 설정

-- exchange 컬럼 추가 (기본값으로 초기화)
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS exchange VARCHAR(20) NOT NULL DEFAULT 'UPBIT';

-- NULL 값 처리
-- 1. trade_id가 있는 경우 해당 거래의 exchange 값으로 업데이트
UPDATE trade_journals j
SET exchange = t.exchange
FROM trades t
WHERE j.trade_id = t.id
  AND j.exchange = 'UPBIT';  -- 기본값이면서 실제 exchange 값이 있을 경우

-- 2. symbol이 있는 경우 기본값 설정 (KRW 접두사는 UPBIT, 그 외는 BYBIT)
UPDATE trade_journals j
SET exchange = CASE
    WHEN j.symbol LIKE 'KRW-%' THEN 'UPBIT'
    WHEN j.symbol LIKE '%USDT' THEN 'BYBIT'
    ELSE 'UPBIT'
END
WHERE j.exchange = 'UPBIT'
  AND j.symbol IS NOT NULL;

-- 3. 나머지는 기본값 그대로 유지

-- 최종 확인
SELECT COUNT(*) AS total_count,
       COUNT(CASE WHEN exchange IS NULL THEN 1 END) AS null_count,
       COUNT(DISTINCT exchange) AS unique_exchanges
FROM trade_journals;

-- 인덱스 추가 (선택 사항)
CREATE INDEX IF NOT EXISTS idx_trade_journals_exchange ON trade_journals(exchange);