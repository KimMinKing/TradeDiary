// [파일 용도] 우측 하단 세션 만료 카운트다운 + 클릭 시 수동 갱신

import { useState, useEffect } from 'react';
import { refreshAccessToken } from '../api/authApi';
import { getTokenExpirationMs } from '../utils/jwt';

// [컴포넌트] AccessToken 남은 수명을 mm:ss 로 표시 / [호출] Layout.jsx
// useActivityRefresh 가 토큰을 교체하면 매초 재계산되어 자동 리셋됨
const SessionTimer = () => {
  const [remainingMs, setRemainingMs] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // [용도] AccessToken 남은 수명 계산 / [호출] 마운트 + 매초
  useEffect(() => {
    const calc = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setRemainingMs(null);
        return;
      }
      const expiresAt = getTokenExpirationMs(token);
      if (expiresAt === null) {
        setRemainingMs(null);
        return;
      }
      const ms = expiresAt - Date.now();
      setRemainingMs(ms > 0 ? ms : 0);
    };
    // 매초 재계산: 갱신된 토큰(새 exp)도 자동 반영
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  // [용도] 클릭 시 AccessToken 수동 갱신 / [호출] 버튼 onClick
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);

    const success = await refreshAccessToken();
    if (!success) {
      // refreshAccessToken()에서 이미 로그아웃 처리를 했으므로 여기서는 에러 표시만
      setError('Refresh failed');
      setTimeout(() => setError(null), 3000);
    }
    setRefreshing(false);
    // 다음 interval tick(최대 1초)에 갱신된 토큰 기준으로 카운트다운 리셋
  };

  // Sign in 전/토큰 없음 → 미표시
  if (remainingMs === null) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // 임박 구간(5분 이하) 시각 강조
  const urgent = remainingMs <= 5 * 60 * 1000;

  return (
    <button
      onClick={handleRefresh}
      title={error ? 'Refresh failed — try again' : 'Extend session'}
      style={{
        position: 'fixed',
        // bottom: 모바일 하단 탭바(약 56px) 위에 뜨도록 여유
        bottom: '70px',
        right: '16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '999px',
        background: error ? 'rgba(239, 68, 68, 0.95)' : (urgent ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 30, 42, 0.85)'),
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'monospace',
        cursor: refreshing ? 'wait' : 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        opacity: refreshing ? 0.6 : 1,
        transition: 'opacity 0.15s, background 0.2s',
        userSelect: 'none',
      }}
    >
      <span>{error ? '❌' : (urgent ? '⚠' : '⏱')}</span>
      <span>{refreshing ? 'Extending…' : (error ? error : formatted)}</span>
    </button>
  );
};

export default SessionTimer;
