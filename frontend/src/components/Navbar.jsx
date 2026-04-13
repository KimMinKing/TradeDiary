// [파일 용도] 네비게이션 바 (데스크탑: 상단 고정 / 모바일: 하단 탭)

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import SettingsPanel from './SettingsPanel';
import { getMe } from '../api/userApi';

// [컴포넌트] 인증된 페이지 공통 네비게이션 / [호출] Layout.jsx
const Navbar = ({ autoSync }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isLoggedIn, logout } = useAuthStore();
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [settingsTab,   setSettingsTab]   = useState('profile'); // 'profile' | 'preferences'
  const [notifications, setNotifications] = useState([]); // 알림 목록 (추후 연동)
  const [profile, setProfile] = useState({ nickname: '', avatar: null });

  // [용도] 로그인 시 프로필 정보 로드 / [호출] 마운트 + profileUpdated 이벤트
  useEffect(() => {
    if (!isLoggedIn) return;
    getMe().then((res) => setProfile(res.data)).catch(() => {});
    const onUpdate = (e) => setProfile((prev) => ({ ...prev, ...e.detail }));
    window.addEventListener('profileUpdated', onUpdate);
    return () => window.removeEventListener('profileUpdated', onUpdate);
  }, [isLoggedIn]);

  // [용도] 로그아웃 요청 이벤트 수신 (SettingsPanel에서 발행) / [호출] useEffect
  useEffect(() => {
    const handleLogoutRequest = async () => {
      await logout();
      navigate('/');
    };
    window.addEventListener('requestLogout', handleLogoutRequest);
    return () => window.removeEventListener('requestLogout', handleLogoutRequest);
  }, [logout, navigate]);

  // [용도] 설정 패널에서 통화 변경 시 표시 동기화 / [호출] currencyChange 이벤트
  useEffect(() => {
    const handler = (e) => setCurrency(e.detail);
    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);
  }, []);

  const navItems = [
    { path: '/trades',        label: '거래 내역',  icon: '≡' },
    { path: '/positions',     label: '포지션',     icon: '◈' },
    { path: '/holdings',      label: '보유 자산',  icon: '💰' },
    { path: '/stats',         label: '통계',       icon: '📊' },
    { path: '/journal',       label: '매매 일기',  icon: '📓' },
    { path: '/plans',         label: '매매 계획',  icon: '📋' },
    { path: '/news',          label: '코인 뉴스',  icon: '📰' },
    { path: '/exchange-keys', label: '거래소 연동', icon: '⚙' },
  ];

  const isActive = (path) => location.pathname === path;

  // [용도] 아바타 버튼 내용 (이미지 또는 닉네임 첫 글자) / [호출] 렌더링
  const avatarContent = profile.avatar
    ? <img src={profile.avatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : (profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?');

  return (
    <>
      {/* ── 데스크탑 상단 바 ── */}
      <nav className="top-nav">
        <div className="top-nav-inner">
          <span className="nav-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/favicon.svg" alt="logo" style={{ width: '21px', height: '21px' }} />
            Trade Diary
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
            {isLoggedIn && (
              <>
                <button
                  className="avatar-btn"
                  onClick={() => { setSettingsTab('profile'); setSettingsOpen((v) => !v); }}
                  title="프로필"
                >
                  {avatarContent}
                </button>
                <button className="nav-bell-btn" title="알림">
                  🔔
                  {notifications.length > 0 && <span className="nav-bell-dot" />}
                </button>
                <button
                  className="nav-gear-btn"
                  onClick={() => { setSettingsTab('preferences'); setSettingsOpen(true); }}
                  title="환경설정"
                >
                  ⚙
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 모바일 상단 바 (로고 + 통화 + 아바타) ── */}
      <div className="mobile-top-bar">
        <span className="nav-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/favicon.svg" alt="logo" style={{ width: '15px', height: '15px' }} />
          Trade Diary
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isLoggedIn && (
            <button
              className="avatar-btn"
              onClick={() => setSettingsOpen((v) => !v)}
              title="설정"
            >
              {avatarContent}
            </button>
          )}
        </div>
      </div>

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
        </div>
      </nav>

      {/* ── 설정 패널 (단일 인스턴스, fixed 위치) ── */}
      {isLoggedIn && settingsOpen && (
        <SettingsPanel initialTab={settingsTab} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
};

export default Navbar;
