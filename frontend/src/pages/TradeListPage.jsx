// [파일 용도] 거래 내역 목록 페이지

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrades, syncUpbitTrades } from '../api/exchangeApi';

// [컴포넌트] 거래 내역 목록 및 Upbit 동기화 화면 / [호출] App.jsx 라우터
const TradeListPage = () => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await getTrades();
      setTrades(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return; // 중복 요청 방지
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await syncUpbitTrades();
      setSyncMessage(`동기화 완료: ${res.data.savedCount}건 새로 저장되었습니다.`);
      fetchTrades();
    } catch (e) {
      setSyncMessage('동기화에 실패했습니다. API Key를 확인해주세요.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        {/* 헤더 */}
        <div style={styles.header}>
          <h2 style={styles.title}>거래 내역</h2>
          <div style={styles.headerActions}>
            <button style={styles.keyBtn} onClick={() => navigate('/exchange-keys')}>
              거래소 연동 설정
            </button>
            <button style={styles.syncBtn} onClick={handleSync} disabled={syncing}>
              {syncing ? '동기화 중...' : 'Upbit 동기화'}
            </button>
          </div>
        </div>

        {syncMessage && (
          <p style={syncMessage.includes('실패') ? styles.error : styles.success}>
            {syncMessage}
          </p>
        )}

        {/* 거래 목록 */}
        {loading ? (
          <p style={styles.emptyText}>불러오는 중...</p>
        ) : trades.length === 0 ? (
          <div style={styles.emptyBox}>
            <p>거래 내역이 없습니다.</p>
            <p style={styles.emptyGuide}>Upbit 동기화 버튼을 눌러 거래 내역을 가져오세요.</p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th>거래소</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>가격</th>
                  <th>수수료</th>
                  <th>체결일시</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} style={styles.tr}>
                    <td style={styles.td}>{trade.exchange}</td>
                    <td style={styles.td}>{trade.symbol}</td>
                    <td style={styles.td}>
                      <span style={trade.side === 'BUY' ? styles.buy : styles.sell}>
                        {trade.side === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td style={styles.td}>{Number(trade.qty).toLocaleString()}</td>
                    <td style={styles.td}>{Number(trade.price).toLocaleString()}원</td>
                    <td style={styles.td}>{Number(trade.fee).toLocaleString()}</td>
                    <td style={styles.td}>{trade.tradedAt.replace('T', ' ').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '40px 20px' },
  inner: { maxWidth: '960px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '22px' },
  headerActions: { display: 'flex', gap: '10px' },
  keyBtn: { padding: '8px 16px', background: 'none', border: '1px solid #4f46e5', color: '#4f46e5', borderRadius: '8px', cursor: 'pointer' },
  syncBtn: { padding: '8px 16px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  success: { color: '#52c41a', marginBottom: '12px', fontSize: '14px' },
  error: { color: '#e53e3e', marginBottom: '12px', fontSize: '14px' },
  emptyBox: { textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#fff', borderRadius: '12px' },
  emptyGuide: { fontSize: '13px', color: '#aaa', marginTop: '8px' },
  emptyText: { textAlign: 'center', color: '#aaa', padding: '40px' },
  tableWrap: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thead: { backgroundColor: '#f5f5f5', fontWeight: 'bold', color: '#555' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', textAlign: 'center' },
  buy: { color: '#e53e3e', fontWeight: 'bold' },
  sell: { color: '#4299e1', fontWeight: 'bold' },
};

export default TradeListPage;
