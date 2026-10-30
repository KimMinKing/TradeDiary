-- [파일 용도] trade_journals 테이블의 exchange 컬럼 NULL 값 업데이트 스크립트

-- 1. NULL 값 확인
SELECT j.id, j.trade_id, j.symbol, j.exchange
FROM trade_journals j
WHERE j.exchange IS NULL
LIMIT 10;

-- 2. trade_id가 있는 경우 해당 거래의 exchange 값으로 업데이트
UPDATE trade_journals j
SET exchange = t.exchange
FROM trades t
WHERE j.trade_id = t.id
  AND j.exchange IS NULL;

-- 3. trade_id가 없고 symbol이 있는 경우 기본값으로 업데이트
UPDATE trade_journals j
SET exchange = 'UPBIT'
WHERE j.exchange IS NULL
  AND j.symbol IS NOT NULL
  AND j.symbol LIKE 'KRW-%';

-- 4. 나머지 NULL 값은 'UNKNOWN'으로 설정
UPDATE trade_journals j
SET exchange = 'UNKNOWN'
WHERE j.exchange IS NULL;

-- 5. 최종 확인
SELECT COUNT(*) AS null_count
FROM trade_journals j
WHERE j.exchange IS NULL;