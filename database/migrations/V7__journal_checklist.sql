-- [파일 용도] 매매 일기 체크리스트 기능 마이그레이션
-- 체크리스트 항목 정의 및 일기별 체크 상태 테이블 생성

-- 체크리스트 항목 정의
CREATE TABLE IF NOT EXISTS checklist_items (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,  -- NULL이면 시스템 기본 제공
    category        VARCHAR(20) NOT NULL,                          -- ENTRY(매수 전), EXIT(매도 전), REVIEW(복기)
    content         TEXT NOT NULL,                                -- 체크리스트 내용
    sort_order      INT NOT NULL DEFAULT 0,                       -- 정렬 순서
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,                -- 활성화 여부
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 일기별 체크리스트 체크 상태
CREATE TABLE IF NOT EXISTS journal_checklist (
    id              BIGSERIAL PRIMARY KEY,
    journal_id      BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    checklist_id    BIGINT NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    checked         BOOLEAN NOT NULL DEFAULT FALSE,               -- 체크 여부
    UNIQUE (journal_id, checklist_id)
);

-- 기본 체크리스트 시드 (user_id = NULL로 시스템 기본 제공)
INSERT INTO checklist_items (user_id, category, content, sort_order) VALUES
(NULL, 'ENTRY', '매수 기준(조건)이 충족되었는가?', 1),
(NULL, 'ENTRY', '손절가를 설정했는가?', 2),
(NULL, 'ENTRY', '포지션 사이즈가 적절한가?', 3),
(NULL, 'ENTRY', '리스크-리워드 비율이 1:2 이상인가?', 4),
(NULL, 'EXIT', '매도 기준(조건)에 도달했는가?', 5),
(NULL, 'EXIT', '욕심 때문에 늦게 매도하진 않았는가?', 6),
(NULL, 'EXIT', '손절가를 지켰는가?', 7),
(NULL, 'REVIEW', '계획대로 실행했는가?', 8),
(NULL, 'REVIEW', '감정이 판단에 영향을 미쳤는가?', 9),
(NULL, 'REVIEW', '다음에 개선할 점은?', 10)
ON CONFLICT (user_id, category, content) DO NOTHING;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_checklist_user_category ON checklist_items(user_id, category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_journal_checklist_journal ON journal_checklist(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_checklist_checklist ON journal_checklist(checklist_id);