-- [파일 용도] 테스트 계정(test@test.com / test) + OKX 더미 데이터
-- 실행: docker exec -i tradediary-postgres psql -U tradediary -d tradediary < database/seed_test_account.sql

BEGIN;

-- =============================================
-- 기존 테스트 데이터 삭제 (재실행 안전)
-- =============================================
DELETE FROM journal_strategy_tags WHERE journal_id IN (SELECT id FROM trade_journals WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com'));
DELETE FROM trade_journals WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM strategy_tags WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM positions WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM trades WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM exchange_keys WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'test@test.com');
DELETE FROM users WHERE email = 'test@test.com';

-- =============================================
-- 테스트 유저 생성
-- 비밀번호: test (BCrypt hash)
-- =============================================
INSERT INTO users (email, password, nickname, created_at, updated_at) VALUES
('test@test.com', '$2a$10$m0KPaeckMT6NxEDRs8/zsex2RVdtlnfnIlx0fuE4NvgcgRLMYIe1G', '테스트트레이더', NOW(), NOW());

-- diary_public 컬럼이 있으면 업데이트
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'diary_public') THEN
    UPDATE users SET diary_public = TRUE WHERE email = 'test@test.com';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_assets') THEN
    UPDATE users SET total_assets = 15420.00 WHERE email = 'test@test.com';
  END IF;
END $$;

-- =============================================
-- OKX 거래소 키 (더미, UI에 OKX 뜨도록)
-- =============================================
INSERT INTO exchange_keys (user_id, exchange, api_key, secret_key, passphrase, is_active, created_at) VALUES
((SELECT id FROM users WHERE email = 'test@test.com'), 'OKX',
 'dummy-encrypted-api-key-for-test-account',
 'dummy-encrypted-secret-key-for-test-account',
 'dummy-passphrase', TRUE, NOW());

-- =============================================
-- OKX 거래 내역 (trades) — 2026년 3월~5월
-- 각 포지션은 BUY+SELL 페어 (net position = 0)
-- =============================================
INSERT INTO trades (user_id, exchange, exchange_trade_id, symbol, side, qty, price, fee, traded_at, created_at) VALUES

-- ── 3월 포지션 ──────────────────────────────────────

-- #1 BTC-USDT-SWAP LONG 승 (3/1~3/1)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-001', 'BTC-USDT-SWAP', 'BUY',  0.010, 86000,  0.50, '2026-03-01 09:30:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-002', 'BTC-USDT-SWAP', 'SELL', 0.010, 88500,  0.50, '2026-03-01 14:20:00', NOW()),

-- #2 ETH-USDT-SWAP LONG 패 (3/3~3/3)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-003', 'ETH-USDT-SWAP', 'BUY',  2.000, 2250,   2.50, '2026-03-03 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-004', 'ETH-USDT-SWAP', 'SELL', 2.000, 2180,   2.50, '2026-03-03 16:30:00', NOW()),

-- #3 SOL-USDT LONG 승 (3/5~3/5) — 매수 2회로 평단가 낮춤
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-005', 'SOL-USDT', 'BUY',  30.000, 135,    0.20, '2026-03-05 08:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-006', 'SOL-USDT', 'BUY',  20.000, 132,    0.20, '2026-03-05 11:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-007', 'SOL-USDT', 'SELL', 50.000, 148,    0.30, '2026-03-05 18:00:00', NOW()),

-- #4 BTC-USDT-SWAP SHORT 승 (3/7~3/8)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-008', 'BTC-USDT-SWAP', 'SELL', 0.010, 88000,  0.50, '2026-03-07 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-009', 'BTC-USDT-SWAP', 'BUY',  0.010, 87000,  0.50, '2026-03-08 09:00:00', NOW()),

-- #5 DOGE-USDT LONG 패 (3/10~3/11)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-010', 'DOGE-USDT', 'BUY',  10000.000, 0.220, 1.00, '2026-03-10 07:30:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-011', 'DOGE-USDT', 'SELL', 10000.000, 0.200, 1.00, '2026-03-11 08:00:00', NOW()),

-- #6 ETH-USDT-SWAP LONG 승 (3/13~3/14)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-012', 'ETH-USDT-SWAP', 'BUY',  1.500, 2300,   2.00, '2026-03-13 11:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-013', 'ETH-USDT-SWAP', 'SELL', 1.500, 2500,   2.00, '2026-03-14 15:00:00', NOW()),

