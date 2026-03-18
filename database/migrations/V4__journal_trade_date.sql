-- [마이그레이션] trade_journals 테이블에 trade_date 컬럼 추가
-- trade_date: 거래가 발생한 날짜 (작성일 created_at과 구분)

-- DEFAULT 를 먼저 붙여서 기존 레코드가 NULL 없이 추가됨
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS trade_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 기존 레코드: 작성일 날짜로 덮어씀
UPDATE trade_journals SET trade_date = created_at::date;
