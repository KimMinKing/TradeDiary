// [파일 용도] 거래소 API Key 및 거래 내역 관련 API 호출

import api from './authApi';

// [용도] 거래소 API Key 등록 / [호출] ExchangeKeyPage.jsx
// Spring Boot SNAKE_CASE 설정으로 인해 snake_case로 전송
export const saveExchangeKey = (exchange, apiKey, secretKey) =>
  api.post('/api/exchange-keys', { exchange, api_key: apiKey, secret_key: secretKey });

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

// [용도] 거래 목록 조회 (exchange: 'UPBIT'|'BYBIT'|null=전체) / [호출] TradeListPage.jsx
export const getTrades = (exchange = null) =>
  api.get('/api/trades', { params: exchange ? { exchange } : {} });
