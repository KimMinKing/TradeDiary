import { useCallback, useEffect, useRef } from 'react';
import { refreshAccessToken } from '../api/authApi';
import { getTokenExpirationMs } from '../utils/jwt';

const HEARTBEAT_MS = 5 * 60 * 1000;
const REFRESH_BEFORE_MS = 60 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export function useActivityRefresh() {
  const lastCheckRef = useRef(0);

  const keepSessionAlive = useCallback(async (force = false) => {
    if (!navigator.onLine || document.visibilityState !== 'visible') return;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    const expiresAt = token ? getTokenExpirationMs(token) : null;
    if (force || !expiresAt || expiresAt - Date.now() <= REFRESH_BEFORE_MS) {
      await refreshAccessToken();
    }
  }, []);

  useEffect(() => {
    const activity = () => {
      const now = Date.now();
      if (now - lastCheckRef.current < ACTIVITY_THROTTLE_MS) return;
      lastCheckRef.current = now;
      void keepSessionAlive();
    };
    const resume = () => {
      if (document.visibilityState === 'visible') void keepSessionAlive();
    };

    void keepSessionAlive();
    const heartbeat = window.setInterval(() => void keepSessionAlive(), HEARTBEAT_MS);
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);

    return () => {
      window.clearInterval(heartbeat);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, activity));
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [keepSessionAlive]);
}

export default useActivityRefresh;
