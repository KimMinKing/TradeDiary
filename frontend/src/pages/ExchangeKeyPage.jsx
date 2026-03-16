// [파일 용도] 거래소 API Key 등록 페이지

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveExchangeKey, getMyExchangeKeys, deleteExchangeKey } from '../api/exchangeApi';

// [컴포넌트] Upbit API Key 입력 및 관리 화면 / [호출] App.jsx 라우터
const ExchangeKeyPage = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [registeredExchanges, setRegisteredExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegisteredKeys();
  }, []);

  const fetchRegisteredKeys = async () => {
    try {
      const res = await getMyExchangeKeys();
      setRegisteredExchanges(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await saveExchangeKey('UPBIT', apiKey, secretKey);
      setMessage('Upbit API Key가 등록되었습니다.');
      setApiKey('');
      setSecretKey('');
      fetchRegisteredKeys();
    } catch (err) {
      setError(err.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exchange) => {
    if (!window.confirm(`${exchange} API Key를 삭제할까요?`)) return;
    try {
      await deleteExchangeKey(exchange);
      setMessage(`${exchange} API Key가 삭제되었습니다.`);
      fetchRegisteredKeys();
    } catch (err) {
      setError('삭제에 실패했습니다.');
    }
  };

  const isUpbitRegistered = registeredExchanges.includes('UPBIT');

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>거래소 연동</h2>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← 대시보드</button>
        </div>

        {/* 등록 현황 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>등록된 거래소</h3>
          {registeredExchanges.length === 0 ? (
            <p style={styles.emptyText}>등록된 거래소가 없습니다.</p>
          ) : (
            registeredExchanges.map((exchange) => (
              <div key={exchange} style={styles.exchangeRow}>
                <span style={styles.exchangeBadge}>{exchange}</span>
                <span style={styles.registeredText}>등록됨</span>
                <button style={styles.deleteBtn} onClick={() => handleDelete(exchange)}>
                  삭제
                </button>
              </div>
            ))
          )}
        </div>

        {/* Upbit Key 입력 폼 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Upbit API Key 등록 {isUpbitRegistered && <span style={styles.updateBadge}>덮어쓰기</span>}
          </h3>
          <p style={styles.guideText}>
            Upbit → 마이페이지 → Open API 관리에서 <strong>자산조회, 주문조회</strong> 권한으로 발급하세요.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Access Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Secret Key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? '등록 중...' : 'API Key 등록'}
            </button>
          </form>
        </div>

        {/* 등록 후 동기화 버튼 */}
        {isUpbitRegistered && (
          <button style={styles.syncBtn} onClick={() => navigate('/trades')}>
            거래 내역 보기 →
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '40px 20px' },
  card: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', maxWidth: '560px', margin: '0 auto', padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '22px' },
  backBtn: { background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#666' },
  section: { marginBottom: '28px' },
  sectionTitle: { fontSize: '16px', marginBottom: '12px', color: '#333' },
  emptyText: { color: '#aaa', fontSize: '14px' },
  exchangeRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
  exchangeBadge: { backgroundColor: '#4f46e5', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
  registeredText: { flex: 1, color: '#52c41a', fontSize: '14px' },
  deleteBtn: { background: 'none', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px' },
  updateBadge: { fontSize: '12px', backgroundColor: '#faad14', color: '#fff', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px' },
  guideText: { fontSize: '13px', color: '#888', marginBottom: '12px', lineHeight: '1.6' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  button: { padding: '12px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
  error: { color: '#e53e3e', fontSize: '13px', margin: 0 },
  success: { color: '#52c41a', fontSize: '13px', margin: 0 },
  syncBtn: { width: '100%', padding: '12px', backgroundColor: '#52c41a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};

export default ExchangeKeyPage;
