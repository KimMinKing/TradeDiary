-- [파일 용도] 랭킹/화면 테스트용 더미 데이터
-- 실행 전 기존 더미 데이터 삭제 후 재삽입

-- =============================================
-- 기존 더미 데이터 삭제 (user_id >= 특정값)
-- 실제 유저와 겹치지 않게 마지막에 INSERT 한 번에 실행
-- =============================================

-- 더미 유저 15명 생성
-- 비밀번호는 모두 'dummy1234' 의 BCrypt 해시 (실제 로그인 불필요)
-- exchange 컬럼은 exchange_keys에 저장되지만, 랭킹은 positions 기반이라 나중에 포지션 INSERT 시 거래소 지정

INSERT INTO users (email, password, nickname, created_at, updated_at) VALUES
-- Upbit 유저 3명
('dummy_upbit1@test.com',    '$2a$10$dummyhashupbit1abcdefg1234567890', '업비트헌터',  NOW() - interval '30 days', NOW()),
('dummy_upbit2@test.com',    '$2a$10$dummyhashupbit2abcdefg1234567890', '코인달인',    NOW() - interval '25 days', NOW()),
('dummy_upbit3@test.com',    '$2a$10$dummyhashupbit3abcdefg1234567890', '비트모험가',  NOW() - interval '20 days', NOW()),

-- Binance 유저 3명
('dummy_binance1@test.com',  '$2a$10$dummyhashbinance1abcdefg1234567', '바이낸스킹',  NOW() - interval '28 days', NOW()),
('dummy_binance2@test.com',  '$2a$10$dummyhashbinance2abcdefg1234567', '차트달인',    NOW() - interval '22 days', NOW()),
('dummy_binance3@test.com',  '$2a$10$dummyhashbinance3abcdefg1234567', '호가수집가',  NOW() - interval '18 days', NOW()),

-- Bybit 유저 2명
('dummy_bybit1@test.com',    '$2a$10$dummyhashbybit1abcdefg123456789', '바이비트러',  NOW() - interval '15 days', NOW()),
('dummy_bybit2@test.com',    '$2a$10$dummyhashbybit2abcdefg123456789', '선물의신',    NOW() - interval '12 days', NOW()),

-- Bitget 유저 2명
('dummy_bitget1@test.com',   '$2a$10$dummyhashbitget1abcdefg12345678', '비트겟스나이퍼', NOW() - interval '14 days', NOW()),
('dummy_bitget2@test.com',   '$2a$10$dummyhashbitget2abcdefg12345678', '팔로우투자왕',  NOW() - interval '10 days', NOW()),

-- OKX 유저 2명
('dummy_okx1@test.com',      '$2a$10$dummyhashokx1abcdefg12345678901', 'OKX마스터',   NOW() - interval '16 days', NOW()),
('dummy_okx2@test.com',      '$2a$10$dummyhashokx2abcdefg12345678901', '글로벌트레이더', NOW() - interval '8 days', NOW()),

-- BingX 유저 2명
('dummy_bingx1@test.com',    '$2a$10$dummyhashbingx1abcdefg123456789', '빙엑스독수리', NOW() - interval '11 days', NOW()),
('dummy_bingx2@test.com',    '$2a$10$dummyhashbingx2abcdefg123456789', '소셜트레이더', NOW() - interval '6 days', NOW()),

-- 복합 거래소 유저 1명
('dummy_multi@test.com',     '$2a$10$dummyhashmulti1abcdefg123456789', '전천후트레이더', NOW() - interval '9 days', NOW())
;

-- =============================================
-- 더미 유저 자산 및 일기 공개 설정 업데이트
-- =============================================
UPDATE users SET total_assets = 15200.00, diary_public = true  WHERE email = 'dummy_upbit1@test.com';
UPDATE users SET total_assets = 8700.00,  diary_public = true  WHERE email = 'dummy_upbit2@test.com';
UPDATE users SET total_assets = 3200.00,  diary_public = false WHERE email = 'dummy_upbit3@test.com';
UPDATE users SET total_assets = 28500.00, diary_public = true  WHERE email = 'dummy_binance1@test.com';
UPDATE users SET total_assets = 12100.00, diary_public = true  WHERE email = 'dummy_binance2@test.com';
UPDATE users SET total_assets = 1800.00,  diary_public = false WHERE email = 'dummy_binance3@test.com';
UPDATE users SET total_assets = 9400.00,  diary_public = true  WHERE email = 'dummy_bybit1@test.com';
UPDATE users SET total_assets = 15300.00, diary_public = true  WHERE email = 'dummy_bybit2@test.com';
UPDATE users SET total_assets = 7600.00,  diary_public = true  WHERE email = 'dummy_bitget1@test.com';
UPDATE users SET total_assets = 2100.00,  diary_public = false WHERE email = 'dummy_bitget2@test.com';
UPDATE users SET total_assets = 42000.00, diary_public = true  WHERE email = 'dummy_okx1@test.com';
UPDATE users SET total_assets = 1500.00,  diary_public = false WHERE email = 'dummy_okx2@test.com';
UPDATE users SET total_assets = 6800.00,  diary_public = true  WHERE email = 'dummy_bingx1@test.com';
UPDATE users SET total_assets = 900.00,   diary_public = false WHERE email = 'dummy_bingx2@test.com';
UPDATE users SET total_assets = 22400.00, diary_public = true  WHERE email = 'dummy_multi@test.com';

-- =============================================
-- 더미 유저 ID 변수 저장 (실제 유저와 분리)
-- =============================================
-- 주의: INSERT 순서대로 id가 부여되므로, 실제 유저가 있으면 offset이 달라질 수 있음
-- 아래는 더미 유저가 처음 INSERT 된다고 가정한 값입니다.
-- 실제 환경에서는 SELECT로 id를 조회해서 사용하세요.

-- =============================================
-- 포지션 더미 데이터 (2026년 4월, 이번 달)
-- 승률 분포: 1위 ~80% → 꼴등 ~25%
-- 마이너스 PnL 포지션 다수 포함
-- =============================================

-- user_id는 더미 유저 INSERT 후 실제 할당된 id를 사용해야 합니다.
-- 아래는 (SELECT id FROM users WHERE email='...') 방식으로 안전하게 참조합니다.

