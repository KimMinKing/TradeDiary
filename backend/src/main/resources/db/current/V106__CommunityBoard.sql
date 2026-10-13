CREATE TABLE community_posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_community_posts_title CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
    CONSTRAINT ck_community_posts_content CHECK (char_length(trim(content)) BETWEEN 1 AND 10000),
    CONSTRAINT ck_community_posts_counts CHECK (view_count >= 0 AND comment_count >= 0)
);

CREATE TABLE community_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_community_comments_content CHECK (char_length(trim(content)) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC, id DESC);
CREATE INDEX idx_community_posts_user ON community_posts(user_id, created_at DESC);
CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at, id);
CREATE INDEX idx_community_comments_user ON community_comments(user_id);
