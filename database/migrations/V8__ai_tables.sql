-- [파일 용도] AI 트레이딩 저널 테이블 마이그레이션 V8

-- AI 챌린지 테이블 생성
CREATE TABLE IF NOT EXISTS ai_challenges (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journal_id          BIGINT       REFERENCES trade_journals(id) ON DELETE CASCADE,

    -- 진입 전 챌린지 내용
    entry_thesis       TEXT         NOT NULL,
    target_price       DECIMAL(30,10),
    stop_loss           DECIMAL(30,10),
    risk_reward_ratio  DECIMAL(5,2)          DEFAULT 0,

    -- 챌린지 결과
    was_completed       BOOLEAN      NOT NULL DEFAULT TRUE,
    challenge_created_at TIMESTAMP  NOT NULL DEFAULT NOW(),
    entry_confirmed    BOOLEAN      NOT NULL DEFAULT FALSE,

    -- AI 피드백
    ai_feedback         TEXT,
    is_irrational       BOOLEAN      NOT NULL DEFAULT FALSE
);

-- 감정 분석 테이블 생성
CREATE TABLE IF NOT EXISTS emotion_analyses (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journal_id          BIGINT       REFERENCES trade_journals(id) ON DELETE CASCADE,

    -- 감정 수치 (0-1 사이)
    fear                DECIMAL(3,2)  NOT NULL DEFAULT 0,
    greed               DECIMAL(3,2)  NOT NULL DEFAULT 0,
    frustration        DECIMAL(3,2)  NOT NULL DEFAULT 0,
    confidence         DECIMAL(3,2)  NOT NULL DEFAULT 0,
    fomo               DECIMAL(3,2)  NOT NULL DEFAULT 0,
    fatigue            DECIMAL(3,2)  NOT NULL DEFAULT 0,
    neutral            DECIMAL(3,2)  NOT NULL DEFAULT 0,

    -- 감정 상태
    dominant_emotion   VARCHAR(20)  NOT NULL,
    analysis_date      TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- AI 분석 텍스트
    analyzed_text      TEXT         NOT NULL
);

-- 게임화 점수 테이블 생성
CREATE TABLE IF NOT EXISTS gamification_scores (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- 핵심 지표
    rule_adherence      DECIMAL(5,2)  NOT NULL DEFAULT 0,
    sharpe_ratio        DECIMAL(6,2)  NOT NULL DEFAULT 0,
    pnl_growth          DECIMAL(8,2)  NOT NULL DEFAULT 0,

    -- 점수 구성 요소
    total_score        INT          NOT NULL DEFAULT 0,
    rank               INT          NOT NULL DEFAULT 0,

    -- 업데이트 시점
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 업정 테이블 생성
CREATE TABLE IF NOT EXISTS achievements (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT         NOT NULL,
    icon               VARCHAR(50)  NOT NULL DEFAULT '🏆',
    condition_type     VARCHAR(20)  NOT NULL,
    condition_value    DECIMAL(10,2) NOT NULL,
    category           VARCHAR(20)  NOT NULL DEFAULT 'DISCIPLINE'
);

-- 사용자 업정 테이블 생성
CREATE TABLE IF NOT EXISTS user_achievements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id      BIGINT       NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (user_id, achievement_id)
);