-- ─────────────────────────────────────────────
-- 1. 업비트헌터 (UPBIT) — 승률 ~80%, 20포지션 중 16승 4패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 95000000,  97500000,  0.01,  25000,     2.63,  '2026-04-01 09:30:00', '2026-04-01 14:20:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3200000,   3350000,   0.5,   75000,     4.69,  '2026-04-02 10:00:00', '2026-04-02 16:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 180000,    172000,    5.0,   -40000,    -4.44, '2026-04-03 08:15:00', '2026-04-03 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'XRPKRW',  'LONG', 850,        920,       500,   35000,     8.24,  '2026-04-04 07:00:00', '2026-04-04 15:45:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 280,        310,       1000,  30000,     10.71, '2026-04-05 09:00:00', '2026-04-05 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96000000,  94500000,  0.02,  -30000,    -1.56, '2026-04-06 10:30:00', '2026-04-06 12:15:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3100000,   3280000,   1.0,   180000,    5.81,  '2026-04-07 11:00:00', '2026-04-07 18:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 175000,    190000,    3.0,   45000,     8.57,  '2026-04-08 09:00:00', '2026-04-08 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'AVAXKRW', 'LONG', 45000,     42000,     2.0,   -60000,    -6.67, '2026-04-09 08:00:00', '2026-04-09 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 94000000,  96800000,  0.03,  84000,     2.98,  '2026-04-10 07:30:00', '2026-04-10 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3300000,   3450000,   0.8,   120000,    5.68,  '2026-04-11 10:00:00', '2026-04-11 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'XRPKRW',  'LONG', 900,        870,       300,   -9000,     -3.33, '2026-04-12 09:00:00', '2026-04-12 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 95000000,  97200000,  0.05,  110000,    2.32,  '2026-04-13 08:00:00', '2026-04-13 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 185000,    198000,    4.0,   52000,     7.03,  '2026-04-14 09:30:00', '2026-04-14 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 300,        340,       2000,  80000,     13.33, '2026-04-15 07:00:00', '2026-04-15 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3400000,   3550000,   0.3,   45000,     4.41,  '2026-04-16 10:00:00', '2026-04-16 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96500000,  98000000,  0.02,  30000,     1.55,  '2026-04-17 08:00:00', '2026-04-17 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'AVAXKRW', 'LONG', 43000,     46000,     3.0,   90000,     6.98,  '2026-04-18 09:00:00', '2026-04-18 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 190000,    202000,    2.0,   24000,     6.32,  '2026-04-20 10:00:00', '2026-04-20 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 97000000,  98500000,  0.01,  15000,     1.55,  '2026-04-22 08:30:00', '2026-04-22 11:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 2. 코인달인 (UPBIT) — 승률 ~70%, 20포지션 중 14승 6패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 95500000,  94000000,  0.02,  -30000,    -1.57, '2026-04-01 10:00:00', '2026-04-01 12:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3150000,   3300000,   0.8,   120000,    4.76,  '2026-04-02 09:00:00', '2026-04-02 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 178000,    165000,    3.0,   -39000,    -7.30, '2026-04-03 08:00:00', '2026-04-03 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 93500000,  96000000,  0.03,  75000,     2.67,  '2026-04-04 11:00:00', '2026-04-04 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'XRPKRW',  'LONG', 840,        910,       400,   28000,     8.33,  '2026-04-05 09:30:00', '2026-04-05 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3300000,   3150000,   0.5,   -75000,    -4.55, '2026-04-06 10:00:00', '2026-04-06 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 290,        320,       1500,  45000,     10.34, '2026-04-07 07:30:00', '2026-04-07 12:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 94500000,  97000000,  0.01,  25000,     2.65,  '2026-04-08 09:00:00', '2026-04-08 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 170000,    158000,    2.0,   -24000,    -7.06, '2026-04-09 08:30:00', '2026-04-09 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3200000,   3400000,   0.6,   120000,    6.25,  '2026-04-10 10:00:00', '2026-04-10 16:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'AVAXKRW', 'LONG', 44000,      46500,     2.0,   50000,     5.68,  '2026-04-11 09:00:00', '2026-04-11 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96000000,  94800000,  0.02,  -24000,    -1.25, '2026-04-12 07:00:00', '2026-04-12 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'XRPKRW',  'LONG', 900,        950,       500,   25000,     5.56,  '2026-04-13 10:30:00', '2026-04-13 15:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3380000,   3520000,   0.4,   56000,     4.14,  '2026-04-15 09:00:00', '2026-04-15 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 182000,    175000,    1.5,   -10500,    -3.85, '2026-04-16 08:00:00', '2026-04-16 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 310,        350,       1000,  40000,     12.90, '2026-04-17 07:00:00', '2026-04-17 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 95000000,  97800000,  0.04,  112000,    2.95,  '2026-04-18 09:30:00', '2026-04-18 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3450000,   3320000,   0.3,   -39000,    -3.77, '2026-04-20 10:00:00', '2026-04-20 12:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96800000,  98200000,  0.02,  28000,     1.45,  '2026-04-22 08:00:00', '2026-04-22 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'), 'UPBIT', 'AVAXKRW', 'LONG', 45000,      47500,     1.5,   37500,     5.56,  '2026-04-24 09:00:00', '2026-04-24 14:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 3. 비트모험가 (UPBIT) — 승률 ~50%, 16포지션 중 8승 8패 (손실 많음)
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96000000,  94000000,  0.01,  -20000,    -2.08, '2026-04-01 10:00:00', '2026-04-01 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3200000,   3350000,   0.3,   45000,     4.69,  '2026-04-02 09:00:00', '2026-04-02 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 180000,    168000,    2.0,   -24000,    -6.67, '2026-04-03 08:30:00', '2026-04-03 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 290,        260,       800,   -24000,    -10.34,'2026-04-04 07:00:00', '2026-04-04 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 93500000,  95500000,  0.02,  40000,     2.14,  '2026-04-05 10:00:00', '2026-04-05 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'XRPKRW',  'LONG', 850,        800,       300,   -15000,    -5.88, '2026-04-06 09:30:00', '2026-04-06 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3300000,   3480000,   0.5,   90000,     5.45,  '2026-04-07 11:00:00', '2026-04-07 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 175000,    163000,    3.0,   -36000,    -6.86, '2026-04-08 08:00:00', '2026-04-08 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 94500000,  96500000,  0.03,  60000,     2.12,  '2026-04-09 09:00:00', '2026-04-09 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'AVAXKRW', 'LONG', 45000,      42500,     2.0,   -50000,    -5.56, '2026-04-10 08:00:00', '2026-04-10 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3400000,   3200000,   0.4,   -80000,    -5.88, '2026-04-11 10:00:00', '2026-04-11 12:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 95000000,  97500000,  0.01,  25000,     2.63,  '2026-04-13 09:00:00', '2026-04-13 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'DOGEEKRW','LONG', 270,        300,       1000,  30000,     11.11, '2026-04-15 07:30:00', '2026-04-15 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'SOLKRW',  'LONG', 182000,    170000,    2.5,   -30000,    -6.59, '2026-04-17 08:00:00', '2026-04-17 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'BTCKRW',  'LONG', 96500000,  98000000,  0.02,  30000,     1.55,  '2026-04-20 10:00:00', '2026-04-20 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'), 'UPBIT', 'ETHKRW',  'LONG', 3350000,   3180000,   0.6,   -102000,   -5.07, '2026-04-23 09:00:00', '2026-04-23 12:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 4. 바이낸스킹 (BINANCE) — 승률 ~75%, 16포지션 중 12승 4패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94500,  96800,  0.1,   230,     2.43,  '2026-04-01 08:00:00', '2026-04-01 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3200,   3350,   2.0,   300,     4.69,  '2026-04-02 09:30:00', '2026-04-02 16:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 180,    172,    10.0,  -80,     -4.44, '2026-04-03 07:00:00', '2026-04-03 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'BTCUSDT',  'SHORT',96000,  94200,  0.05,  90,      1.88,  '2026-04-04 10:00:00', '2026-04-04 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'DOGEUSDT', 'LONG', 0.28,   0.31,   5000,  150,     10.71, '2026-04-05 08:00:00', '2026-04-05 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3300,   3150,   1.0,   -150,    -4.55, '2026-04-06 09:00:00', '2026-04-06 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94000,  96500,  0.08,  200,     2.66,  '2026-04-07 11:00:00', '2026-04-07 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'XRPUSDT',  'LONG', 2.4,    2.6,    1000,  200,     8.33,  '2026-04-08 09:30:00', '2026-04-08 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 175,    165,    5.0,   -50,     -5.71, '2026-04-09 08:00:00', '2026-04-09 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 95000,  97800,  0.05,  140,     2.95,  '2026-04-10 10:00:00', '2026-04-10 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'ETHUSDT',  'SHORT',3400,   3250,   1.5,   225,     4.41,  '2026-04-11 09:00:00', '2026-04-11 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'AVAXUSDT', 'LONG', 42,     39,     20.0,  -60,     -7.14, '2026-04-12 07:30:00', '2026-04-12 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 96000,  98500,  0.03,  75,      2.60,  '2026-04-14 08:00:00', '2026-04-14 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'DOGEUSDT', 'LONG', 0.30,   0.34,   3000,  120,     13.33, '2026-04-16 09:00:00', '2026-04-16 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3350,   3500,   1.0,   150,     4.48,  '2026-04-19 10:00:00', '2026-04-19 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 185,    200,    8.0,   120,     8.11,  '2026-04-22 09:00:00', '2026-04-22 14:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 5. 차트달인 (BINANCE) — 승률 ~60%, 15포지션 중 9승 6패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 95000,  93500,  0.05,  -75,     -1.58, '2026-04-01 09:00:00', '2026-04-01 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3180,   3320,   1.5,   210,     4.40,  '2026-04-02 10:00:00', '2026-04-02 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 182,    170,    8.0,   -96,     -6.59, '2026-04-03 08:00:00', '2026-04-03 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'BTCUSDT',  'SHORT',96000,  94500,  0.03,  45,      1.56,  '2026-04-04 11:00:00', '2026-04-04 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'XRPUSDT',  'LONG', 2.3,    2.1,    500,   -100,    -8.70, '2026-04-05 09:00:00', '2026-04-05 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3250,   3400,   2.0,   300,     4.62,  '2026-04-06 08:30:00', '2026-04-06 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'DOGEUSDT', 'LONG', 0.29,   0.32,   2000,  60,      10.34, '2026-04-07 07:00:00', '2026-04-07 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94000,  92800,  0.04,  -48,     -1.28, '2026-04-08 10:00:00', '2026-04-08 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 168,    180,    10.0,  120,     7.14,  '2026-04-09 09:00:00', '2026-04-09 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'ETHUSDT',  'SHORT',3380,   3500,   1.0,   -120,    -3.55, '2026-04-10 08:00:00', '2026-04-10 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 93500,  96000,  0.06,  150,     2.67,  '2026-04-12 09:30:00', '2026-04-12 15:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'AVAXUSDT', 'LONG', 43,     41,     15.0,  -30,     -4.65, '2026-04-14 08:00:00', '2026-04-14 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 95500,  97500,  0.02,  40,      2.09,  '2026-04-17 10:00:00', '2026-04-17 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3350,   3220,   0.8,   -104,    -3.88, '2026-04-20 09:00:00', '2026-04-20 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 178,    192,    6.0,   84,      7.87,  '2026-04-23 08:30:00', '2026-04-23 13:30:00', NOW())
;