-- #7 BTC-USDT-SWAP LONG 패 (3/17~3/18)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-014', 'BTC-USDT-SWAP', 'BUY',  0.020, 87500,  1.00, '2026-03-17 09:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-015', 'BTC-USDT-SWAP', 'SELL', 0.020, 86000,  1.00, '2026-03-18 10:30:00', NOW()),

-- ── 4월 포지션 ──────────────────────────────────────

-- #8 SOL-USDT LONG 승 (4/1~4/2)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-016', 'SOL-USDT', 'BUY',  30.000, 140,    0.20, '2026-04-01 08:30:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-017', 'SOL-USDT', 'SELL', 30.000, 158,    0.20, '2026-04-02 14:00:00', NOW()),

-- #9 BTC-USDT-SWAP LONG 승 (4/4~4/5)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-018', 'BTC-USDT-SWAP', 'BUY',  0.010, 89000,  0.50, '2026-04-04 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-019', 'BTC-USDT-SWAP', 'SELL', 0.010, 92000,  0.50, '2026-04-05 16:00:00', NOW()),

-- #10 ETH-USDT-SWAP SHORT 패 (4/7~4/8)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-020', 'ETH-USDT-SWAP', 'SELL', 1.000, 2600,   1.50, '2026-04-07 09:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-021', 'ETH-USDT-SWAP', 'BUY',  1.000, 2750,   1.50, '2026-04-08 11:00:00', NOW()),

-- #11 DOGE-USDT LONG 승 (4/10~4/12)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-022', 'DOGE-USDT', 'BUY',  15000.000, 0.210, 1.50, '2026-04-10 07:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-023', 'DOGE-USDT', 'SELL', 15000.000, 0.250, 1.50, '2026-04-12 13:00:00', NOW()),

-- #12 BTC-USDT-SWAP LONG 패 (4/14~4/15)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-024', 'BTC-USDT-SWAP', 'BUY',  0.015, 93000,  0.80, '2026-04-14 10:30:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-025', 'BTC-USDT-SWAP', 'SELL', 0.015, 91000,  0.80, '2026-04-15 09:00:00', NOW()),

-- #13 SOL-USDT LONG 승 (4/17~4/18)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-026', 'SOL-USDT', 'BUY',  25.000, 155,    0.20, '2026-04-17 11:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-027', 'SOL-USDT', 'SELL', 25.000, 170,    0.20, '2026-04-18 15:30:00', NOW()),

-- #14 ETH-USDT-SWAP LONG 승 (4/20~4/22)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-028', 'ETH-USDT-SWAP', 'BUY',  2.000, 2700,   3.00, '2026-04-20 09:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-029', 'ETH-USDT-SWAP', 'SELL', 2.000, 2900,   3.00, '2026-04-22 14:00:00', NOW()),

-- #15 BTC-USDT-SWAP SHORT 패 (4/24~4/25)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-030', 'BTC-USDT-SWAP', 'SELL', 0.010, 92000,  0.50, '2026-04-24 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-031', 'BTC-USDT-SWAP', 'BUY',  0.010, 93500,  0.50, '2026-04-25 11:00:00', NOW()),

-- ── 5월 포지션 ──────────────────────────────────────

-- #16 SOL-USDT LONG 승 (5/1~5/2)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-032', 'SOL-USDT', 'BUY',  20.000, 165,    0.15, '2026-05-01 08:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-033', 'SOL-USDT', 'SELL', 20.000, 180,    0.15, '2026-05-02 15:00:00', NOW()),

-- #17 BTC-USDT-SWAP LONG 승 (5/4~5/4)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-034', 'BTC-USDT-SWAP', 'BUY',  0.010, 94000,  0.50, '2026-05-04 09:30:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-035', 'BTC-USDT-SWAP', 'SELL', 0.010, 97000,  0.50, '2026-05-04 17:00:00', NOW()),

-- #18 DOGE-USDT LONG 패 (5/3~5/5)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-036', 'DOGE-USDT', 'BUY',  12000.000, 0.240, 1.20, '2026-05-03 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-037', 'DOGE-USDT', 'SELL', 12000.000, 0.220, 1.20, '2026-05-05 09:00:00', NOW()),

