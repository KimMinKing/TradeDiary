import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore, { getUserId } from '../store/authStore';
import { getMe } from '../api/userApi';
import { notificationApi } from '../api/notificationApi';
import Notifications from './Notifications/Notifications';
import ProfileQuickMenu from './ProfileQuickMenu';
import { useNotification } from '../hooks/useNotification';
import brandLogo from '../assets/logo1.png';
import { useLocale } from '../i18n/localeContext';

const NAV_ITEMS = [
  ['/positions', 'Performance'], ['/journal', 'Journal'], ['/community', 'Community'], ['/ranking', 'Ranking'], ['/settings', 'Settings'],
];

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const location = useLocation();
  const { isLoggedIn, logout } = useAuthStore();
  const [profile, setProfile] = useState({ nickname: '', avatar: null });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCompactMenu, setShowCompactMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveNotification, setLiveNotification] = useState(null);
  const [toasts, setToasts] = useState([]);
  const receivedIds = useRef(new Set());
  const userId = getUserId();

  useNotification({ userId, onNotification: (notification) => {
    if (receivedIds.current.has(notification.id)) return;
    receivedIds.current.add(notification.id);
    if (receivedIds.current.size > 100) receivedIds.current.delete(receivedIds.current.values().next().value);
    setUnreadCount((value) => value + 1);
    setLiveNotification(notification);
    setToasts((items) => [...items.slice(-2), notification]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== notification.id)), 5500);
  }});

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    getMe().then((response) => setProfile(response.data)).catch(() => {});
    const update = (event) => setProfile((current) => ({ ...current, ...event.detail }));
    window.addEventListener('profileUpdated', update);
    return () => window.removeEventListener('profileUpdated', update);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const refresh = () => notificationApi.getUnreadCount().then((response) => setUnreadCount(response?.count ?? 0)).catch(() => {});
    refresh(); const timer = window.setInterval(refresh, 120000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn]);

  useEffect(() => {
    const handleLogout = async () => { await logout(); navigate('/'); };
    window.addEventListener('requestLogout', handleLogout);
    return () => window.removeEventListener('requestLogout', handleLogout);
  }, [logout, navigate]);

  const isActive = (path) => location.pathname === path || ({
    '/positions': ['/trades', '/holdings', '/stats', '/trader-type'], '/journal': ['/plans'],
  }[path] || []).includes(location.pathname);
  const avatar = profile.avatar ? <img src={profile.avatar} alt="Profile" /> : <span>{profile.nickname?.[0] || 'T'}</span>;
  const openNotifications = () => {
    setShowProfile(false);
    setShowNotifications(true);
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  };

  return <>
    <header className="terminal-topbar">
      <button className="terminal-brand" onClick={() => navigate('/dashboard')}>
        <img src={brandLogo} alt="Trade Diary" />
        <span>TRADEDIARY</span>
      </button>
      <nav className="terminal-nav">
        {NAV_ITEMS.map(([path, label]) => <button key={path} className={isActive(path) ? 'active' : ''}
          onClick={() => navigate(path)}>{t(label)}</button>)}
      </nav>
      <div className="terminal-tools">
        <span className="terminal-status"><i /> LIVE</span>
        <button className="terminal-icon-button" onClick={openNotifications} aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</button>
        <button className={`terminal-profile${showProfile ? ' active' : ''}`} onClick={() => { setShowNotifications(false); setShowProfile(value => !value); }}>
          <span className="terminal-avatar">{avatar}</span><span><strong>{profile.nickname || 'Trader'}</strong><small>ACCOUNT</small></span>
        </button>
        <button className="terminal-menu-toggle" onClick={() => setShowCompactMenu(value => !value)} aria-label="Open navigation" aria-expanded={showCompactMenu}>
          <span /><span /><span />
        </button>
      </div>
    </header>

    <nav className={`terminal-mobile-nav${showCompactMenu ? ' open' : ''}`}>
      {NAV_ITEMS.map(([path, label]) => <button key={path} className={isActive(path) ? 'active' : ''}
        onClick={() => { navigate(path); setShowCompactMenu(false); }}><span>{t(label)}</span></button>)}
    </nav>

    <div className="notification-toast-stack" aria-live="polite">
      {toasts.map((notification) => <button key={notification.id} className="notification-toast"
        onClick={() => { setToasts((items) => items.filter((item) => item.id !== notification.id)); openNotifications(); }}>
        <span className="notification-toast-pulse" /><span className="notification-toast-copy"><strong>{notification.title}</strong>
          <span>{notification.message}</span></span><span className="notification-toast-time">NOW</span></button>)}
    </div>
    {showNotifications && <Notifications liveNotification={liveNotification} onClose={() => {
      setShowNotifications(false);
      notificationApi.getUnreadCount().then((response) => setUnreadCount(response?.count ?? 0)).catch(() => {});
    }} />}
    {showProfile && <ProfileQuickMenu profile={profile} onProfileChange={setProfile} onClose={() => setShowProfile(false)} onLogout={async () => { setShowProfile(false); await logout(); navigate('/'); }} />}
  </>;
};

export default Navbar;