-- ─────────────────────────────────────────────
-- 6. 호가수집가 (BINANCE) — 승률 ~40%, 15포지션 중 6승 9패 (마이너스 많음)
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 96000,  94000,  0.03,  -60,     -2.08, '2026-04-01 09:30:00', '2026-04-01 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3250,   3100,   1.0,   -150,    -4.62, '2026-04-02 08:00:00', '2026-04-02 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 185,    198,    5.0,   65,      7.03,  '2026-04-03 10:00:00', '2026-04-03 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94500,  93000,  0.02,  -30,     -1.59, '2026-04-04 09:00:00', '2026-04-04 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'DOGEUSDT', 'LONG', 0.30,   0.26,   3000,  -120,    -13.33,'2026-04-05 07:30:00', '2026-04-05 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3150,   3300,   1.5,   225,     4.76,  '2026-04-06 10:00:00', '2026-04-06 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'XRPUSDT',  'LONG', 2.5,    2.3,    400,   -80,     -8.00, '2026-04-07 08:00:00', '2026-04-07 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'BTCUSDT',  'SHORT',95000,  96500,  0.01,  -15,     -1.58, '2026-04-08 09:00:00', '2026-04-08 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'SOLUSDT',  'LONG', 170,    160,    8.0,   -80,     -7.35, '2026-04-09 07:00:00', '2026-04-09 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3300,   3450,   0.5,   75,      4.55,  '2026-04-10 10:30:00', '2026-04-10 15:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 93500,  92000,  0.04,  -60,     -1.60, '2026-04-11 08:00:00', '2026-04-11 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'AVAXUSDT', 'LONG', 44,     46,     10.0,  20,      4.55,  '2026-04-13 09:00:00', '2026-04-13 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'DOGEUSDT', 'LONG', 0.27,   0.24,   2000,  -60,     -11.11,'2026-04-15 08:00:00', '2026-04-15 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94000,  95800,  0.05,  90,      1.91,  '2026-04-18 10:00:00', '2026-04-18 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3380,   3200,   0.8,   -144,    -5.33, '2026-04-21 09:00:00', '2026-04-21 12:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 7. 바이비트러 (BYBIT) — 승률 ~65%, 14포지션 중 9승 5패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'BTCUSDT',  'LONG', 94800,  97000,  0.05,  110,     2.32,  '2026-04-01 08:00:00', '2026-04-01 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'ETHUSDT',  'LONG', 3200,   3080,   1.0,   -120,    -3.75, '2026-04-02 09:00:00', '2026-04-02 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'SOLUSDT',  'LONG', 178,    190,    8.0,   96,      6.74,  '2026-04-03 10:00:00', '2026-04-03 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'BTCUSDT',  'SHORT',95500,  94000,  0.03,  45,      1.57,  '2026-04-04 08:30:00', '2026-04-04 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'XRPUSDT',  'LONG', 2.4,    2.2,    500,   -100,    -8.33, '2026-04-05 09:00:00', '2026-04-05 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'ETHUSDT',  'LONG', 3150,   3350,   2.0,   400,     6.35,  '2026-04-06 10:30:00', '2026-04-06 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'DOGEUSDT', 'LONG', 0.28,   0.31,   3000,  90,      10.71, '2026-04-07 07:00:00', '2026-04-07 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'BTCUSDT',  'LONG', 94000,  92800,  0.02,  -24,     -1.28, '2026-04-08 09:00:00', '2026-04-08 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'SOLUSDT',  'LONG', 175,    188,    6.0,   78,      7.43,  '2026-04-09 10:00:00', '2026-04-09 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'BTCUSDT',  'LONG', 93500,  91200,  0.04,  -92,     -2.46, '2026-04-10 08:00:00', '2026-04-10 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'ETHUSDT',  'LONG', 3300,   3480,   1.5,   270,     5.45,  '2026-04-12 09:30:00', '2026-04-12 15:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'BTCUSDT',  'LONG', 94500,  96200,  0.03,  51,      1.80,  '2026-04-15 08:00:00', '2026-04-15 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'DOGEUSDT', 'LONG', 0.30,   0.33,   4000,  120,     10.00, '2026-04-18 10:00:00', '2026-04-18 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'), 'BYBIT', 'ETHUSDT',  'LONG', 3400,   3520,   1.0,   120,     3.53,  '2026-04-21 09:00:00', '2026-04-21 15:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 8. 선물의신 (BYBIT) — 승률 ~55%, 12포지션 중 7승 5패, SHORT 포지션 많음
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'BTCUSDT',  'SHORT',95500,  93800,  0.05,  85,      1.78,  '2026-04-01 10:00:00', '2026-04-01 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'ETHUSDT',  'SHORT',3250,   3400,   2.0,   -300,    -4.62, '2026-04-02 09:00:00', '2026-04-02 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'SOLUSDT',  'SHORT',180,    168,    10.0,  120,     6.67,  '2026-04-03 08:00:00', '2026-04-03 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'BTCUSDT',  'LONG', 94000,  92500,  0.03,  -45,     -1.60, '2026-04-04 09:30:00', '2026-04-04 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'ETHUSDT',  'SHORT',3380,   3200,   1.5,   270,     5.33,  '2026-04-05 10:00:00', '2026-04-05 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'BTCUSDT',  'SHORT',96000,  97500,  0.02,  -30,     -1.56, '2026-04-06 08:00:00', '2026-04-06 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'DOGEUSDT', 'SHORT',0.30,   0.27,   5000,  150,     10.00, '2026-04-07 07:30:00', '2026-04-07 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'SOLUSDT',  'SHORT',175,    185,    8.0,   -80,     -7.14, '2026-04-08 09:00:00', '2026-04-08 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'BTCUSDT',  'SHORT',94800,  93000,  0.04,  72,      1.90,  '2026-04-10 10:00:00', '2026-04-10 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'ETHUSDT',  'LONG', 3200,   3050,   1.0,   -150,    -4.69, '2026-04-13 08:30:00', '2026-04-13 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'BTCUSDT',  'SHORT',95500,  94000,  0.03,  45,      1.57,  '2026-04-16 09:00:00', '2026-04-16 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'), 'BYBIT', 'ETHUSDT',  'SHORT',3350,   3180,   1.5,   255,     5.07,  '2026-04-20 10:00:00', '2026-04-20 15:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 9. 비트겟스나이퍼 (BITGET) — 승률 ~72%, 14포지션 중 10승 4패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 94200,  96500,  0.04,  92,      2.44,  '2026-04-01 08:30:00', '2026-04-01 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3180,   3350,   1.5,   255,     5.35,  '2026-04-02 09:00:00', '2026-04-02 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'SOLUSDT',  'LONG', 180,    172,    6.0,   -48,     -4.44, '2026-04-03 10:00:00', '2026-04-03 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 95000,  97800,  0.03,  84,      2.95,  '2026-04-04 08:00:00', '2026-04-04 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'XRPUSDT',  'LONG', 2.3,    2.5,    800,   160,     8.70,  '2026-04-05 09:30:00', '2026-04-05 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3320,   3180,   1.0,   -140,    -4.22, '2026-04-06 07:00:00', '2026-04-06 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'DOGEUSDT', 'LONG', 0.28,   0.31,   4000,  120,     10.71, '2026-04-07 10:00:00', '2026-04-07 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 94000,  95800,  0.05,  90,      1.91,  '2026-04-08 09:00:00', '2026-04-08 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'SOLUSDT',  'LONG', 176,    162,    5.0,   -70,     -7.95, '2026-04-09 08:00:00', '2026-04-09 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3250,   3420,   2.0,   340,     5.23,  '2026-04-10 11:00:00', '2026-04-10 17:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 95500,  94000,  0.02,  -30,     -1.57, '2026-04-11 08:30:00', '2026-04-11 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'DOGEUSDT', 'LONG', 0.30,   0.34,   3000,  120,     13.33, '2026-04-13 09:00:00', '2026-04-13 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3380,   3500,   1.0,   120,     3.55,  '2026-04-16 10:00:00', '2026-04-16 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), 'BITGET', 'SOLUSDT',  'LONG', 185,    198,    7.0,   91,      7.03,  '2026-04-20 08:00:00', '2026-04-20 13:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 10. 팔로우투자왕 (BITGET) — 승률 ~45%, 12포지션 중 5승 7패 (손실 다수)
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 95800,  94000,  0.03,  -54,     -1.88, '2026-04-01 09:00:00', '2026-04-01 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3220,   3100,   1.0,   -120,    -3.73, '2026-04-02 08:00:00', '2026-04-02 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'SOLUSDT',  'LONG', 182,    195,    5.0,   65,      7.14,  '2026-04-03 10:00:00', '2026-04-03 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'DOGEUSDT', 'LONG', 0.29,   0.25,   3000,  -120,    -13.79,'2026-04-04 07:30:00', '2026-04-04 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 93500,  95500,  0.04,  80,      2.14,  '2026-04-05 09:00:00', '2026-04-05 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3150,   3000,   1.5,   -225,    -4.76, '2026-04-06 10:30:00', '2026-04-06 12:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'XRPUSDT',  'LONG', 2.4,    2.2,    600,   -120,    -8.33, '2026-04-07 08:00:00', '2026-04-07 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 94000,  96000,  0.02,  40,      2.13,  '2026-04-08 09:00:00', '2026-04-08 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'SOLUSDT',  'LONG', 178,    165,    4.0,   -52,     -7.30, '2026-04-09 07:00:00', '2026-04-09 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'ETHUSDT',  'LONG', 3080,   3250,   1.0,   170,     5.52,  '2026-04-10 10:00:00', '2026-04-10 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'DOGEUSDT', 'LONG', 0.26,   0.23,   2000,  -60,     -11.54,'2026-04-11 08:00:00', '2026-04-11 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), 'BITGET', 'BTCUSDT',  'LONG', 94500,  96200,  0.03,  51,      1.80,  '2026-04-13 09:30:00', '2026-04-13 14:30:00', NOW())
;

