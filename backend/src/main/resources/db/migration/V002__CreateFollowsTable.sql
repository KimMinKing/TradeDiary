-- [파일 용도] 팔로우 기능을 위한 follows 테이블 생성

-- 팔로우 테이블 생성
CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 자기 자신 팔로우 방지 체크 제약조건
ALTER TABLE follows ADD CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id);
