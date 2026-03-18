// [파일 용도] 네비게이션 바 (데스크탑: 상단 고정 / 모바일: 하단 탭)

import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// [컴포넌트] 인증된 페이지 공통 네비게이션 / [호출] Layout.jsx
const Navbar = () => {
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
