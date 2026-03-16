// [파일 용도] 대시보드 페이지 (로그인 후 메인 화면)

import { useNavigate } from 'react-router-dom';

// [컴포넌트] 로그인 후 메인 화면 / [호출] App.jsx 라우터
const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>대시보드</h1>
        <p style={styles.text}>거래소를 연동하고 거래 내역을 확인해보세요.</p>
        <div style={styles.btnGroup}>
          <button style={styles.primaryBtn} onClick={() => navigate('/exchange-keys')}>
            거래소 연동
          </button>
          <button style={styles.primaryBtn} onClick={() => navigate('/trades')}>
            거래 내역
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: 'calc(100vh - 52px)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' },
  card: { backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '400px' },
  title: { marginBottom: '16px' },
  text: { color: '#666', marginBottom: '24px' },
  btnGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  primaryBtn: { padding: '12px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};

export default DashboardPage;