-- ─────────────────────────────────────────────
-- 11. OKX마스터 (OKX) — 승률 ~68%, 13포지션 중 9승 4패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'BTCUSDT',  'LONG', 94600,  96800,  0.04,  88,      2.33,  '2026-04-01 08:00:00', '2026-04-01 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3190,   3350,   1.5,   240,     5.02,  '2026-04-02 09:30:00', '2026-04-02 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'SOLUSDT',  'LONG', 179,    170,    5.0,   -45,     -5.03, '2026-04-03 07:00:00', '2026-04-03 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'BTCUSDT',  'LONG', 94000,  96200,  0.06,  132,     2.34,  '2026-04-04 10:00:00', '2026-04-04 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'DOGEUSDT', 'LONG', 0.28,   0.31,   3000,  90,      10.71, '2026-04-05 09:00:00', '2026-04-05 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3320,   3200,   1.0,   -120,    -3.61, '2026-04-06 08:00:00', '2026-04-06 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'XRPUSDT',  'LONG', 2.3,    2.5,    600,   120,     8.70,  '2026-04-07 10:30:00', '2026-04-07 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'BTCUSDT',  'SHORT',95500,  94000,  0.03,  45,      1.57,  '2026-04-08 09:00:00', '2026-04-08 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'SOLUSDT',  'LONG', 175,    162,    4.0,   -52,     -7.43, '2026-04-09 07:30:00', '2026-04-09 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3280,   3450,   2.0,   340,     5.18,  '2026-04-10 10:00:00', '2026-04-10 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'BTCUSDT',  'LONG', 94800,  97500,  0.02,  54,      2.85,  '2026-04-12 08:00:00', '2026-04-12 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'DOGEUSDT', 'LONG', 0.30,   0.33,   5000,  150,     10.00, '2026-04-15 09:00:00', '2026-04-15 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'), 'OKX', 'BTCUSDT',  'LONG', 95500,  94000,  0.03,  -45,     -1.57, '2026-04-18 10:00:00', '2026-04-18 12:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 12. 글로벌트레이더 (OKX) — 승률 ~38%, 13포지션 중 5승 8패 (크게 마이너스)
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'BTCUSDT',  'LONG', 96000,  93500,  0.05,  -125,    -2.60, '2026-04-01 09:00:00', '2026-04-01 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3250,   3100,   2.0,   -300,    -4.62, '2026-04-02 08:00:00', '2026-04-02 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'SOLUSDT',  'LONG', 183,    194,    6.0,   66,      6.01,  '2026-04-03 10:00:00', '2026-04-03 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'DOGEUSDT', 'LONG', 0.29,   0.25,   4000,  -160,    -13.79,'2026-04-04 07:00:00', '2026-04-04 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'BTCUSDT',  'LONG', 93800,  95500,  0.03,  51,      1.81,  '2026-04-05 09:30:00', '2026-04-05 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3180,   3020,   1.5,   -240,    -5.03, '2026-04-06 10:00:00', '2026-04-06 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'XRPUSDT',  'LONG', 2.5,    2.3,    500,   -100,    -8.00, '2026-04-07 08:00:00', '2026-04-07 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'BTCUSDT',  'SHORT',95000,  96800,  0.02,  -36,     -1.89, '2026-04-08 09:00:00', '2026-04-08 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'SOLUSDT',  'LONG', 170,    180,    8.0,   80,      7.35,  '2026-04-09 10:30:00', '2026-04-09 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'ETHUSDT',  'LONG', 3080,   2920,   1.0,   -160,    -5.19, '2026-04-10 07:00:00', '2026-04-10 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'BTCUSDT',  'LONG', 94000,  96000,  0.04,  80,      2.13,  '2026-04-12 09:00:00', '2026-04-12 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'DOGEUSDT', 'LONG', 0.27,   0.24,   3000,  -90,     -11.11,'2026-04-15 08:00:00', '2026-04-15 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'), 'OKX', 'BTCUSDT',  'LONG', 94500,  96800,  0.02,  46,      2.43,  '2026-04-20 10:00:00', '2026-04-20 15:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 13. 빙엑스독수리 (BINGX) — 승률 ~62%, 13포지션 중 8승 5패
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 95000,  97200,  0.03,  66,      2.32,  '2026-04-01 08:30:00', '2026-04-01 14:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3200,   3080,   1.0,   -120,    -3.75, '2026-04-02 09:00:00', '2026-04-02 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'SOLUSDT',  'LONG', 180,    192,    5.0,   60,      6.67,  '2026-04-03 10:00:00', '2026-04-03 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'DOGEUSDT', 'LONG', 0.28,   0.25,   2000,  -60,     -10.71,'2026-04-04 07:30:00', '2026-04-04 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 94000,  96000,  0.05,  100,     2.13,  '2026-04-05 09:00:00', '2026-04-05 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3150,   3350,   1.5,   300,     6.35,  '2026-04-06 10:00:00', '2026-04-06 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'XRPUSDT',  'LONG', 2.4,    2.2,    400,   -80,     -8.33, '2026-04-07 08:00:00', '2026-04-07 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 94800,  96500,  0.02,  34,      1.80,  '2026-04-08 09:30:00', '2026-04-08 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'SOLUSDT',  'LONG', 176,    163,    4.0,   -52,     -7.39, '2026-04-09 07:00:00', '2026-04-09 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3300,   3480,   2.0,   360,     5.45,  '2026-04-10 10:00:00', '2026-04-10 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 95500,  97800,  0.03,  69,      2.41,  '2026-04-12 08:00:00', '2026-04-12 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'DOGEUSDT', 'LONG', 0.30,   0.33,   3000,  90,      10.00, '2026-04-16 09:00:00', '2026-04-16 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3400,   3250,   0.8,   -120,    -4.41, '2026-04-20 10:00:00', '2026-04-20 12:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 14. 소셜트레이더 (BINGX) — 승률 ~33%, 12포지션 중 4승 8패 (최하위권)
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 95800,  93800,  0.03,  -60,     -2.09, '2026-04-01 09:00:00', '2026-04-01 11:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3220,   3080,   1.5,   -210,    -4.35, '2026-04-02 08:00:00', '2026-04-02 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'SOLUSDT',  'LONG', 182,    168,    5.0,   -70,     -7.69, '2026-04-03 10:00:00', '2026-04-03 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'DOGEUSDT', 'LONG', 0.29,   0.32,   3000,  90,      10.34, '2026-04-04 09:00:00', '2026-04-04 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 94000,  92500,  0.04,  -60,     -1.60, '2026-04-05 07:30:00', '2026-04-05 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3150,   3000,   1.0,   -150,    -4.76, '2026-04-06 10:00:00', '2026-04-06 12:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'XRPUSDT',  'LONG', 2.4,    2.1,    500,   -150,    -12.50,'2026-04-07 08:30:00', '2026-04-07 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 93500,  95500,  0.02,  40,      2.14,  '2026-04-08 09:00:00', '2026-04-08 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'SOLUSDT',  'LONG', 175,    160,    6.0,   -90,     -8.57, '2026-04-09 07:00:00', '2026-04-09 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'ETHUSDT',  'LONG', 3050,   3220,   0.8,   136,     5.57,  '2026-04-10 10:30:00', '2026-04-10 15:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'DOGEUSDT', 'LONG', 0.27,   0.23,   2000,  -80,     -14.81,'2026-04-11 08:00:00', '2026-04-11 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'), 'BINGX', 'BTCUSDT',  'LONG', 94200,  96000,  0.03,  54,      1.91,  '2026-04-13 09:00:00', '2026-04-13 14:00:00', NOW())
;

