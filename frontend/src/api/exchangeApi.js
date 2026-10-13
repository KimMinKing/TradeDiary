// [파일 용도] Exchange API Key 및 Trade history 관련 API 호출

import api from './authApi';
import { cachedGet, invalidateCache } from './requestCache';

const mutate = async (request, ...cachePrefixes) => {
  const response = await request();
  invalidateCache(...cachePrefixes);
  return response;
};

// [용도] Exchange API Key Add / [호출] ExchangeKeyPage.jsx
// Spring Boot SNAKE_CASE Settings으로 인해 snake_case로 전송
// passphrase는 Bitget 전용 (선택 입력)
export const saveExchangeKey = (exchange, apiKey, secretKey, passphrase = null) =>
  mutate(() => api.post('/api/exchange-keys', { exchange, api_key: apiKey, secret_key: secretKey, passphrase }), 'exchange-keys', 'dashboard');

// [용도] Add된 Exchange 목록 조회 / [호출] ExchangeKeyPage.jsx
export const getMyExchangeKeys = () =>
  cachedGet('exchange-keys', () => api.get('/api/exchange-keys'), 30000);

// [용도] Exchange API Key Delete / [호출] ExchangeKeyPage.jsx
export const deleteExchangeKey = (exchange, cleanup = false) =>
  mutate(() => api.delete(`/api/exchange-keys/${exchange}`, { params: { cleanup } }), 'exchange-keys', 'dashboard', 'positions', 'trades');

// [용도] Upbit Trade history Sync / [호출] TradeListPage.jsx
export const syncUpbitTrades = () =>
  requestTradeSync('UPBIT');

// [용도] Bybit Trade history Sync / [호출] TradeListPage.jsx
export const syncBybitTrades = () =>
  requestTradeSync('BYBIT');

// [용도] Bitget Trade history Sync / [호출] TradeListPage.jsx
export const syncBitgetTrades = () =>
  requestTradeSync('BITGET');

// [용도] OKX Trade history Sync / [호출] TradeListPage.jsx
export const syncOkxTrades = () =>
  requestTradeSync('OKX');

// [용도] Binance Trade history Sync / [호출] TradeListPage.jsx
export const syncBinanceTrades = () =>
  requestTradeSync('BINANCE');

// [용도] BingX Trade history Sync / [호출] TradeListPage.jsx
export const syncBingxTrades = () =>
  requestTradeSync('BINGX');

// [용도] Trade history Sync (Trade사별) / [호출] TradeSync.jsx
export const syncTrades = (exchange) => {
  return requestTradeSync(exchange);
};

export const getSyncStatus = () => api.get('/api/sync/status');
export const reportSyncActivity = () => api.post('/api/sync/activity');
export const requestTradeSync = (exchange = null) =>
  api.post('/api/sync/request', null, { params: exchange ? { exchange } : {} });

// [용도] Trade 목록 조회 (exchange: 'UPBIT'|'BYBIT'|null=All) / [호출] TradeListPage.jsx
export const getTrades = (exchange = null) =>
  cachedGet(`trades:${exchange ?? 'ALL'}`, () => api.get('/api/trades', { params: exchange ? { exchange } : {} }), 10000);

// [용도] 포지션 목록 조회 (exchange: 'UPBIT'|'BYBIT'|null=All) / [호출] PositionListPage.jsx
export const getPositions = (exchange = null) =>
  cachedGet(`positions:${exchange ?? 'ALL'}`, () => api.get('/api/positions', { params: exchange ? { exchange } : {} }), 10000);

// [용도] 포지션 수동 재계산 (특정 Exchange) / [호출] PositionListPage.jsx
export const rebuildPositions = (exchange) =>
  api.post('/api/positions/rebuild', null, { params: { exchange } });

// [용도] Add된 모든 Exchange 포지션 일괄 재계산 / [호출] PositionListPage.jsx
export const rebuildAllPositions = () =>
  api.post('/api/positions/rebuild/all');

// [용도] 미Exit(오픈) 포지션 윈도우 조회 / [호출] PositionListPage.jsx
export const getOpenWindows = (exchange) =>
  api.get('/api/positions/open', { params: { exchange } });

// [용도] Performance statistics 조회 / [호출] StatsPage.jsx
export const getStats = (exchange = null) =>
  cachedGet(`stats:${exchange ?? 'ALL'}`, () => api.get('/api/stats', { params: exchange && exchange !== 'ALL' ? { exchange } : {} }), 20000);

// [용도] AI 트레이딩 리포트 생성 / [호출] StatsPage.jsx
export const generateAiReport = (exchange = null) =>
  api.post('/api/ai/report', null, { params: exchange && exchange !== 'ALL' ? { exchange } : {} });

// [용도] Add된 Exchange의 현재 Holdings 조회 / [호출] HoldingsPage.jsx
export const getBalances = () =>
  cachedGet('balances', () => api.get('/api/balances'), 12000);

// [용도] 대시보드 종합 data 조회 / [호출] DashboardPage.jsx
export const getDashboard = () =>
  cachedGet('dashboard', () => api.get('/api/dashboard'), 15000);

// ── Trade plans 메모 API ─────────────────────────────────────────────

// [용도] 계획 목록 조회 / [호출] TradePlanPage.jsx
export const getPlans = () =>
  api.get('/api/trade-plans');

