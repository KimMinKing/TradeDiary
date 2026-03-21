// [파일 용도] 거래소 자동 동기화 훅 (등록된 거래소 주기적 동기화)

import { useState, useEffect, useRef, useCallback } from 'react';
import { getMyExchangeKeys, syncUpbitTrades, syncBybitTrades, syncBitgetTrades, syncOkxTrades, syncBinanceTrades, syncBingxTrades } from '../api/exchangeApi';

const SYNC_FN = {
  UPBIT:   syncUpbitTrades,
  BYBIT:   syncBybitTrades,
  BITGET:  syncBitgetTrades,
  OKX:     syncOkxTrades,
  BINANCE: syncBinanceTrades,
  BINGX:   syncBingxTrades,
};

const INTERVAL_KEY = 'autoSyncInterval';
const DEFAULT_INTERVAL = 60; // 초

// [훅] 등록된 거래소를 주기적으로 자동 동기화 / [호출] Layout.jsx
const useAutoSync = () => {
  const [intervalSec, setIntervalSecState] = useState(
    () => parseInt(localStorage.getItem(INTERVAL_KEY) || DEFAULT_INTERVAL, 10)
  );
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const timerRef    = useRef(null);
  const syncingRef  = useRef(false); // interval 중복 실행 방지

  // [용도] 등록된 거래소 목록 조회 후 순서대로 동기화 / [호출] interval 콜백
  const runSync = useCallback(async () => {
    // 탭이 숨겨진 상태이거나 이미 동기화 중이면 건너뜀
    if (document.visibilityState !== 'visible' || syncingRef.current) return;

    let exchanges = [];
    try {
      const res = await getMyExchangeKeys();
      exchanges = res.data.map((item) =>
        typeof item === 'string' ? item : item.exchange
      );
    } catch {
      return; // 키 조회 실패 시 무시
    }

    if (exchanges.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      for (const exchange of exchanges) {
        const syncFn = SYNC_FN[exchange];
        if (!syncFn) continue;
        try {
          await syncFn();
        } catch {
          // 개별 거래소 실패는 무시하고 다음 거래소로
        }
      }
      const now = new Date();
      setLastSyncAt(now);
      // 동기화 완료 후 열려있는 페이지가 데이터를 다시 조회하도록 이벤트 발행
      window.dispatchEvent(new CustomEvent('autoSyncComplete', { detail: { syncedAt: now } }));
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // [용도] interval 설정 변경 및 타이머 재등록 / [호출] setIntervalSec, syncIntervalChange 이벤트
  const setIntervalSec = useCallback((sec) => {
    localStorage.setItem(INTERVAL_KEY, sec);
    setIntervalSecState(sec);
  }, []);

  // [용도] SettingsPanel에서 발행하는 syncIntervalChange 이벤트 수신 / [호출] useEffect
  useEffect(() => {
    const handler = (e) => setIntervalSec(e.detail);
    window.addEventListener('syncIntervalChange', handler);
    return () => window.removeEventListener('syncIntervalChange', handler);
  }, [setIntervalSec]);

  // [용도] intervalSec 변경 시 타이머 재등록 / [호출] useEffect
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalSec === 0) return; // OFF

    timerRef.current = setInterval(runSync, intervalSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [intervalSec, runSync]);

  return { isSyncing, lastSyncAt, intervalSec, setIntervalSec };
};

export default useAutoSync;