-- ─────────────────────────────────────────────
-- 15. 전천후트레이더 (복합) — 승률 ~58%, 12포지션 중 7승 5패, 여러 거래소 섞임
-- ─────────────────────────────────────────────
INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94500,  96800,  0.03,  69,      2.43,  '2026-04-01 08:00:00', '2026-04-01 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'UPBIT',   'BTCKRW',   'LONG', 95500000,93800000,0.01,  -17000,  -1.78, '2026-04-02 09:00:00', '2026-04-02 11:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BYBIT',   'ETHUSDT',  'LONG', 3200,   3380,   1.0,   180,     5.63,  '2026-04-03 10:00:00', '2026-04-03 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'OKX',     'SOLUSDT',  'LONG', 180,    168,    5.0,   -60,     -6.67, '2026-04-04 07:30:00', '2026-04-04 09:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BITGET',  'BTCUSDT',  'LONG', 93800,  95800,  0.04,  80,      2.13,  '2026-04-05 09:00:00', '2026-04-05 14:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BINANCE', 'ETHUSDT',  'LONG', 3300,   3150,   1.5,   -225,    -4.55, '2026-04-06 08:00:00', '2026-04-06 10:30:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'UPBIT',   'ETHKRW',   'LONG', 3200000,3380000, 0.5,   90000,   5.63,  '2026-04-07 10:30:00', '2026-04-07 16:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BYBIT',   'DOGEUSDT', 'LONG', 0.29,   0.32,   2000,  60,      10.34, '2026-04-08 09:00:00', '2026-04-08 13:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BINGX',   'XRPUSDT',  'LONG', 2.4,    2.2,    400,   -80,     -8.33, '2026-04-09 08:00:00', '2026-04-09 10:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'OKX',     'BTCUSDT',  'LONG', 95000,  97500,  0.02,  50,      2.63,  '2026-04-10 10:00:00', '2026-04-10 15:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BITGET',  'SOLUSDT',  'LONG', 175,    160,    4.0,   -60,     -8.57, '2026-04-11 07:00:00', '2026-04-11 09:00:00', NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'), 'BINANCE', 'BTCUSDT',  'LONG', 94200,  96000,  0.03,  54,      1.91,  '2026-04-13 09:00:00', '2026-04-13 14:00:00', NOW())
;

-- =============================================
-- 매매 일기 더미 데이터
-- 감정: CALM, CONFIDENT, FOMO, GREEDY, FEARFUL, ANXIOUS
-- 기본 전략 태그 id: 1=추세추종, 2=역추세, 3=브레이크아웃, 4=지지/저항, 5=이평선, 6=단타, 7=스윙, 8=뇌동매매
-- =============================================