-- 거래소 레퍼럴 테이블 생성
CREATE TABLE IF NOT EXISTS exchange_referrals (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange            VARCHAR(20)  NOT NULL,
    referral_code       VARCHAR(100) NOT NULL,
    referral_link       TEXT         NOT NULL,

    -- 연동 상태
    is_linked           BOOLEAN      NOT NULL DEFAULT FALSE,
    linked_at           TIMESTAMP,
    last_trade_date     TIMESTAMP,

    -- 수익 배분
    total_referral_fee  DECIMAL(20,8) NOT NULL DEFAULT 0,
    usdc_balance        DECIMAL(20,8) NOT NULL DEFAULT 0,

    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 카피 트레이딩 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS copytrading_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- 프로필 정보
    profile_visibility  VARCHAR(20)  NOT NULL DEFAULT 'PUBLIC',
    monthly_return      DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_trades       INT          NOT NULL DEFAULT 0,
    win_rate           DECIMAL(5,2)  NOT NULL DEFAULT 0,
    sharpe_ratio       DECIMAL(6,2)  NOT NULL DEFAULT 0,

    -- 검증 상태
    is_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    verification_date   TIMESTAMP,
    verification_url    TEXT         UNIQUE,

    -- 구독자 정보
    subscriber_count    INT          NOT NULL DEFAULT 0,
    monthly_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,

    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 카피 트레이딩 구독 테이블 생성
CREATE TABLE IF NOT EXISTS copytrading_subscriptions (
    id                  BIGSERIAL PRIMARY KEY,
    subscriber_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 구독 정보
    subscription_type   VARCHAR(20)  NOT NULL DEFAULT 'PERCENTAGE',
    subscription_rate  DECIMAL(6,2)  NOT NULL,
    start_date          TIMESTAMP    NOT NULL DEFAULT NOW(),
    end_date           TIMESTAMP,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,

    -- 성과 추적
    total_pnl_shared   DECIMAL(20,8) NOT NULL DEFAULT 0,
    payout_amount      DECIMAL(20,8) NOT NULL DEFAULT 0,

    UNIQUE (subscriber_id, provider_id)
);

-- 기본 업정 데이터 삽입
INSERT INTO achievements (name, description, icon, condition_type, condition_value, category) VALUES
    ('Risk-Control Pro', '30일간 손실 한도를 100% 준수함', '🛡️', 'RULE_ADHERENCE', 100, 'DISCIPLINE'),
    ('Stop-loss Master', '10번의 손절 약속을 100% 지킴', '🎯', 'TRADE_COUNT', 10, 'DISCIPLINE'),
    ('Consistently Disciplined', '60일간 매일 일기 작성', '📝', 'CONSECUTIVE_DAYS', 60, 'DISCIPLINE'),
    ('Pattern Hunter', '100번의 차트 패턴 식별', '🔍', 'TRADE_COUNT', 100, 'SKILL'),
    ('Emotion Coach', '50번의 감정 분석 완료', '🧠', 'TRADE_COUNT', 50, 'SKILL'),
    ('Strategic Thinker', '승률 70% 달성 (최소 50회 거래)', '🎖️', 'WIN_RATE', 70, 'SKILL'),
    ('Iron Will', '연속 30일 무손실', '💪', 'CONSECUTIVE_DAYS', 30, 'CONSISTENCY'),
    ('Steady Growth', '3개월 연속 수익', '📈', 'CONSECUTIVE_DAYS', 90, 'CONSISTENCY'),
    ('Champion', '전체 랭킹 상위 10%', '👑', 'RANK_PERCENTILE', 10, 'CONSISTENCY')
ON CONFLICT DO NOTHING;

-- AI 챌린저 체크리스트 항목 삽입
INSERT INTO checklist_items (user_id, category, content, sort_order) VALUES
    (NULL, 'ENTRY', 'AI 챌린저 완료', 1),
    (NULL, 'ENTRY', '기술적 가설 명확히 설정', 2),
    (NULL, 'ENTRY', '손절가 설정 확인', 3),
    (NULL, 'ENTRY', '손익비 1.5 이상 확인', 4),
    (NULL, 'REVIEW', '감정 상태 기록', 1),
    (NULL, 'REVIEW', '뇌동매매 여부 확인', 2),
    (NULL, 'REVIEW', '복수 매매 경향성 점검', 3),
    (NULL, 'REVIEW', '피로도 수준 평가', 4)
ON CONFLICT DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_challenges_user ON ai_challenges(user_id, challenge_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotions_user_date ON emotion_analyses(user_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_user ON gamification_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_user_exchange ON exchange_referrals(user_id, exchange);
CREATE INDEX IF NOT EXISTS idx_copytrading_providers ON copytrading_subscriptions(provider_id);