-- #19 ETH-USDT-SWAP LONG 승 (5/3~5/5) — 분할 매수
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-038', 'ETH-USDT-SWAP', 'BUY',  1.000, 2800,   1.50, '2026-05-03 14:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-039', 'ETH-USDT-SWAP', 'BUY',  0.500, 2750,   0.80, '2026-05-04 08:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-040', 'ETH-USDT-SWAP', 'SELL', 1.500, 3100,   2.00, '2026-05-05 16:00:00', NOW()),

-- #20 BTC-USDT-SWAP LONG 패 (5/5~5/6)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-041', 'BTC-USDT-SWAP', 'BUY',  0.020, 96000,  1.00, '2026-05-05 10:00:00', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'okx-t-042', 'BTC-USDT-SWAP', 'SELL', 0.020, 94500,  1.00, '2026-05-06 09:30:00', NOW());


-- =============================================
-- 포지션 (trades 묶음 결과)
-- 11승 9패 = 승률 55%
-- =============================================
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES

-- 3월
-- #1 BTC LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 86000, 88500, 0.010,  23.50,  2.73, '2026-03-01 09:30:00', '2026-03-01 14:20:00', NOW()),
-- #2 ETH LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'ETH-USDT-SWAP', 'LONG', 2250,  2180,  2.000, -145.00, -3.22, '2026-03-03 10:00:00', '2026-03-03 16:30:00', NOW()),
-- #3 SOL LONG 승 (평단 133.8, 매수 2회)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'SOL-USDT',      'LONG', 133.80, 148,   50.000, 649.60,  9.71, '2026-03-05 08:00:00', '2026-03-05 18:00:00', NOW()),
-- #4 BTC SHORT 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'SHORT', 88000, 87000, 0.010,  9.00,   1.02, '2026-03-07 10:00:00', '2026-03-08 09:00:00', NOW()),
-- #5 DOGE LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'DOGE-USDT',     'LONG', 0.220, 0.200, 10000.000, -202.00, -9.18, '2026-03-10 07:30:00', '2026-03-11 08:00:00', NOW()),
-- #6 ETH LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'ETH-USDT-SWAP', 'LONG', 2300,  2500,  1.500,  296.00, 8.58,  '2026-03-13 11:00:00', '2026-03-14 15:00:00', NOW()),
-- #7 BTC LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 87500, 86000, 0.020, -302.00, -1.73, '2026-03-17 09:00:00', '2026-03-18 10:30:00', NOW()),

-- 4월
-- #8 SOL LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'SOL-USDT',      'LONG', 140,   158,   30.000, 539.60, 12.85, '2026-04-01 08:30:00', '2026-04-02 14:00:00', NOW()),
-- #9 BTC LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 89000, 92000, 0.010,  29.00,  3.26, '2026-04-04 10:00:00', '2026-04-05 16:00:00', NOW()),
-- #10 ETH SHORT 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'ETH-USDT-SWAP', 'SHORT', 2600, 2750,  1.000, -153.00, -5.88, '2026-04-07 09:00:00', '2026-04-08 11:00:00', NOW()),
-- #11 DOGE LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'DOGE-USDT',     'LONG', 0.210, 0.250, 15000.000, 597.00, 18.95, '2026-04-10 07:00:00', '2026-04-12 13:00:00', NOW()),
-- #12 BTC LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 93000, 91000, 0.015, -302.80, -2.17, '2026-04-14 10:30:00', '2026-04-15 09:00:00', NOW()),
-- #13 SOL LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'SOL-USDT',      'LONG', 155,   170,   25.000, 374.60, 9.66,  '2026-04-17 11:00:00', '2026-04-18 15:30:00', NOW()),
-- #14 ETH LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'ETH-USDT-SWAP', 'LONG', 2700,  2900,  2.000,  394.00, 7.30,  '2026-04-20 09:00:00', '2026-04-22 14:00:00', NOW()),
-- #15 BTC SHORT 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'SHORT', 92000, 93500, 0.010, -152.50, -1.66, '2026-04-24 10:00:00', '2026-04-25 11:00:00', NOW()),

