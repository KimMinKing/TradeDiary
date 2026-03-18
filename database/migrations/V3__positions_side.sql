-- [마이그레이션] positions 테이블 side 컬럼 추가 / 기존 DB에 직접 실행

ALTER TABLE positions ADD COLUMN IF NOT EXISTS side VARCHAR(5) NOT NULL DEFAULT 'LONG';
