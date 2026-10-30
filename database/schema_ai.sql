-- [파일 용도] AI 트레이딩 저널 전용 테이블
-- AI 챌린저, 감정 분석, 게임화 기능을 위한 테이블

-- =============================================
-- AI 챌린지 기록
-- =============================================
CREATE TABLE IF NOT EXISTS ai_challenges (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journal_id          BIGINT       REFERENCES trade_journals(id) ON DELETE CASCADE,

    -- 진입 전 챌린지 내용
    entry_thesis       TEXT         NOT NULL,  -- 기술적 가설
    target_price       DECIMAL(30,10),        -- 목표가
    stop_loss           DECIMAL(30,10),        -- 손절가
    risk_reward_ratio  DECIMAL(5,2),          -- 손익비

    -- 챌린지 결과
    was_completed       BOOLEAN      NOT NULL DEFAULT TRUE,  -- 완료 여부
    challenge_created_at TIMESTAMP  NOT NULL DEFAULT NOW(), -- 챌린지 생성 시점
    entry_confirmed    BOOLEAN      NOT NULL DEFAULT FALSE, -- 실제 진입 여부

    -- AI 피드백
    ai_feedback         TEXT,                   -- AI 분석 피드백
    is_irrational       BOOLEAN      NOT NULL DEFAULT FALSE -- 비이성적 진입 판단
);

-- =============================================
-- 사용자 감정 분석 기록
-- =============================================
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

-- =============================================
-- 행동 패턴 감지
-- =============================================
CREATE TABLE IF NOT EXISTS behavioral_patterns (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type        VARCHAR(50)  NOT NULL,  -- REVENGE_TRADING, FATIGUE_DRIFT, OVERCONFIDENCE, NORMAL
    detected_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    confidence_score    DECIMAL(3,2)  NOT NULL,

    -- 관련 데이터
    journal_id          BIGINT       REFERENCES trade_journals(id) ON DELETE CASCADE,
    description         TEXT         NOT NULL,

    -- 패턴 히스토리
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE
);

-- =============================================
-- 게임화 점수 및 성취도
-- =============================================
CREATE TABLE IF NOT EXISTS gamification_scores (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- 핵심 지표
    rule_adherence      DECIMAL(5,2)  NOT NULL DEFAULT 0,  -- 규율 준수도 (0-100)
    sharpe_ratio        DECIMAL(6,2)  NOT NULL DEFAULT 0,  -- 샤프 비율
    pnl_growth          DECIMAL(8,2)  NOT NULL DEFAULT 0,  -- 수익 성장률 (%)

    -- 점수 구성 요소
    total_score        INT          NOT NULL DEFAULT 0,
    rank               INT          NOT NULL DEFAULT 0,

    -- 업데이트 시점
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================
-- 사용자 업적 및 배지
-- =============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id      BIGINT       NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE
);

-- =============================================
-- 업정 정의
-- =============================================
CREATE TABLE IF NOT EXISTS achievements (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT         NOT NULL,
    icon               VARCHAR(50)  NOT NULL DEFAULT '🏆',
    condition_type     VARCHAR(20)  NOT NULL,  -- TRADE_COUNT, WIN_RATE, RULE_ADHERENCE, CONSECUTIVE_DAYS
    condition_value    DECIMAL(10,2) NOT NULL,
    category           VARCHAR(20)  NOT NULL DEFAULT 'DISCIPLINE'  -- DISCIPLINE, SKILL, CONSISTENCY
);

-- 업정 초기 데이터
INSERT INTO achievements (name, description, icon, condition_type, condition_value, category) VALUES
    -- 규율 관련
    ('Risk-Control Pro', '30일간 손실 한도를 100% 준수함', '🛡️', 'RULE_ADHERENCE', 100, 'DISCIPLINE'),
    ('Stop-loss Master', '10번의 손절 약속을 100% 지킴', '🎯', 'TRADE_COUNT', 10, 'DISCIPLINE'),
    ('Consistently Disciplined', '60일간 매일 일기 작성', '📝', 'CONSECUTIVE_DAYS', 60, 'DISCIPLINE'),

    -- 기술 관련
    ('Pattern Hunter', '100번의 차트 패턴 식별', '🔍', 'TRADE_COUNT', 100, 'SKILL'),
    ('Emotion Coach', '50번의 감정 분석 완료', '🧠', 'TRADE_COUNT', 50, 'SKILL'),
    ('Strategic Thinker', '승률 70% 달성 (최소 50회 거래)', '🎖️', 'WIN_RATE', 70, 'SKILL'),

    -- 지속성 관련
    ('Iron Will', '연속 30일 무손실', '💪', 'CONSECUTIVE_DAYS', 30, 'CONSISTENCY'),
    ('Steady Growth', '3개월 연속 수익', '📈', 'CONSECUTIVE_DAYS', 90, 'CONSISTENCY'),
    ('Champion', '전체 랭킹 상위 10%', '👑', 'RANK_PERCENTILE', 10, 'CONSISTENCY')
