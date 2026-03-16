// [파일 용도] 대시보드 페이지 (로그인 후 메인 화면 임시)

import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// [컴포넌트] 로그인 후 메인 화면 (임시) / [호출] App.jsx 라우터
const DashboardPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>대시보드</h1>
        <p style={styles.text}>로그인 성공! 거래소 연동 후 이곳에 데이터가 표시됩니다.</p>
        <button style={styles.button} onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  title: { marginBottom: '16px' },
  text: { color: '#666', marginBottom: '32px' },
  button: {
    padding: '12px 24px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

export default DashboardPage;