-- 5월
-- #16 SOL LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'SOL-USDT',      'LONG', 165,   180,   20.000, 299.70, 9.08,  '2026-05-01 08:00:00', '2026-05-02 15:00:00', NOW()),
-- #17 BTC LONG 승
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 94000, 97000, 0.010,  29.00,  3.09, '2026-05-04 09:30:00', '2026-05-04 17:00:00', NOW()),
-- #18 DOGE LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'DOGE-USDT',     'LONG', 0.240, 0.220, 12000.000, -242.40, -8.42, '2026-05-03 10:00:00', '2026-05-05 09:00:00', NOW()),
-- #19 ETH LONG 승 (평단 2783.33, 분할 매수)
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'ETH-USDT-SWAP', 'LONG', 2783.33, 3100, 1.500, 470.20, 11.27, '2026-05-03 14:00:00', '2026-05-05 16:00:00', NOW()),
-- #20 BTC LONG 패
((SELECT id FROM users WHERE email='test@test.com'), 'OKX', 'BTC-USDT-SWAP', 'LONG', 96000, 94500, 0.020, -303.00, -1.58, '2026-05-05 10:00:00', '2026-05-06 09:30:00', NOW());


-- =============================================
-- 전략 태그 (테스트 유저 전용)
-- =============================================
INSERT INTO strategy_tags (user_id, name, color, created_at) VALUES
((SELECT id FROM users WHERE email='test@test.com'), '추세추종', '#00d4aa', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), '역추세',   '#ff6b6b', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), '브레이크아웃', '#4ecdc4', NOW()),
((SELECT id FROM users WHERE email='test@test.com'), '단타',     '#ffe66d', NOW());