-- ─────────────────────────────────────────────
-- 1. 업비트헌터 일기 8개 (승리 위주, 차분한 스타일)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-01', 'BTCKRW',  '60분봉 지지선 도달 + RSI 과매도 구간 진입, 거래량 증가 시 매수 계획', '1시간봉 저항선 근접해서 익절. 계획대로 실행됨', 'CALM', '계획된 매매. 손절가도 지켰고 만족스러움.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-03', 'SOLKRW',  '전일 대비 상승 모멘텀 확인, 볼린저밴드 하단 터치 후 반등', '예상과 다르게 하락세 지속, 손절가 도달하여 손절', 'ANXIOUS', '급하게 진입함. 대기했다가 더 확실한 신호 기다렸어야 했는데...', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-05', 'DOGEEKRW','커뮤니티 호재 제보, 트위터 반응 폭발적', '단기 급등 후 익절. 수익률 10% 달성', 'CONFIDENT', '호재 정보가 맞았음. 하지만 호재만 믿고 진입하는건 위험한 습관.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-07', 'ETHKRW',  '이더리움 셰핑 업그레이드 일정 확정, 장기 호재', '목표가 도달 후 분할 익절', 'CALM', '뉴스 확인 후 기술적 분석으로 진입 타이밍 잡음. 좋은 매매였음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-10', 'BTCKRW',  '일봉 20일 이동평균선 지지 확인, MACD 골든크로스', '저항선 돌파 후 익절', 'CONFIDENT', '이평선 + MACD 시그널 조합이 이번엔 잘 맞았음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-15', 'DOGEEKRW','일론머크 트윗 이후 밈코인 열풍, DOGE가 급등세', '고점 근처에서 전량 익절', 'CONFIDENT', '펌프앤덤프 패턴 인식해서 고점에서 빠르게 빠져나옴. 잘했다.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-18', 'AVAXKRW', 'AVAX 메인넷 업데이트 호재, 서포트 터치 후 반등 예상', '목표가 도달하여 익절 완료', 'CALM', '기본매매 룰 잘 지킴. 이런 패턴 반복하면 됨.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit1@test.com'),  '2026-04-22', 'BTCKRW',  '비트코인 반감기 효과 장기 관점에서 매수, 서포트 확인', '소폭 상승 후 익절', 'CALM', '장기 관점 매매. 조급해하지 않으니 잘 됨.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 2. 코인달인 일기 7개 (분석적, 가끔 욕심)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-02', 'ETHKRW',  '4시간봉 삼각수렴 패턴 상단 돌파, 거래량 동반', '목표가 330만원 도달 후 익절', 'CALM', '삼각수렴 돌파 패턴이 잘 먹힘. 거래량 필터가 핵심.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-06', 'ETHKRW',  '계속 하락해서 반등 올거라고 생각함', '계속 내려가서 겁나서 손절', 'FEARFUL', '근거 없이 느낌만으로 진입함. 분석 없이 들어간게 패인.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-09', 'SOLKRW',  'SOL 생태계 확장 뉴스, 지지선 터치 2번째', '지지선 이탈하면서 손절', 'ANXIOUS', '지지선이 뚫릴줄 몰랐음. 거시 경제 악화 고려했어야 함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-11', 'AVAXKRW', 'AVAX 파트너십 발표, 기술적 지표 양호', '예상 수익률 달성 후 익절', 'CONFIDENT', '펀더멘털 + 테크니컬 둘다 확인하고 들어가서 좋은 결과.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-15', 'DOGEEKRW','밈코인 바람 불어서 타야겠다', '급등해서 더 오를줄 알고 들고 있었는데 급락해서 손절', 'GREEDY', '더 오를거란 욕심에 익절 타이밍 놓침. FOMO 매매.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-18', 'BTCKRW',  '주봉 저항선 돌파, MACD 히스토그램 양전', '돌파 후 재테스트 완료 확인 후 익절', 'CALM', '주봉 돌파 매매는 확률이 높음. 인내심이 보상받음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit2@test.com'),  '2026-04-24', 'AVAXKRW', 'AVAX DeFi TVL 증가 추세, 서포트 반등', '목표가 도달 분할 익절', 'CONFIDENT', '온체인 데이터까지 확인한 매매. 이렇게 하자.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 3. 비트모험가 일기 6개 (감정 기복 심함)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-01', 'BTCKRW',  '그냥 오를거 같았음', '내려가서 손절', 'GREEDY', '아무 근거 없이 진입. 이러면 안되는데...', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-04', 'DOGEEKRW','트위터에서 다들 사라고 해서', '진입하자마자 하락, 공포 손절', 'FEARFUL', '남들 따라 사면 항상 이렇게 됨. 내 분석을 믿어야지.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-05', 'BTCKRW',  '9350만원 지지선에서 반등, 거래량 증가', '저항선 돌파 확인 후 익절', 'CALM', '이번엔 제대로 분석하고 들어감. 지지선 매매는 나한테 잘 맞음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-07', 'ETHKRW',  '이더리움 움직임 좋아보여서 추격 매수', '예상대로 상승, 익절', 'CONFIDENT', '드디어 한 건 제대로 했다. 기분 좋다.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-11', 'ETHKRW',  '손실 만회하려고 무리하게 진입', '계속 내려가서 결국 크게 손절', 'ANXIOUS', '복구매매가 제일 위험함. 이거 진짜 고쳐야 됨.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_upbit3@test.com'),  '2026-04-15', 'DOGEEKRW','다시 도지 오른다는 소식에 FOMO', '다행히 상승해서 익절', 'FOMO', '이번엔 운이 좋았지만, FOMO 매매는 언젠가 크게 맞을거다.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 4. 바이낸스킹 일기 7개 (체계적, 선물/숏 포지션 다양)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-01', 'BTCUSDT', 'BTC 선물 숏 포지션 청산 데이터 급증, 과매수 구간', '익절. 선물 OI 감소 확인', 'CALM', '선물 데이터 기반 매매. 청산맵 확인하는 습관 좋음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-04', 'BTCUSDT', 'BTC 96000 저항에서 숏 진입, RSI 다이버전스', '예상대로 하락, 익절 성공', 'CONFIDENT', '숏 매매도 자신감 생김. 양방향 대응 가능해짐.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-06', 'ETHUSDT', '이더리움 세력 매집 의심, 대량 거래 감지', '세력이 아니었음. 손절', 'FEARFUL', '대량 거래가 항상 세력은 아님. 더 확인 필요.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-08', 'XRPUSDT', 'XRP 리플 소송 호재 예상, 기술적 돌파 동반', '목표가 도달 후 익절', 'CALM', '뉴스 + 기술적 분석 조합. 가장 안정적인 매매 방식.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-11', 'ETHUSDT', 'ETH 3400 저항에서 숏 진입, 펀딩비율 극도로 높음', '펀딩비율 정상화되면서 하락, 익절', 'CONFIDENT', '펀딩비율 활용 매매. 선물 시장에서 가장 확률 높은 전략.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-16', 'DOGEUSDT','DOGE 월리트 대량 이동 감지', '급등 후 익절', 'CALM', '온체인 데이터 기반 매매. 월리트 모니터링 필수.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance1@test.com'), '2026-04-22', 'SOLUSDT', 'SOL DeFi TVL 신고경신, 기술적 상승 추세', '추세 따라 익절', 'CONFIDENT', '펀더멘털 강한 코인은 결국 오름. 인내심 승리.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 5. 차트달인 일기 6개 (기술적 중심, 가끔 오버트레이딩)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-02', 'ETHUSDT', '피보나치 0.618 되돌림 + RSI 과매도', '예상 반등 성공, 0.382에서 익절', 'CALM', '피보나치 되돌림 매매. 확률 높은 패턴.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-04', 'BTCUSDT', '일봉 캔들 역망치형 확인, 서포트 터치', '서포트 돌파해서 손절', 'ANXIOUS', '캔들 패턴만 보고 진입하면 위험함. 거시 환경 확인 필수.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-06', 'ETHUSDT', '이더리움 200일 이동평균선 반등', '상승 추세 확인 후 익절', 'CALM', '200일선은 강력한 지지. 이 매매는 교과서적.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-10', 'ETHUSDT', '숏 포지션, 헤드앤숄더 패턴 완성', '넥라인 이탈 안하고 오히려 상승, 손절', 'FEARFUL', '패턴이 완성된 것 같았는데 가짜였음. 확정 대기했어야.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-12', 'BTCUSDT', 'BTC 주봉 양봉 마감, 다음주 상승 예상', '예상대로 상승, 익절', 'CONFIDENT', '주봉 분석은 신뢰도가 높음. 시간프레임 올리는게 답.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance2@test.com'), '2026-04-20', 'ETHUSDT', '오버트레이딩, 또 매수함', '급하게 들어가서 손절만', 'ANXIOUS', '오늘 세 번째 매매. 너무 많이 거래함. 쉬는것도 실력.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 6. 호가수집가 일기 6개 (감정 불안정, 연속 손실)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-01', 'BTCUSDT', '마지막에 오른거 보고 따라감', '진입하자마자 하락, 손절', 'FOMO', '추격매수 또 당함. 절대 꼭대기에서 사면 안된다.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-02', 'ETHUSDT', '어제 손실 만회하려고 무리', '또 하락, 연속 손실', 'ANXIOUS', '복구매매 2연속 실패. 멘탈 흔들림. 오늘은 그만.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-05', 'DOGEUSDT','다들 DOGE 산다길래 나도', '진입 직후 급락 -13% 손절', 'FEARFUL', '남들 따라가면 항상 이럼. 내 전략을 만들어야 하는데...', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-06', 'ETHUSDT', '마음 다잡고 이더리움 서포트에서 진입', '다행히 반등, 익절 성공', 'CALM', '오늘 처음으로 침착하게 매매함. 이렇게 하면 되는데.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-11', 'BTCUSDT', '또 느낌으로 들어감', '역시나 하락, 손절', 'GREEDY', '패턴이 계속 반복됨. 느낌 매매 금지 룰 만들어야함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_binance3@test.com'), '2026-04-15', 'DOGEUSDT','또 DOGE... 왜 자꾸 도지를 사는거지', '진입 후 또 하락, 손절', 'ANXIOUS', '같은 실수를 반복하고 있다. 진짜 멈춰야 한다.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 7. 바이비트러 일기 5개
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'),  '2026-04-01', 'BTCUSDT', '바이비트 BTC 선물 미결약정 급증, 상승 방향', '예상 적중, 익절 성공', 'CONFIDENT', '바이비트 OI 데이터가 신뢰도 높음. 계속 활용할 것.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'),  '2026-04-05', 'XRPUSDT', 'XRP 대량 이체 발생, 하락 예상했는데', '예상 빗나가서 손절', 'ANXIOUS', '대량 이체가 항상 매도 신호는 아님. 뉴스 확인 필수.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'),  '2026-04-07', 'DOGEUSDT','밈코인 시즌, DOGE 바이비트 거래량 급증', '급등 후 익절', 'CALM', '거래량 급증 + 밈코인 시즌 감지. 타이밍 좋았음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'),  '2026-04-10', 'BTCUSDT', 'BTC 지지선 이탈, 숏 전환 고민하다가 롱 유지', '이탈 후 더 하락, 큰 손절', 'FEARFUL', '손절가를 안 옮겨서 더 크게 손실. 룰 지키자.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit1@test.com'),  '2026-04-18', 'DOGEUSDT','DOGE 커뮤니티 열기 뜨거움, 트위터 트렌드', '급등 타서 익절', 'CONFIDENT', '소셜 센티멘트 잘 읽음. SNS 모니터링 의미 있음.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 8. 선물의신 일기 5개 (숏 전문, 자신감 넘침)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'),  '2026-04-01', 'BTCUSDT', 'BTC 과매수 RSI 85, 숏 진입', '예상대로 조정, 익절', 'CONFIDENT', '과매수에서 숏은 내 특기. 자신감 있음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'),  '2026-04-02', 'ETHUSDT', '이더리움 상승 추세인데 무리하게 숏', '역시 상승, 손실', 'GREEDY', '추세를 거스르는 숏은 위험. 추세 확인 먼저.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'),  '2026-04-05', 'ETHUSDT', 'ETH 펀딩비율 극도로 높음, 숏 기회', '펀딩비율 정상화되며 하락, 대박', 'CALM', '펀딩비율 매매는 진짜 확률이 높음. 최애 전략.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'),  '2026-04-08', 'SOLUSDT', 'SOL 상승하니까 무리하게 숏', '계속 올라서 손절', 'FEARFUL', '숏만 고집하지 말고 상황에 맞게 롱도 해야함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bybit2@test.com'),  '2026-04-20', 'ETHUSDT', 'ETH 약세장 확인, 숏 포지션', '하락 추세 따라 익절', 'CONFIDENT', '약세장에서 숏은 진짜 편함. 장세 파악이 우선.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 9. 비트겟스나이퍼 일기 5개
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), '2026-04-02', 'ETHUSDT', '비트겟 ETH 영구계약 거래량 폭증, 상승 모멘텀', '예상대로 상승, 익절', 'CALM', '비트겟에서 거래량 급증할 때 진입하면 확률 좋음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), '2026-04-04', 'BTCUSDT', 'BTC 비트겟 미결약정 감소, 상승 신호', '돌파 확인 후 익절', 'CONFIDENT', 'OI 감소 + 가격 상승 = 강한 상승 신호. 좋은 매매.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), '2026-04-06', 'ETHUSDT', '급하게 진입, 분석 없이', '역시 손실', 'ANXIOUS', '분석 없는 매매는 도박. 준비 없이 들어가지 말자.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), '2026-04-10', 'ETHUSDT', 'ETH 서포트 3250 확인, 반등 기대', '목표가 도달, 익절', 'CALM', '서포트 매매는 역시 안정적. 이 패턴 반복하자.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget1@test.com'), '2026-04-20', 'SOLUSDT', 'SOL NFT 거래량 증가, 펀더멘털 개선', '상승 추세 확인 후 익절', 'CONFIDENT', '온체인 + 가격 분석 조합. 잘했다.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 10. 팔로우투자왕 일기 5개 (남 따라하는 스타일)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), '2026-04-03', 'SOLUSDT', '인플루언서가 SOL 오른다고 해서 추격 매수', '운좋게 상승, 익절', 'FOMO', '남 말 듣고 사서 맞으면 운, 틀리면 큰손실. 위험함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), '2026-04-04', 'DOGEUSDT','텔레그램 방에서 DOGE 호재 제보', '제보가 뻥이었음. -13% 손절', 'FEARFUL', '호재 제보 90%는 거짓말. 내 판단으로만 매매해야함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), '2026-04-06', 'ETHUSDT', '유명 트레이더가 숏 잡아서 나도 따라', '반대로 올라서 손실', 'ANXIOUS', '그 트레이더도 틀릴 수 있다. 내 전략이 없으면 진짜 위험.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), '2026-04-10', 'ETHUSDT', '이번엔 직접 서포트 분석하고 진입', '반등 성공, 익절', 'CALM', '내가 직접 분석한게 제일 결과가 좋다. 자신감 회복.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bitget2@test.com'), '2026-04-11', 'DOGEUSDT','또 남들 따라 DOGE 샀다가', '또 손실', 'ANXIOUS', '교훈을 못배우는게 제일 큰 문제. 내 전략을 만들자.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 11. OKX마스터 일기 5개
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_okx1@test.com'),    '2026-04-01', 'BTCUSDT', 'OKX BTC 옵션 데이터 Put/Call 비율 극도 치우침', '옵션 데이터 기반 매수, 예상 적중', 'CALM', '옵션 데이터 활용 매매. 프로답게 접근함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'),    '2026-04-04', 'BTCUSDT', 'BTC 월간 마감 효과, 역사적 패턴 참고', '월말 효과 확인, 익절', 'CONFIDENT', '시즌널리티 매매. 통계적으로 우위 있음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'),    '2026-04-06', 'ETHUSDT', '이더리움 대 BTC 비율 하락, 반등 예상', '예상 빗나감, 손절', 'ANXIOUS', '비율 분석이 항상 맞는건 아님. 스탑로스 필수.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'),    '2026-04-10', 'ETHUSDT', 'ETH 가스비 급증, 온체인 활동 폭발', '활동량 증가로 상승, 익절', 'CALM', '가스비 = 네트워크 활동 지표. 유용한 신호.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx1@test.com'),    '2026-04-15', 'DOGEUSDT','DOGE OKX 상장 효과 + 밈코인 사이클', '급등 후 익절', 'CONFIDENT', '거래소 이벤트 + 시장 사이클 조합. 확실한 매매.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 12. 글로벌트레이더 일기 5개 (해외 시장 중심, 연속 손실)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_okx2@test.com'),    '2026-04-01', 'BTCUSDT', '미국 CPI 발표 전 미리 포지션 잡음', 'CPI 높게 나와서 급락, 큰 손실', 'FEARFUL', '경제지표 발표 전 포지션 잡는건 도박. 대기했어야.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'),    '2026-04-02', 'ETHUSDT', '손실 복구하려고 무리', '또 손실. 멘탈 붕괴', 'ANXIOUS', '연속 손실중. 오늘은 그만해야 되는데 자꾸 하게됨.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'),    '2026-04-04', 'DOGEUSDT','포트사이즈 키워서 DOGE 베팅', '밈코인 폭락, 엄청난 손실', 'FEARFUL', '포지션 사이즈 관리 못함. 이거 진짜 위험한 습관.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_okx2@test.com'),    '2026-04-12', 'BTCUSDT', '마음 다잡고 BTC 서포트 매수', '다행히 반등, 소폭 익절', 'CALM', '작게 시작하니까 마음이 편함. 포지션 사이즈가 핵심.', NOW(), NOW()),
((SELECT id from users WHERE email='dummy_okx2@test.com'),    '2026-04-15', 'DOGEUSDT','또 DOGE... 왜 자꾸 밈코인을', '또 손실', 'ANXIOUS', '밈코인은 진짜 내 운이 없나. 아예 안하는게 낫겠다.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 13. 빙엑스독수리 일기 5개
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'),  '2026-04-01', 'BTCUSDT', '빙엑스 소셜트레이딩 상위 트레이더 포지션 확인', '카피트레이딩으로 수익', 'CALM', '카피트레이딩이 생각보다 괜찮음. 하지만 직접도 해봐야.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'),  '2026-04-03', 'SOLUSDT', 'SOL 바운스 예상, 빙엑스 거래량 증가', '예상대로 반등, 익절', 'CONFIDENT', '직접 분석도 잘 됨. 카피보다 직접이 재밌다.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'),  '2026-04-06', 'ETHUSDT', 'ETH 서포트에서 매수, 커뮤니티 의견 일치', '상승 확인, 익절', 'CALM', '커뮤니티 + 내 분석 일치할 때 확률 높음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'),  '2026-04-10', 'ETHUSDT', 'ETH 2연승 후 자신감으로 포지션 키움', '큰 수익, 하지만 포지션 사이즈 위험했음', 'GREEDY', '수익은 좋았지만 리스크 관리가 안됨. 포지션 사이즈 룰 필요.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx1@test.com'),  '2026-04-20', 'ETHUSDT', '오버트레이딩, 쉴 때임', '급하게 들어가서 손실', 'ANXIOUS', '연속 매매 후 피로도 높음. 쉴 줄도 알아야 함.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 14. 소셜트레이더 일기 5개 (남 따라하기만, 결과 최악)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'),  '2026-04-01', 'BTCUSDT', '유튜버가 비트코인 10만달러 간다고 해서', '진입하자마자 하락, 손절', 'FOMO', '유튜버 말 믿으면 항상 이렇게 됨.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'),  '2026-04-04', 'DOGEUSDT','디스코드 방에서 DOGE 호재라며', '운좋게 올라서 익절', 'CONFIDENT', '이번엔 맞았지만 이런 매매 계속하면 망함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'),  '2026-04-07', 'XRPUSDT', '텔레그램 시그널 따라 XRP 샀다가', '시그널이 틀려서 -12% 손실', 'FEARFUL', '유료 시그널도 믿을거 못됨. 내 공부가 답이다.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'),  '2026-04-11', 'DOGEUSDT','또 DOGE 호재 소식에 FOMO', '또 뻥이었음, 손실', 'ANXIOUS', '같은 실수를 몇 번째 하는건지. 밈코인은 이제 안함.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_bingx2@test.com'),  '2026-04-13', 'BTCUSDT', '그래도 BTC는 믿을 수 있어서 서포트 매수', '다행히 상승, 익절', 'CALM', 'BTC는 그래도 기본이 탄탄하다. 밈코인 말고 BTC/ETH만 하자.', NOW(), NOW())
;

-- ─────────────────────────────────────────────
-- 15. 전천후트레이더 일기 5개 (복합 거래소 경험)
-- ─────────────────────────────────────────────
INSERT INTO trade_journals (user_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email='dummy_multi@test.com'),   '2026-04-01', 'BTCUSDT', '바이낸스 BTC 현물, 장기 상승 추세 확인', '단기 익절. 스윙 매매', 'CALM', '거래소별로 스프레드 다름. 바이낸스 유동성 최고.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'),   '2026-04-03', 'ETHUSDT', '바이비트 ETH, 타 거래소 대비 저평가 구간', '차익거래 성공, 익절', 'CONFIDENT', '거래소간 차익거래도 가능. 바이비트가 조금 더 쌌음.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'),   '2026-04-05', 'BTCUSDT', '비트겟 BTC, 이벤트 보너스 받으면서 매수', '보너스 + 수익, 좋은 매매', 'CALM', '거래소 이벤트 활용하면 추가 수익 가능.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'),   '2026-04-09', 'XRPUSDT', '빙엑스에서 XRP, 카피트레이딩으로 진입', '카피 대상이 손실, 나도 손실', 'ANXIOUS', '카피트레이딩이 항상 좋은건 아님. 직접 판단 필요.', NOW(), NOW()),
((SELECT id FROM users WHERE email='dummy_multi@test.com'),   '2026-04-13', 'BTCUSDT', '바이낸스 BTC 서포트 반등, 기술적 매수', '예상대로 상승, 익절', 'CALM', '여러 거래소 써보니 바이낸스가 젤 편함. 하지만 다양성도 중요.', NOW(), NOW())
;

-- =============================================
-- 일기 ↔ 전략 태그 매핑 (기본 태그 id 1~8 사용)
-- 1=추세추종, 2=역추세, 3=브레이크아웃, 4=지지/저항, 5=이평선, 6=단타, 7=스윙, 8=뇌동매매
-- =============================================
INSERT INTO journal_strategy_tags (journal_id, tag_id)
SELECT j.id, t.id FROM trade_journals j
CROSS JOIN strategy_tags t
WHERE j.user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%')
  AND t.user_id IS NULL
  AND (
    -- 승리 매매 (exit_reason에 익절 포함) → 추세추종, 스윙, 브레이크아웃 등
    (j.exit_reason LIKE '%익절%' AND t.name IN ('추세추종', '스윙', '브레이크아웃', '지지/저항', '이평선'))
    OR
    -- 손실 매매 (exit_reason에 손절 포함) → 뇌동매매, 역추세, 단타
    (j.exit_reason LIKE '%손절%' AND t.name IN ('뇌동매매', '역추세', '단타'))
  )
;
