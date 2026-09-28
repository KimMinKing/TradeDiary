-- [파일 용도] 공개 프로필의 데이터 종류별 노출 설정 분리
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats_public BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS positions_public BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trades_public BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assets_public BOOLEAN;

UPDATE users SET
    profile_public = COALESCE(profile_public, diary_public, FALSE),
    stats_public = COALESCE(stats_public, diary_public, FALSE),
    positions_public = COALESCE(positions_public, diary_public, FALSE),
    trades_public = COALESCE(trades_public, diary_public, FALSE),
    assets_public = COALESCE(assets_public, FALSE);

ALTER TABLE users ALTER COLUMN profile_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN stats_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN positions_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN trades_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN assets_public SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN profile_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN stats_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN positions_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN trades_public SET NOT NULL;
ALTER TABLE users ALTER COLUMN assets_public SET NOT NULL;
