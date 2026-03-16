// [파일 용도] 거래 내역 목록 페이지 (거래소 필터 탭 + 날짜 필터 + KRW/USD 통화 토글)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrades, syncUpbitTrades, syncBybitTrades } from '../api/exchangeApi';
import api from '../api/authApi';

// [컴포넌트] 거래 내역 목록 및 거래소별 동기화 화면 / [호출] App.jsx 라우터
const TradeListPage = () => {
  const navigate = useNavigate();
  const [allTrades, setAllTrades] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [syncing, setSyncing] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(true);
  // 통화 설정: 'KRW' | 'USD' (localStorage 유지)
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [krwPerUsdt, setKrwPerUsdt] = useState(null); // 1 USDT = N KRW

  // 날짜 필터: '1d' | '7d' | '30d' | '1y' | 'custom' | null (전체)
  const [datePreset, setDatePreset] = useState(null);
  // 커스텀 날짜 범위
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchTrades();
    fetchExchangeRate();
  }, []);

  // 달력 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await getTrades();
      setAllTrades(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const res = await api.get('/api/exchange-rate');
      setKrwPerUsdt(Number(res.data.krwPerUsdt));
    } catch (e) {
      console.error('환율 조회 실패', e);
    }
  };

  const handleSync = async (exchange) => {
    if (syncing) return;
    setSyncing(exchange);
    setSyncMessage('');
    try {
      const res = exchange === 'UPBIT'
        ? await syncUpbitTrades()
        : await syncBybitTrades();
      setSyncMessage(`${exchange} 동기화 완료: ${res.data.savedCount}건 저장`);
      fetchTrades();
    } catch {
      setSyncMessage('동기화 실패. API Key를 확인해주세요.');
    } finally {
      setSyncing(null);
    }
  };

  const toggleCurrency = () => {
    const next = displayCurrency === 'KRW' ? 'USD' : 'KRW';
    setDisplayCurrency(next);
    localStorage.setItem('displayCurrency', next);
  };

  // 날짜 프리셋 선택
  const handleDatePreset = (preset) => {
    if (datePreset === preset) {
      // 같은 버튼 재클릭 → 해제
      setDatePreset(null);
    } else {
      setDatePreset(preset);
      setCustomFrom('');
      setCustomTo('');
      setShowCalendar(false);
    }
  };

  // 커스텀 날짜 적용
  const handleApplyCustom = () => {
    if (customFrom || customTo) {
      setDatePreset('custom');
    }
    setShowCalendar(false);
  };

  // 날짜 필터 초기화
  const handleClearDate = () => {
    setDatePreset(null);
    setCustomFrom('');
    setCustomTo('');
    setShowCalendar(false);
  };

  // 가격을 선택된 통화 기준으로 변환
  const convertPrice = (price, exchange) => {
    const num = Number(price);
    if (!krwPerUsdt) return num;

    const isKrw = exchange === 'UPBIT';
    if (displayCurrency === 'KRW') {
      return isKrw ? num : Math.round(num * krwPerUsdt);
    } else {
      return isKrw ? (num / krwPerUsdt).toFixed(2) : num;
    }
  };

  const formatPrice = (price, exchange) => {
    const converted = convertPrice(price, exchange);
    return displayCurrency === 'KRW'
      ? Number(converted).toLocaleString() + '원'
      : '$' + Number(converted).toLocaleString();
  };

  // 날짜 필터 기준 시각 계산
  const getDateBound = () => {
    if (!datePreset) return { from: null, to: null };

    const now = new Date();
    if (datePreset === 'custom') {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
        to: customTo ? new Date(customTo + 'T23:59:59') : null,
      };
    }

    const map = { '1d': 1, '7d': 7, '30d': 30, '1y': 365 };
    const days = map[datePreset];
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    return { from, to: now };
  };

  // 거래소 + 날짜 복합 필터 적용
  const { from: dateFrom, to: dateTo } = getDateBound();
  const trades = allTrades
    .filter((t) => activeTab === 'ALL' || t.exchange === activeTab)
    .filter((t) => {
      if (!dateFrom && !dateTo) return true;
      const tradedAt = new Date(t.traded_at);
      if (dateFrom && tradedAt < dateFrom) return false;
      if (dateTo && tradedAt > dateTo) return false;
      return true;
    });

  // 탭별 카운트도 날짜 필터 적용
  const countByExchange = (key) => {
    return allTrades
      .filter((t) => key === 'ALL' || t.exchange === key)
      .filter((t) => {
        if (!dateFrom && !dateTo) return true;
        const tradedAt = new Date(t.traded_at);
        if (dateFrom && tradedAt < dateFrom) return false;
        if (dateTo && tradedAt > dateTo) return false;
        return true;
      }).length;
  };

  const tabs = [
    { key: 'ALL',   label: '전체' },
    { key: 'UPBIT', label: 'Upbit' },
    { key: 'BYBIT', label: 'Bybit' },
  ];

  const datePresets = [
    { key: '1d',  label: '1일' },
    { key: '7d',  label: '7일' },
    { key: '30d', label: '30일' },
    { key: '1y',  label: '1년' },
  ];

  const customLabel = datePreset === 'custom' && (customFrom || customTo)
    ? `${customFrom || '~'} ~ ${customTo || '~'}`
    : '날짜 지정';

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        {/* 헤더 */}
        <div style={styles.header}>
          <h2 style={styles.title}>거래 내역</h2>
          <div style={styles.headerActions}>
            {/* 환율 토글 */}
            <div style={styles.rateBox}>
              {krwPerUsdt && (
                <span style={styles.rateText}>1 USDT ≈ {krwPerUsdt.toLocaleString()}원</span>
              )}
              <button style={styles.currencyToggle} onClick={toggleCurrency}>
                {displayCurrency === 'KRW' ? '₩ KRW' : '$ USD'}
              </button>
            </div>
            <button style={styles.keyBtn} onClick={() => navigate('/exchange-keys')}>
              거래소 연동 설정
            </button>
            <button style={styles.syncBtnUpbit} onClick={() => handleSync('UPBIT')} disabled={syncing !== null}>
              {syncing === 'UPBIT' ? '동기화 중...' : 'Upbit 동기화'}
            </button>
            <button style={styles.syncBtnBybit} onClick={() => handleSync('BYBIT')} disabled={syncing !== null}>
              {syncing === 'BYBIT' ? '동기화 중...' : 'Bybit 동기화'}
            </button>
          </div>
        </div>

        {syncMessage && (
          <p style={syncMessage.includes('실패') ? styles.error : styles.success}>
            {syncMessage}
          </p>
        )}

        {/* 거래소 필터 탭 */}
        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={activeTab === tab.key ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span style={styles.tabCount}>{countByExchange(tab.key)}</span>
            </button>
          ))}
        </div>

        {/* 날짜 필터 바 */}
        <div style={styles.dateBar}>
          <div style={styles.datePresets}>
            {datePresets.map((p) => (
              <button
                key={p.key}
                style={datePreset === p.key ? styles.datePresetActive : styles.datePreset}
                onClick={() => handleDatePreset(p.key)}
              >
                {p.label}
              </button>
            ))}

            {/* 커스텀 날짜 선택 */}
            <div style={styles.calendarWrap} ref={calendarRef}>
              <button
                style={datePreset === 'custom' ? styles.datePresetActive : styles.datePreset}
                onClick={() => setShowCalendar((v) => !v)}
              >
                📅 {customLabel}
              </button>
              {showCalendar && (
                <div style={styles.calendarDropdown}>
                  <div style={styles.calendarRow}>
                    <div style={styles.calendarField}>
                      <label style={styles.calendarLabel}>시작일</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={customFrom}
                        max={customTo || undefined}
                        onChange={(e) => setCustomFrom(e.target.value)}
                      />
                    </div>
                    <span style={styles.calendarSep}>~</span>
                    <div style={styles.calendarField}>
                      <label style={styles.calendarLabel}>종료일</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={customTo}
                        min={customFrom || undefined}
                        onChange={(e) => setCustomTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={styles.calendarActions}>
                    <button style={styles.calendarApply} onClick={handleApplyCustom}>적용</button>
                    <button style={styles.calendarReset} onClick={handleClearDate}>초기화</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 현재 필터 표시 + 초기화 */}
          {datePreset && (
            <button style={styles.clearDateBtn} onClick={handleClearDate}>
              ✕ 날짜 초기화
            </button>
          )}
        </div>

        {/* 거래 목록 */}
        {loading ? (
          <p style={styles.emptyText}>불러오는 중...</p>
        ) : trades.length === 0 ? (
          <div style={styles.emptyBox}>
            <p>거래 내역이 없습니다.</p>
            <p style={styles.emptyGuide}>
              {datePreset ? '선택한 날짜 범위에 거래 내역이 없습니다.' : '동기화 버튼을 눌러 거래 내역을 가져오세요.'}
            </p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <div style={styles.tableHeader}>
              <span style={styles.tableCount}>총 {trades.length}건</span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>거래소</th>
                  <th style={styles.th}>종목</th>
                  <th style={styles.th}>구분</th>
                  <th style={styles.th}>수량</th>
                  <th style={styles.th}>가격 ({displayCurrency})</th>
                  <th style={styles.th}>수수료</th>
                  <th style={styles.th}>체결일시</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={trade.exchange === 'UPBIT' ? styles.badgeUpbit : styles.badgeBybit}>
                        {trade.exchange}
                      </span>
                    </td>
                    <td style={styles.td}>{trade.symbol}</td>
                    <td style={styles.td}>
                      <span style={trade.side === 'BUY' ? styles.buy : styles.sell}>
                        {trade.side === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td style={styles.td}>{Number(trade.qty).toLocaleString()}</td>
                    <td style={styles.td}>{formatPrice(trade.price, trade.exchange)}</td>
                    <td style={styles.td}>{formatPrice(trade.fee, trade.exchange)}</td>
                    <td style={styles.td}>{trade.traded_at?.replace('T', ' ').slice(0, 16)}</td>
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
  inner: { maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '22px' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  rateBox: { display: 'flex', alignItems: 'center', gap: '8px' },
  rateText: { fontSize: '12px', color: '#888' },
  currencyToggle: { padding: '6px 14px', backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  keyBtn: { padding: '8px 14px', background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: '#4f46e5', color: '#4f46e5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  syncBtnUpbit: { padding: '8px 14px', backgroundColor: '#1677ff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  syncBtnBybit: { padding: '8px 14px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  success: { color: '#52c41a', marginBottom: '12px', fontSize: '14px' },
  error: { color: '#e53e3e', marginBottom: '12px', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '12px' },
  tab: { padding: '8px 20px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#d9d9d9', backgroundColor: '#fff', borderRadius: '20px', cursor: 'pointer', fontSize: '14px', color: '#555' },
  tabActive: { padding: '8px 20px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#4f46e5', backgroundColor: '#4f46e5', borderRadius: '20px', cursor: 'pointer', fontSize: '14px', color: '#fff', fontWeight: 'bold' },
  tabCount: { marginLeft: '6px', backgroundColor: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: '10px', fontSize: '12px' },

  // 날짜 필터 바
  dateBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' },
  datePresets: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
  datePreset: { padding: '5px 14px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#d9d9d9', backgroundColor: '#fff', borderRadius: '16px', cursor: 'pointer', fontSize: '13px', color: '#555' },
  datePresetActive: { padding: '5px 14px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#4f46e5', backgroundColor: '#ede9fe', borderRadius: '16px', cursor: 'pointer', fontSize: '13px', color: '#4f46e5', fontWeight: 'bold' },
  clearDateBtn: { padding: '5px 12px', background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: '#d9d9d9', color: '#888', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' },

  // 달력 드롭다운
  calendarWrap: { position: 'relative' },
  calendarDropdown: { position: 'absolute', top: '36px', left: 0, backgroundColor: '#fff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e8e8e8', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '16px', zIndex: 100, minWidth: '300px' },
  calendarRow: { display: 'flex', alignItems: 'flex-end', gap: '10px' },
  calendarField: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  calendarLabel: { fontSize: '11px', color: '#888', fontWeight: 'bold' },
  dateInput: { padding: '7px 10px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  calendarSep: { fontSize: '16px', color: '#bbb', marginBottom: '8px' },
  calendarActions: { display: 'flex', gap: '8px', marginTop: '12px' },
  calendarApply: { flex: 1, padding: '8px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  calendarReset: { padding: '8px 14px', background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#888' },

  // 테이블
  tableWrap: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tableHeader: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0' },
  tableCount: { fontSize: '13px', color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thead: { backgroundColor: '#f5f5f5', fontWeight: 'bold', color: '#555' },
  th: { padding: '12px 16px', textAlign: 'center' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', textAlign: 'center' },
  buy: { color: '#e53e3e', fontWeight: 'bold' },
  sell: { color: '#4299e1', fontWeight: 'bold' },
  badgeUpbit: { backgroundColor: '#e8f4fd', color: '#1677ff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  badgeBybit: { backgroundColor: '#fff7e6', color: '#f97316', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  emptyBox: { textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#fff', borderRadius: '12px' },
  emptyGuide: { fontSize: '13px', color: '#aaa', marginTop: '8px' },
  emptyText: { textAlign: 'center', color: '#aaa', padding: '40px' },
};

export default TradeListPage;