ON CONFLICT DO NOTHING;

-- =============================================
-- 거래소 레퍼럴 연동
-- =============================================
CREATE TABLE IF NOT EXISTS exchange_referrals (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange            VARCHAR(20)  NOT NULL,  -- BYBIT, BINANCE, OKX
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

-- =============================================
-- 카피 트레이딩 마켓플레이스
-- =============================================
CREATE TABLE IF NOT EXISTS copytrading_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- 프로필 정보
    profile_visibility  VARCHAR(20)  NOT NULL DEFAULT 'PUBLIC',  -- PUBLIC, PRIVATE
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

-- =============================================
-- 카피 트레이딩 구독 기록
-- =============================================
CREATE TABLE IF NOT EXISTS copytrading_subscriptions (
    id                  BIGSERIAL PRIMARY KEY,
    subscriber_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 구독 정보
    subscription_type   VARCHAR(20)  NOT NULL DEFAULT 'PERCENTAGE',  -- PERCENTAGE, FIXED
    subscription_rate  DECIMAL(6,2)  NOT NULL,  -- 수익의 % 또는 고정 금액
    start_date          TIMESTAMP    NOT NULL DEFAULT NOW(),
    end_date           TIMESTAMP,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,

    -- 성과 추적
    total_pnl_shared   DECIMAL(20,8) NOT NULL DEFAULT 0,
    payout_amount      DECIMAL(20,8) NOT NULL DEFAULT 0,

    UNIQUE (subscriber_id, provider_id)
);

-- =============================================
-- 인덱스 생성
-- =============================================
-- AI 챌린지: 사용자별 최근 순
CREATE INDEX IF NOT EXISTS idx_ai_challenges_user ON ai_challenges(user_id, challenge_created_at DESC);

-- 감정 분석: 사용자별 + 날짜별
CREATE INDEX IF NOT EXISTS idx_emotions_user_date ON emotion_analyses(user_id, analysis_date DESC);

-- 행동 패턴: 사용자별 활성 패턴
CREATE INDEX IF NOT EXISTS idx_patterns_user_active ON behavioral_patterns(user_id, is_active, detected_at DESC);

-- 게임화 점수: 사용자별
CREATE INDEX IF NOT EXISTS idx_gamification_user ON gamification_scores(user_id);

-- 업적: 사용자별 획득 업적
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id, earned_at DESC);

-- 레퍼럴: 사용자별 + 거래소별
CREATE INDEX IF NOT EXISTS idx_referrals_user_exchange ON exchange_referrals(user_id, exchange);

-- 카피 트레이딩: 제공자별
CREATE INDEX IF NOT EXISTS idx_copytrading_providers ON copytrading_subscriptions(provider_id);

-- =============================================
-- AI 트레이딩 저널용 샘플 데이터
-- =============================================
INSERT INTO checklist_items (user_id, category, content, sort_order) VALUES
    -- AI 챌린저 체크리스트
    (NULL, 'ENTRY', 'AI 챌린저 완료', 1),
    (NULL, 'ENTRY', '기술적 가설 명확히 설정', 2),
    (NULL, 'ENTRY', '손절가 설정 확인', 3),
    (NULL, 'ENTRY', '손익비 1.5 이상 확인', 4),

    -- 감정 관리 체크리스트
    (NULL, 'REVIEW', '감정 상태 기록', 1),
    (NULL, 'REVIEW', '뇌동매매 여부 확인', 2),
    (NULL, 'REVIEW', '복수 매매 경향성 점검', 3),
    (NULL, 'REVIEW', '피로도 수준 평가', 4)
ON CONFLICT DO NOTHING;