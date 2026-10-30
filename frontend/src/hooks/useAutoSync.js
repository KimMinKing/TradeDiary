import { useCallback, useEffect, useRef, useState } from 'react';
import { getSyncStatus, reportSyncActivity, requestTradeSync } from '../api/exchangeApi';
import { invalidateCache } from '../api/requestCache';

const useAutoSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const versionRef = useRef(null);
  const pollingRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (document.visibilityState !== 'visible' || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const { data } = await getSyncStatus();
      setIsSyncing(Boolean(data.syncing));
      if (versionRef.current !== null && data.version !== versionRef.current) {
        invalidateCache('dashboard', 'positions', 'trades', 'stats', 'balances');
        setLastSyncAt(new Date());
        window.dispatchEvent(new CustomEvent('autoSyncComplete', { detail: { version: data.version } }));
      }
      versionRef.current = data.version;
    } finally { pollingRef.current = false; }
  }, []);

  const requestSync = useCallback(async exchange => {
    await requestTradeSync(exchange);
    setIsSyncing(true);
    void checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    void reportSyncActivity();
    void checkStatus();
    const statusTimer = window.setInterval(checkStatus, 10_000);
    const activityTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reportSyncActivity();
    }, 60_000);
    const visible = () => { if (document.visibilityState === 'visible') { void reportSyncActivity(); void checkStatus(); } };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => { window.clearInterval(statusTimer); window.clearInterval(activityTimer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible); };
  }, [checkStatus]);

  return { isSyncing, lastSyncAt, requestSync };
};

export default useAutoSync;
