ALTER TABLE community_posts ADD COLUMN image TEXT;
ALTER TABLE community_posts ADD CONSTRAINT ck_community_posts_image_size
    CHECK (image IS NULL OR char_length(image) <= 2200000);
