-- [파일 용도] 일기별 공개 범위와 안전한 이미지 조회를 위한 스키마 추가
ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS visibility VARCHAR(10);
UPDATE trade_journals journal SET visibility = CASE WHEN COALESCE(owner.diary_public, FALSE) THEN 'PUBLIC' ELSE 'PRIVATE' END
FROM users owner WHERE journal.user_id = owner.id AND journal.visibility IS NULL;
ALTER TABLE trade_journals ALTER COLUMN visibility SET DEFAULT 'PRIVATE';
ALTER TABLE trade_journals ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE trade_journals DROP CONSTRAINT IF EXISTS trade_journals_visibility_check;
ALTER TABLE trade_journals ADD CONSTRAINT trade_journals_visibility_check CHECK (visibility IN ('PRIVATE', 'PUBLIC'));
CREATE INDEX IF NOT EXISTS idx_journals_public_profile ON trade_journals(user_id, visibility, trade_date DESC, id DESC) WHERE visibility = 'PUBLIC';