-- =============================================
-- 매매 일기 (10개)
-- =============================================
INSERT INTO trade_journals (user_id, position_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES

-- 3월 일기
((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='BTC-USDT-SWAP' AND opened_at='2026-03-01 09:30:00'),
 '2026-03-01', 'BTC-USDT-SWAP',
 '4시간봉 20이평선 돌파 + 거래량 증가 확인. 이전 지지대 근처에서 반등 시그널',
 '목표가 도달 후 익절. RSI 과매수 구간 진입으로 청산',
 'CONFIDENT', '오늘은 계획대로 잘 됐다. 진입 타이밍 좋았음.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='ETH-USDT-SWAP' AND opened_at='2026-03-03 10:00:00'),
 '2026-03-03', 'ETH-USDT-SWAP',
 'BTC 상승에 따른 알트코인 연동 상승 기대. 1시간봉 지지 확인',
 '손절가 터치. 예상과 달리 하락 전환. 기준점 아래로 내려와서 정리',
 'ANXIOUS', '계획은 있었는데 실행이 늦었다. 손절을 더 일찍 했어야.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='SOL-USDT' AND opened_at='2026-03-05 08:00:00'),
 '2026-03-05', 'SOL-USDT',
 '생태계 활성화 뉴스 + 일봉 캔들 반전 패턴. 분할 매수로 진입',
 '수익률 10% 도달 후 익절. 뒤늦게 더 올랐지만 계획 익절',
 'CALM', '분할 매수 전략이 잘 먹혔다. 감정적으로 더 갈 뻔했지만 계획 지킴.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='DOGE-USDT' AND opened_at='2026-03-10 07:30:00'),
 '2026-03-10', 'DOGE-USDT',
 '커뮤니티 호재 떡밥 + 거래량 급증. 모멘텀 타려다가...',
 '물타기 하다가 더 떨어져서 포기. 손절',
 'FOMO', 'FOMO에 진입했다. 떡밥에 속지 말자. 다음엔 차트 먼저 보자.', NOW(), NOW()),

-- 4월 일기
((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='SOL-USDT' AND opened_at='2026-04-01 08:30:00'),
 '2026-04-01', 'SOL-USDT',
 '주봉 지지선 도달 + RSI 과매도. 중기 상승 추세 내 조정 매수',
 '목표가 158 도달. 거래량 줄어들어서 익절',
 'CONFIDENT', '이번 달 첫 거래인데 잘 시작했다. 기분 좋음.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='ETH-USDT-SWAP' AND opened_at='2026-04-07 09:00:00'),
 '2026-04-07', 'ETH-USDT-SWAP',
 '고점에서 거래량 줄어듦. 숏 전략. 1시간봉 다이버전스',
 '숏 방향 틀림. 강하게 올라버림. 손절',
 'FEARFUL', '숏을 너무 자신 있게 잡았다. 시장이 약세라고 내 생각이 맞다고 착각함.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='DOGE-USDT' AND opened_at='2026-04-10 07:00:00'),
 '2026-04-10', 'DOGE-USDT',
 '저항선 돌파 + 거래량 폭증. 진짜 모멘텀이라 판단',
 '돌파 후 재테스트 성공. 수익 확정',
 'CONFIDENT', '이번엔 FOMO가 아니라 실제 근거가 있었다. 차트 패턴이 깔끔함.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='BTC-USDT-SWAP' AND opened_at='2026-04-14 10:30:00'),
 '2026-04-14', 'BTC-USDT-SWAP',
 'BTC 반감기 수혜 기대 + 장기 상승 트렌드. 4H봉 지지 확인',
 '급락으로 손절가 터치. 뉴스 악재로 인한 시장 전체 하락',
 'GREEDY', '물려있을 때 계속 버티고 싶었다. 손절은 했지만 마음이 아프다.', NOW(), NOW()),

-- 5월 일기
((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='ETH-USDT-SWAP' AND opened_at='2026-05-03 14:00:00'),
 '2026-05-03', 'ETH-USDT-SWAP',
 'ETH 펀딩레이트 마이너스 전환. 숏 강제 청산 → 반등 기대. 분할 매수',
 '분할 매수 효과로 평단 낮춤. 목표가 도달 후 익절',
 'CALM', '이번엔 정말 계획대로 했다. 감정 관리 잘 됨.', NOW(), NOW()),

((SELECT id FROM users WHERE email='test@test.com'),
 (SELECT id FROM positions WHERE user_id=(SELECT id FROM users WHERE email='test@test.com') AND symbol='BTC-USDT-SWAP' AND opened_at='2026-05-05 10:00:00'),
 '2026-05-05', 'BTC-USDT-SWAP',
 '신고가 갱신 기대. 데이봉 양봉 연속. 추세 추종 매수',
 '진입 직후 하락. 지지선 이탈로 손절',
 'ANXIOUS', '연속 손실. 내일은 쉬어야 할 것 같다. 오버트레이딩 주의.', NOW(), NOW());


-- =============================================
-- 일기 ↔ 전략태그 매핑
-- =============================================
-- 태그: 추세추종(1), 역추세(2), 브레이크아웃(3), 단타(4)

-- 3/1 BTC 승 → 추세추종
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-03-01' AND j.symbol = 'BTC-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '추세추종';

-- 3/3 ETH 패 → 역추세
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-03-03' AND j.symbol = 'ETH-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '역추세';

-- 3/5 SOL 승 → 브레이크아웃
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-03-05' AND j.symbol = 'SOL-USDT'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '브레이크아웃';

-- 3/10 DOGE 패 → 단타 + 역추세
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-03-10' AND j.symbol = 'DOGE-USDT'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name IN ('단타', '역추세');

-- 4/1 SOL 승 → 추세추종
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-04-01' AND j.symbol = 'SOL-USDT'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '추세추종';

-- 4/7 ETH SHORT 패 → 역추세
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-04-07' AND j.symbol = 'ETH-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '역추세';

-- 4/10 DOGE 승 → 브레이크아웃 + 단타
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-04-10' AND j.symbol = 'DOGE-USDT'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name IN ('브레이크아웃', '단타');

-- 4/14 BTC 패 → 추세추종
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-04-14' AND j.symbol = 'BTC-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '추세추종';

-- 5/3 ETH 승 → 추세추종 + 브레이크아웃
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-05-03' AND j.symbol = 'ETH-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name IN ('추세추종', '브레이크아웃');

-- 5/5 BTC 패 → 단타
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j, strategy_tags t
WHERE j.user_id = (SELECT id FROM users WHERE email='test@test.com')
  AND j.trade_date = '2026-05-05' AND j.symbol = 'BTC-USDT-SWAP'
  AND t.user_id = (SELECT id FROM users WHERE email='test@test.com') AND t.name = '단타';


COMMIT;
