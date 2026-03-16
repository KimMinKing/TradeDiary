// [파일 용도] 거래소 API Key 등록 페이지 (Upbit / Bybit 선택)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveExchangeKey, getMyExchangeKeys, deleteExchangeKey } from '../api/exchangeApi';

// 거래소별 설정
const EXCHANGE_CONFIG = {
  UPBIT: {
    label: 'Upbit',
    color: '#1677ff',
    bgColor: '#e8f4fd',
    guide: 'Upbit → 마이페이지 → Open API 관리에서 자산조회, 주문조회 권한으로 발급하세요.',
    apiKeyPlaceholder: 'Access Key',
    secretKeyPlaceholder: 'Secret Key',
  },
  BYBIT: {
    label: 'Bybit',
    color: '#f97316',
    bgColor: '#fff7e6',
    guide: 'Bybit → 계정 → API 관리에서 포지션, 주문, 거래 조회 권한으로 발급하세요.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
  },
};

// [컴포넌트] 거래소 API Key 선택 및 등록 화면 / [호출] App.jsx 라우터
const ExchangeKeyPage = () => {
  const navigate = useNavigate();
  const [selectedExchange, setSelectedExchange] = useState('UPBIT');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [registeredExchanges, setRegisteredExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegisteredKeys();
  }, []);

  // 거래소 탭 전환 시 입력 초기화
  const handleSelectExchange = (exchange) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setSecretKey('');
    setMessage('');
    setError('');
  };

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
      await saveExchangeKey(selectedExchange, apiKey.trim(), secretKey.trim());
      const config = EXCHANGE_CONFIG[selectedExchange];
      setMessage(`${config.label} API Key가 등록되었습니다.`);
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
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const config = EXCHANGE_CONFIG[selectedExchange];
  const isRegistered = registeredExchanges.includes(selectedExchange);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>거래소 연동</h2>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← 대시보드</button>
        </div>

        {/* 등록 현황 */}
        {registeredExchanges.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>등록된 거래소</h3>
            {registeredExchanges.map((exchange) => {
              const cfg = EXCHANGE_CONFIG[exchange] || {};
              return (
                <div key={exchange} style={styles.exchangeRow}>
                  <span style={{ ...styles.exchangeBadge, backgroundColor: cfg.color || '#4f46e5' }}>
                    {cfg.label || exchange}
                  </span>
                  <span style={styles.registeredText}>✓ 연동됨</span>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(exchange)}>
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 거래소 선택 탭 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>거래소 선택</h3>
          <div style={styles.exchangeTabs}>
            {Object.entries(EXCHANGE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                style={selectedExchange === key
                  ? { ...styles.exchangeTab, ...styles.exchangeTabActive, borderColor: cfg.color, backgroundColor: cfg.bgColor, color: cfg.color }
                  : styles.exchangeTab
                }
                onClick={() => handleSelectExchange(key)}
              >
                {cfg.label}
                {registeredExchanges.includes(key) && (
                  <span style={{ ...styles.registeredDot, backgroundColor: cfg.color }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API Key 입력 폼 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {config.label} API Key 등록
            {isRegistered && <span style={styles.updateBadge}>덮어쓰기</span>}
          </h3>
          <p style={styles.guideText}>{config.guide}</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder={config.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder={config.secretKeyPlaceholder}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}
            <button
              style={{ ...styles.button, backgroundColor: config.color }}
              type="submit"
              disabled={loading}
            >
              {loading ? '등록 중...' : `${config.label} API Key 등록`}
            </button>
          </form>
        </div>

        {/* 거래 내역 보기 버튼 */}
        {registeredExchanges.length > 0 && (
          <button style={styles.tradeBtn} onClick={() => navigate('/trades')}>
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
  exchangeRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '8px' },
  exchangeBadge: { color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
  registeredText: { flex: 1, color: '#52c41a', fontSize: '14px' },
  deleteBtn: { background: 'none', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px' },
  exchangeTabs: { display: 'flex', gap: '12px' },
  exchangeTab: { flex: 1, padding: '16px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#e8e8e8', borderRadius: '12px', backgroundColor: '#fafafa', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#aaa', position: 'relative' },
  exchangeTabActive: {},
  registeredDot: { display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', marginLeft: '6px', verticalAlign: 'middle' },
  updateBadge: { fontSize: '12px', backgroundColor: '#faad14', color: '#fff', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px' },
  guideText: { fontSize: '13px', color: '#888', marginBottom: '12px', lineHeight: '1.6' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  button: { padding: '12px', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' },
  error: { color: '#e53e3e', fontSize: '13px', margin: 0 },
  success: { color: '#52c41a', fontSize: '13px', margin: 0 },
  tradeBtn: { width: '100%', padding: '12px', backgroundColor: '#52c41a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' },
};

export default ExchangeKeyPage;
