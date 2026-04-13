// [파일 용도] 거래소 API Key 및 거래 내역 관련 API 호출

import api from './authApi';

// [용도] 거래소 API Key 등록 / [호출] ExchangeKeyPage.jsx
// Spring Boot SNAKE_CASE 설정으로 인해 snake_case로 전송
// passphrase는 Bitget 전용 (선택 입력)
export const saveExchangeKey = (exchange, apiKey, secretKey, passphrase = null) =>
  api.post('/api/exchange-keys', { exchange, api_key: apiKey, secret_key: secretKey, passphrase });

// [용도] 등록된 거래소 목록 조회 / [호출] ExchangeKeyPage.jsx
export const getMyExchangeKeys = () =>
  api.get('/api/exchange-keys');

// [용도] 거래소 API Key 삭제 / [호출] ExchangeKeyPage.jsx
export const deleteExchangeKey = (exchange) =>
  api.delete(`/api/exchange-keys/${exchange}`);

// [용도] Upbit 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncUpbitTrades = () =>
  api.post('/api/trades/sync/upbit');

// [용도] Bybit 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncBybitTrades = () =>
  api.post('/api/trades/sync/bybit');

// [용도] Bitget 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncBitgetTrades = () =>
  api.post('/api/trades/sync/bitget');

// [용도] OKX 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncOkxTrades = () =>
  api.post('/api/trades/sync/okx');

// [용도] Binance 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncBinanceTrades = () =>
  api.post('/api/trades/sync/binance');

// [용도] BingX 거래 내역 동기화 / [호출] TradeListPage.jsx
export const syncBingxTrades = () =>
  api.post('/api/trades/sync/bingx');

// [용도] 거래 목록 조회 (exchange: 'UPBIT'|'BYBIT'|null=전체) / [호출] TradeListPage.jsx
export const getTrades = (exchange = null) =>
  api.get('/api/trades', { params: exchange ? { exchange } : {} });

// [용도] 포지션 목록 조회 (exchange: 'UPBIT'|'BYBIT'|null=전체) / [호출] PositionListPage.jsx
export const getPositions = (exchange = null) =>
  api.get('/api/positions', { params: exchange ? { exchange } : {} });

// [용도] 포지션 수동 재계산 (특정 거래소) / [호출] PositionListPage.jsx
export const rebuildPositions = (exchange) =>
  api.post('/api/positions/rebuild', null, { params: { exchange } });

// [용도] 등록된 모든 거래소 포지션 일괄 재계산 / [호출] PositionListPage.jsx
export const rebuildAllPositions = () =>
  api.post('/api/positions/rebuild/all');

// [용도] 미청산(오픈) 포지션 윈도우 조회 / [호출] PositionListPage.jsx
export const getOpenWindows = (exchange) =>
  api.get('/api/positions/open', { params: { exchange } });

// [용도] 성과 통계 조회 / [호출] StatsPage.jsx
export const getStats = (exchange = null) =>
  api.get('/api/stats', { params: exchange && exchange !== 'ALL' ? { exchange } : {} });

// [용도] AI 트레이딩 리포트 생성 / [호출] StatsPage.jsx
export const generateAiReport = (exchange = null) =>
  api.post('/api/ai/report', null, { params: exchange && exchange !== 'ALL' ? { exchange } : {} });

// [용도] 등록된 거래소의 현재 보유 자산 조회 / [호출] HoldingsPage.jsx
export const getBalances = () =>
  api.get('/api/balances');

// [용도] 대시보드 종합 데이터 조회 / [호출] DashboardPage.jsx
export const getDashboard = () =>
  api.get('/api/dashboard');

// ── 매매 계획 메모 API ─────────────────────────────────────────────

// [용도] 계획 목록 조회 / [호출] TradePlanPage.jsx
export const getPlans = () =>
  api.get('/api/trade-plans');

// [용도] 계획 생성 / [호출] TradePlanPage.jsx
export const createPlan = (data) =>
  api.post('/api/trade-plans', data);

// [용도] 계획 수정 / [호출] TradePlanPage.jsx
export const updatePlan = (id, data) =>
  api.put(`/api/trade-plans/${id}`, data);

// [용도] 완료 토글 / [호출] TradePlanPage.jsx
export const togglePlanDone = (id) =>
  api.patch(`/api/trade-plans/${id}/done`);

// [용도] 계획 삭제 / [호출] TradePlanPage.jsx
export const deletePlan = (id) =>
  api.delete(`/api/trade-plans/${id}`);
