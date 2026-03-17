-- [마이그레이션] 매매 일기 기능 테이블 추가 / 기존 DB에 직접 실행

-- strategy_tags: color 컬럼 추가
ALTER TABLE strategy_tags ADD COLUMN IF NOT EXISTS color VARCHAR(20) NOT NULL DEFAULT '#00d4aa';

-- trade_journals: 기존 테이블 재생성 (기존 데이터 없을 경우)
-- position_id NOT NULL → NULL 허용, trade_id / symbol / entry_reason / exit_reason 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trade_journals' AND column_name='entry_reason') THEN

        -- 기존 trade_journals 삭제 후 재생성 (데이터 없을 경우에만 안전)
        DROP TABLE IF EXISTS trade_journals;

        CREATE TABLE trade_journals (
            id              BIGSERIAL PRIMARY KEY,
            user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            position_id     BIGINT       REFERENCES positions(id) ON DELETE SET NULL,
            trade_id        BIGINT       REFERENCES trades(id)    ON DELETE SET NULL,
            symbol          VARCHAR(30),
            entry_reason    TEXT,
            exit_reason     TEXT,
            emotion         VARCHAR(20),
            memo            TEXT,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        );

    END IF;
END $$;

-- journal_strategy_tags 테이블 생성
CREATE TABLE IF NOT EXISTS journal_strategy_tags (
    id              BIGSERIAL PRIMARY KEY,
    journal_id      BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    tag_id          BIGINT NOT NULL REFERENCES strategy_tags(id)  ON DELETE CASCADE,
    UNIQUE (journal_id, tag_id)
);
