// [파일 용도] 상단 네비게이션 바 (로그인 상태 표시 + 로그아웃)

import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// [컴포넌트] 인증된 페이지의 상단 공통 헤더 / [호출] Layout.jsx
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: '대시보드' },
    { path: '/trades',    label: '거래 내역' },
    { path: '/exchange-keys', label: '거래소 연동' },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* 로고 */}
        <span style={styles.logo} onClick={() => navigate('/dashboard')}>
          TradeDiary
        </span>

        {/* 중앙 메뉴 */}
        <div style={styles.menu}>
          {navItems.map((item) => (
            <button
              key={item.path}
              style={location.pathname === item.path ? styles.menuItemActive : styles.menuItem}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 우측: 로그인 상태 + 로그아웃 */}
        <div style={styles.right}>
          {isLoggedIn ? (
            <>
              <span style={styles.loginStatus}>● 로그인 중</span>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <span style={styles.logoutStatus}>● 로그아웃됨</span>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: { backgroundColor: '#1f2937', color: '#fff', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 200 },
  inner: { maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '16px' },
  logo: { fontSize: '17px', fontWeight: 'bold', color: '#fff', cursor: 'pointer', letterSpacing: '-0.3px', whiteSpace: 'nowrap' },
  menu: { display: 'flex', gap: '4px', flex: 1 },
  menuItem: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', padding: '6px 12px', borderRadius: '6px' },
  menuItemActive: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold' },
  right: { display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' },
  loginStatus: { fontSize: '12px', color: '#4ade80' },
  logoutStatus: { fontSize: '12px', color: '#f87171' },
  logoutBtn: { padding: '5px 12px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
};

export default Navbar;
