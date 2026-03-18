// [파일 용도] 네비게이션 바 (데스크탑: 상단 고정 / 모바일: 하단 탭)

import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const INTERVAL_OPTIONS = [
  { value: 30,  label: '30초' },
  { value: 60,  label: '1분' },
  { value: 300, label: '5분' },
  { value: 0,   label: 'OFF' },
];

// [컴포넌트] 인증된 페이지 공통 네비게이션 / [호출] Layout.jsx
const Navbar = ({ autoSync }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isLoggedIn, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard',    label: '대시보드', icon: '⊞' },
    { path: '/trades',       label: '거래 내역', icon: '≡' },
    { path: '/positions',    label: '포지션',    icon: '◈' },
    { path: '/stats',        label: '통계',      icon: '📊' },
    { path: '/journal',      label: '매매 일기', icon: '📓' },
    { path: '/exchange-keys', label: '거래소 연동', icon: '⚙' },
  ];

  const isActive = (path) => location.pathname === path;

  // [용도] 마지막 동기화 시각을 "HH:MM:SS" 형식으로 표시
  const fmtTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const { isSyncing, lastSyncAt, intervalSec, setIntervalSec } = autoSync ?? {};

  return (
    <>
      {/* ── 데스크탑 상단 바 ── */}
      <nav className="top-nav">
        <div className="top-nav-inner">
          <span className="nav-logo" onClick={() => navigate('/dashboard')}>
            TradeDiary
          </span>

          <div className="nav-menu">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item${isActive(item.path) ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="nav-right">
            {/* 자동 동기화 상태 */}
            {autoSync && (
              <div className="auto-sync-wrap">
                {/* 주기 선택 드롭다운 */}
                <select
                  className="auto-sync-select"
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  title="자동 동기화 주기"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* 동기화 상태 표시 */}
                {intervalSec > 0 && (
                  <span className={`auto-sync-status ${isSyncing ? 'syncing' : 'idle'}`}>
                    {isSyncing ? '동기화 중...' : lastSyncAt ? `${fmtTime(lastSyncAt)} 동기화됨` : '자동 동기화 ON'}
                  </span>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <>
                <span className="nav-status-online">● 로그인 중</span>
                <button className="nav-logout" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <span className="nav-status-offline">● 세션 만료</span>
            )}
          </div>
        </div>
      </nav>

      {/* ── 모바일 하단 탭 바 ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`bottom-nav-item${isActive(item.path) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button className="bottom-nav-item" onClick={handleLogout}>
            <span className="bottom-nav-icon">⎋</span>
            <span>로그아웃</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