// [용도] 계획 생성 / [호출] TradePlanPage.jsx
export const createPlan = (data) =>
  api.post('/api/trade-plans', data);

// [용도] 계획 Edit / [호출] TradePlanPage.jsx
export const updatePlan = (id, data) =>
  api.put(`/api/trade-plans/${id}`, data);

// [용도] complete 토글 / [호출] TradePlanPage.jsx
export const togglePlanDone = (id) =>
  api.patch(`/api/trade-plans/${id}/done`);

// [용도] 계획 Delete / [호출] TradePlanPage.jsx
export const deletePlan = (id) =>
  api.delete(`/api/trade-plans/${id}`);

// ── 트레이더 유형 analysis API ──────────────────────────────────────────

// [용도] 트레이더 유형 analysis 결과 조회 / [호출] TraderTypePage.jsx
export const getTraderType = () =>
  api.get('/api/trader-type');

// [용도] 트레이더 유형 AI 코칭 조회 (캐시 우선) / [호출] TraderTypePage.jsx
export const getTraderTypeAdvice = () =>
  api.get('/api/trader-type/advice');

// [용도] 트레이더 유형 AI 코칭 강제 재생성 / [호출] TraderTypePage.jsx (Refresh analysis 버튼)
export const refreshTraderTypeAdvice = () =>
  api.post('/api/trader-type/advice/refresh');

// ── 월별 목표 API ───────────────────────────────────────────────────

// [용도] 이번 달 목표 및 달성 현황 조회 / [호출] DashboardPage.jsx
export const getMonthlyGoal = () =>
  cachedGet('monthly-goal', () => api.get('/api/goals/monthly'), 30000);

// [용도] 이번 달 목표 Settings/Edit / [호출] DashboardPage.jsx
export const saveMonthlyGoal = (data) =>
  mutate(() => api.put('/api/goals/monthly', data), 'monthly-goal', 'dashboard');

export const deleteMonthlyGoal = () =>
  mutate(() => api.delete('/api/goals/monthly'), 'monthly-goal', 'dashboard');

// ── Ranking API ────────────────────────────────────────────────────────

// [용도] 이번 달 Win rate 기준 Ranking 조회 / [호출] RankingPage.jsx
export const getMonthlyRanking = (category = 'score') =>
  api.get('/api/ranking/monthly', { params: { category } });

export const getFollowingFeed = (limit = 30) =>
  api.get('/api/feed/following', { params: { limit } });

// [용도] 다른 사용자의 공 Journal 조회 / [호출] RankingPage.jsx
export const getPublicJournals = (userId) =>
  api.get(`/api/journals/public/${userId}`);

export const getPublicJournalImage = (userId, journalId) =>
  api.get(`/api/journals/public/${userId}/${journalId}/image`);

// [용도] Journal 공/Private 토글 / [호출] SettingsPanel.jsx
export const updateDiaryPublic = (diaryPublic) =>
  api.patch('/api/user/diary-public', { diary_public: diaryPublic });

// ── 공 Profile API ──────────────────────────────────────────────

// [용도] 다른 사용자의 공 Profile 조회 / [호출] TraderProfilePage.jsx
export const getPublicProfile = (userId) =>
  api.get(`/api/user/public/${userId}/profile`);

// [용도] 다른 사용자의 공 Strategy statistics 조회 / [호출] TraderProfilePage.jsx
export const getPublicStats = (userId) =>
  api.get(`/api/user/public/${userId}/stats`);

export const getPublicPortfolio = (userId, period = 'all') =>
  api.get(`/api/user/public/${userId}/portfolio`, { params: { period } });

// [용도] 다른 사용자의 공 포지션 조회 / [호출] TraderProfilePage.jsx
export const getPublicPositions = (userId) =>
  api.get(`/api/positions/public/${userId}`);

// [용도] 다른 사용자의 공 Trade history 조회 / [호출] TraderProfilePage.jsx
export const getPublicTrades = (userId) =>
  api.get(`/api/trades/public/${userId}`);

// ── 팔로우 API ────────────────────────────────────────────────────────

// [용도] 사용자 팔로우 / [호출] TraderProfilePage.jsx
export const followUser = (followingId) =>
  api.post(`/api/follows/${followingId}`);

// [용도] 사용자 언팔로우 / [호출] TraderProfilePage.jsx
export const unfollowUser = (followingId) =>
  api.delete(`/api/follows/${followingId}`);

// [용도] 팔로우 상태 Confirm / [호출] TraderProfilePage.jsx
export const checkFollowStatus = (followingId) =>
  api.get(`/api/follows/${followingId}/status`);

export const updateTradeAlerts = (followingId, enabled) =>
  api.put(`/api/follows/${followingId}/trade-alerts`, { enabled });

// [용도] 내 팔로잉 목록 조회 / [호출] 팔로잉 관리 페이지
export const getMyFollowings = () =>
  api.get('/api/follows/following');

// [용도] 특정 사용자의 Followers 목록 조회 / [호출] TraderProfilePage.jsx
export const getFollowers = (userId) =>
  api.get(`/api/follows/followers/${userId}`);

// [용도] 팔로잉/Followers 수 조회 / [호출] TraderProfilePage.jsx
export const getFollowCount = (userId) =>
  api.get(`/api/follows/${userId}/count`);
