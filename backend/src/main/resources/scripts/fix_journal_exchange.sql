-- trade_journals 테이블의 exchange 컬럼 NULL 값 제거 스크립트

-- 1. NULL 값 있는 데이터 확인
SELECT 'NULL 값 확인' as step, count(*) as count
FROM trade_journals
WHERE exchange IS NULL;

-- 2. trade_id가 있는 경우 해당 거래의 exchange 값으로 업데이트
UPDATE trade_journals j
SET exchange = t.exchange
FROM trades t
WHERE j.trade_id = t.id
  AND j.exchange IS NULL;

-- 3. trade_id가 없고 symbol이 있는 경우 UPBIT로 설정
UPDATE trade_journals j
SET exchange = 'UPBIT'
WHERE j.exchange IS NULL
  AND j.symbol IS NOT NULL
  AND j.symbol LIKE 'KRW-%';

-- 4. 나머지는 UNKNOWN으로 설정
UPDATE trade_journals j
SET exchange = 'UNKNOWN'
WHERE j.exchange IS NULL;

-- 5. 최종 확인
SELECT '최종 확인' as step, count(*) as count
FROM trade_journals
WHERE exchange IS NULL;