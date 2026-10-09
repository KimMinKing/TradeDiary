-- 알림 시스템 DDL
-- 파일명: 30-notification-ddl.sql
-- 작성일: 2024-06-20
-- 설명: 알림 관련 테이블 생성 스크립트

-- 1. 알림 테이블 생성
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    symbol VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_id VARCHAR(50),
    created_by VARCHAR(50) DEFAULT SYSTEM_USER
);

-- 2. 인덱스 생성
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_symbol ON notifications(symbol);
CREATE INDEX idx_notifications_related_id ON notifications(related_id);

-- 3. 제약조건
-- 사용자 ID 외래키 (users 테이블과 연결)
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 알림 타입 체크 제약조건
ALTER TABLE notifications
ADD CONSTRAINT chk_notification_type
CHECK (type IN (
    'TRADE_EXECUTED',
    'POSITION_OPENED',
    'POSITION_CLOSED',
    'PROFIT_TAKEN',
    'LOSS_CUT',
    'EXCHANGE_CONNECTED',
    'EXCHANGE_DISCONNECTED',
    'MARGIN_WARNING',
    'DAILY_SUMMARY',
    'WEEKLY_SUMMARY',
    'MONTHLY_SUMMARY',
    'AI_REPORT_READY',
    'NEWS_ALERT',
    'SYSTEM_ALERT'
));

-- 4. 설명 추가
COMMENT ON TABLE notifications IS '사용자 알림 테이블';
COMMENT ON COLUMN notifications.id IS '알림 ID';
COMMENT ON COLUMN notifications.user_id IS '사용자 ID';
COMMENT ON COLUMN notifications.type IS '알림 타입';
COMMENT ON COLUMN notifications.title IS '알림 제목';
COMMENT ON COLUMN notifications.message IS '알림 내용';
COMMENT ON COLUMN notifications.symbol IS '관련 코인 심볼';
COMMENT ON COLUMN notifications.created_at IS '알림 생성 시간';
COMMENT ON COLUMN notifications.read_at IS '알림 읽은 시간';
COMMENT ON COLUMN notifications.is_read IS '읽음 여부';
COMMENT ON COLUMN notifications.related_id IS '관련 데이터 ID (거래ID, 포지션ID 등)';