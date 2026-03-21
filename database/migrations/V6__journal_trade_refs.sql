-- [마이그레이션] 일기에 다중 거래 참조 저장 컬럼 추가
-- trade_refs_json: 선택된 거래 스냅샷 JSON 배열
-- symbol: 다중 종목 지원을 위해 TEXT로 변경

ALTER TABLE trade_journals
    ADD COLUMN IF NOT EXISTS trade_refs_json TEXT;

ALTER TABLE trade_journals
    ALTER COLUMN symbol TYPE TEXT;
