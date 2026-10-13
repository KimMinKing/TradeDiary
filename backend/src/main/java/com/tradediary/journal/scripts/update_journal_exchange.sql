-- trade_journals 테이블의 exchange 컬럼 NULL 값 업데이트 SQL

-- 1. NULL 값 개수 확인
SELECT 'NULL 값 개수 확인' as step, count(*) as count
FROM trade_journals
WHERE exchange IS NULL;

-- 2. trade_id가 있는 경우 해당 거래의 exchange 값으로 업데이트
UPDATE trade_journals j
SET exchange = t.exchange
FROM trades t
WHERE j.trade_id = t.id
  AND j.exchange IS NULL;

SELECT 'trade_id 기반 업데이트 완료' as step, ROW_COUNT() as updated;

-- 3. trade_id가 없고 symbol이 있는 경우 기본값으로 업데이트 (KRW-로 시작하는 거래는 Upbit로 간주)
UPDATE trade_journals j
SET exchange = 'UPBIT'
WHERE j.exchange IS NULL
  AND j.symbol IS NOT NULL
  AND j.symbol LIKE 'KRW-%';

SELECT 'symbol 기반 업데이트 완료' as step, ROW_COUNT() as updated;

-- 4. 나머지 NULL 값은 'UNKNOWN'으로 설정
UPDATE trade_journals j
SET exchange = 'UNKNOWN'
WHERE j.exchange IS NULL;

SELECT 'UNKNOWN 설정 완료' as step, ROW_COUNT() as updated;

-- 5. 최종 확인
SELECT '최종 NULL 값 개수' as step, count(*) as count
FROM trade_journals
WHERE exchange IS NULL;