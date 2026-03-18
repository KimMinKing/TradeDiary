// [파일 용도] 거래 내역 목록 페이지 (거래소 필터 탭 + 날짜 필터 + KRW/USD 통화 토글)

import { useState, useEffect, useRef } from 'react';
import { getTrades, syncUpbitTrades, syncBybitTrades, syncBitgetTrades } from '../api/exchangeApi';
import api from '../api/authApi';

// [컴포넌트] 거래 내역 목록 및 거래소별 동기화 화면 / [호출] App.jsx 라우터
const TradeListPage = () => {
  const [allTrades,      setAllTrades]      = useState([]);
  const [activeTab,      setActiveTab]      = useState('ALL');
  const [syncing,        setSyncing]        = useState(null);
  const [syncMessage,    setSyncMessage]    = useState('');
  const [loading,        setLoading]        = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [krwPerUsdt, setKrwPerUsdt] = useState(null);
  // 거래소 신규 연동 직후 1분간 동기화 대기 중 여부
  const [pendingSync, setPendingSync] = useState(false);

  // 날짜 필터
  const [datePreset, setDatePreset] = useState(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchTrades();
    fetchExchangeRate();
    checkPendingSync();
  }, []);

  // [용도] 거래소 신규 연동 후 1분 대기 여부 확인 / [호출] useEffect
  const checkPendingSync = () => {
    const exchanges = ['UPBIT', 'BYBIT', 'BITGET'];
    const WAIT_MS = 60000; // 1분
    let minRemaining = null;

    for (const exchange of exchanges) {
      const startTime = localStorage.getItem(`syncStartTime_${exchange}`);
      if (!startTime) continue;
      const elapsed = Date.now() - parseInt(startTime, 10);
      if (elapsed < WAIT_MS) {
        const remaining = WAIT_MS - elapsed;
        if (minRemaining === null || remaining < minRemaining) {
          minRemaining = remaining;
        }
      } else {
        localStorage.removeItem(`syncStartTime_${exchange}`);
      }
    }

    if (minRemaining !== null) {
      setPendingSync(true);
      setTimeout(() => {
        setPendingSync(false);
        fetchTrades();
      }, minRemaining);
    }
  };

  // [용도] 달력 외부 클릭 시 닫기 / [호출] useEffect
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [용도] 거래 목록 조회 / [호출] useEffect, handleSync
  // 거래가 존재하면 pendingSync 즉시 해제 (1분 기다리지 않음)
  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await getTrades();
      setAllTrades(res.data);
      if (res.data.length > 0) setPendingSync(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // [용도] 실시간 환율 조회 / [호출] useEffect
  const fetchExchangeRate = async () => {
    try {
      const res = await api.get('/api/exchange-rate');
      setKrwPerUsdt(Number(res.data.krwPerUsdt));
    } catch (e) {
      console.error('환율 조회 실패', e);
    }
  };

  // [용도] 동기화 버튼 핸들러 / [호출] 동기화 버튼 클릭
  const handleSync = async (exchange) => {
    if (syncing) return;
    setSyncing(exchange);
    setSyncMessage('');
    try {
      const res = exchange === 'UPBIT'
        ? await syncUpbitTrades()
        : exchange === 'BYBIT'
        ? await syncBybitTrades()
        : await syncBitgetTrades();
      if (res.data.error) {
        // 백엔드가 에러 메시지를 반환한 경우 (IP 차단 등)
        setSyncMessage(res.data.error);
      } else {
        setSyncMessage(`${exchange} 동기화 완료 — ${res.data.savedCount}건 저장됨`);
        setPendingSync(false);
        fetchTrades();
      }
    } catch (e) {
      // HTTP 에러 응답에서 메시지 추출
      const errorMsg = e.response?.data?.error;
      setSyncMessage(errorMsg || '동기화 실패. API Key를 확인해주세요.');
    } finally {
      setSyncing(null);
    }
  };

  // [용도] KRW/USD 토글 / [호출] 통화 버튼 클릭
  const toggleCurrency = () => {
    const next = displayCurrency === 'KRW' ? 'USD' : 'KRW';
    setDisplayCurrency(next);
    localStorage.setItem('displayCurrency', next);
  };

  // [용도] 날짜 프리셋 선택/해제 / [호출] 날짜 버튼 클릭
  const handleDatePreset = (preset) => {
    if (datePreset === preset) {
      setDatePreset(null);
    } else {
      setDatePreset(preset);
      setCustomFrom('');
      setCustomTo('');
      setShowCalendar(false);
    }
  };

  // [용도] 커스텀 날짜 범위 적용 / [호출] 적용 버튼
  const handleApplyCustom = () => {
    if (customFrom || customTo) setDatePreset('custom');
    setShowCalendar(false);
  };

  // [용도] 날짜 필터 초기화 / [호출] 초기화 버튼
  const handleClearDate = () => {
    setDatePreset(null);
    setCustomFrom('');
    setCustomTo('');
    setShowCalendar(false);
  };

  // [용도] 가격 통화 변환 / [호출] formatPrice
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

  // [용도] 가격 포맷 (통화 기호 포함) / [호출] 테이블/카드 렌더
  const formatPrice = (price, exchange) => {
    const converted = convertPrice(price, exchange);
    return displayCurrency === 'KRW'
      ? Number(converted).toLocaleString() + '원'
      : '$' + Number(converted).toLocaleString();
  };

  // [용도] 날짜 필터 범위 계산 / [호출] 필터링 로직
  const getDateBound = () => {
    if (!datePreset) return { from: null, to: null };
    if (datePreset === 'custom') {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
        to:   customTo   ? new Date(customTo   + 'T23:59:59') : null,
      };
    }
    const map = { '1d': 1, '7d': 7, '30d': 30, '1y': 365 };
    const from = new Date();
    from.setDate(from.getDate() - map[datePreset]);
    return { from, to: new Date() };
  };

  // [용도] 거래소 + 날짜 복합 필터 / [호출] 렌더
  const { from: dateFrom, to: dateTo } = getDateBound();
  const applyDateFilter = (list) => list.filter((t) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(t.traded_at);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  });

  const trades = applyDateFilter(
    activeTab === 'ALL' ? allTrades : allTrades.filter((t) => t.exchange === activeTab)
  );

  const countByExchange = (key) =>
    applyDateFilter(
      key === 'ALL' ? allTrades : allTrades.filter((t) => t.exchange === key)
    ).length;

  const tabs = [
    { key: 'ALL',    label: '전체' },
    { key: 'UPBIT',  label: 'Upbit' },
    { key: 'BYBIT',  label: 'Bybit' },
    { key: 'BITGET', label: 'Bitget' },
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
    <div className="page">
      {/* 페이지 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">거래 내역</h1>
        <div className="header-actions">
          {/* 환율 + 통화 토글 */}
          <div className="rate-box">
            {krwPerUsdt && (
              <span className="rate-text">1 USDT ≈ {krwPerUsdt.toLocaleString()}원</span>
            )}
            <button className="currency-toggle" onClick={toggleCurrency}>
              {displayCurrency === 'KRW' ? '₩ KRW' : '$ USD'}
            </button>
          </div>

          {/* 동기화 버튼 */}
          <button
            className="btn btn-upbit btn-sm"
            onClick={() => handleSync('UPBIT')}
            disabled={syncing !== null}
          >
            {syncing === 'UPBIT' ? '동기화 중...' : 'Upbit 동기화'}
          </button>
          <button
            className="btn btn-bybit btn-sm"
            onClick={() => handleSync('BYBIT')}
            disabled={syncing !== null}
          >
            {syncing === 'BYBIT' ? '동기화 중...' : 'Bybit 동기화'}
          </button>
          <button
            className="btn btn-bitget btn-sm"
            onClick={() => handleSync('BITGET')}
            disabled={syncing !== null}
          >
            {syncing === 'BITGET' ? '동기화 중...' : 'Bitget 동기화'}
          </button>
        </div>
      </div>

      {/* 동기화 메시지 */}
      {syncMessage && (
        <p
          className={
            syncMessage.includes('실패') || syncMessage.includes('오류') || syncMessage.includes('IP') || syncMessage.includes('인증')
              ? 'msg-error'
              : 'msg-success'
          }
          style={{ marginBottom: '12px' }}
        >
          {syncMessage}
        </p>
      )}

      {/* 필터 바 */}
      <div className="filter-bar anim-fade-up2">
        {/* 거래소 탭 */}
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="tab-count">{countByExchange(tab.key)}</span>
            </button>
          ))}
        </div>

        {/* 날짜 필터 */}
        <div className="date-bar">
          <div className="date-presets">
            {datePresets.map((p) => (
              <button
                key={p.key}
                className={`date-tab${datePreset === p.key ? ' active' : ''}`}
                onClick={() => handleDatePreset(p.key)}
              >
                {p.label}
              </button>
            ))}

            {/* 커스텀 날짜 */}
            <div className="cal-wrap" ref={calendarRef}>
              <button
                className={`date-tab${datePreset === 'custom' ? ' active' : ''}`}
                onClick={() => setShowCalendar((v) => !v)}
              >
                📅 {customLabel}
              </button>
              {showCalendar && (
                <div className="cal-dropdown">
                  <div className="cal-row">
                    <div className="cal-field">
                      <label className="input-label">시작일</label>
                      <input
                        type="date"
                        className="date-input"
                        value={customFrom}
                        max={customTo || undefined}
                        onChange={(e) => setCustomFrom(e.target.value)}
                      />
                    </div>
                    <span className="cal-sep">~</span>
                    <div className="cal-field">
                      <label className="input-label">종료일</label>
                      <input
                        type="date"
                        className="date-input"
                        value={customTo}
                        min={customFrom || undefined}
                        onChange={(e) => setCustomTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="cal-actions">
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleApplyCustom}>
                      적용
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={handleClearDate}>
                      초기화
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {datePreset && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearDate}>
              ✕ 초기화
            </button>
          )}
        </div>
      </div>

      {/* 거래 목록 */}
      {pendingSync && allTrades.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state-title">동기화 중입니다</p>
          <p className="empty-state-desc">거래소 연동 후 데이터를 불러오고 있습니다. 잠시만 기다려주세요.</p>
        </div>
      ) : loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">불러오는 중...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">◻</div>
          <p className="empty-state-title">거래 내역이 없습니다</p>
          <p className="empty-state-desc">
            {datePreset
              ? '선택한 날짜 범위에 거래 내역이 없습니다'
              : '동기화 버튼을 눌러 거래 내역을 가져오세요'}
          </p>
        </div>
      ) : (
        <div className="table-wrap anim-fade-up3">
          {/* 테이블 헤더 */}
          <div className="table-header">
            <span className="mono text-xs text-muted">총 {trades.length}건</span>
          </div>

          {/* ── 데스크탑 테이블 ── */}
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>거래소</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>가격 ({displayCurrency})</th>
                  <th>수수료</th>
                  <th>체결일시</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>
                      <span className={`badge badge-${trade.exchange.toLowerCase()}`}>
                        {trade.exchange}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 500 }}>{trade.symbol}</td>
                    <td>
                      <span className={`badge badge-${trade.side.toLowerCase()}`}>
                        {trade.side === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="mono">{Number(trade.qty).toLocaleString()}</td>
                    <td className="mono">{formatPrice(trade.price, trade.exchange)}</td>
                    <td className="mono text-muted">{formatPrice(trade.fee, trade.exchange)}</td>
                    <td className="mono text-secondary" style={{ fontSize: '12px' }}>
                      {trade.traded_at?.replace('T', ' ').slice(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── 모바일 카드 리스트 ── */}
            {trades.map((trade) => (
              <div key={`card-${trade.id}`} className="trade-card">
                <div className="trade-card-top">
                  <span className={`badge badge-${trade.exchange.toLowerCase()}`}>
                    {trade.exchange}
                  </span>
                  <span className={`badge badge-${trade.side.toLowerCase()}`}>
                    {trade.side === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span className="trade-card-symbol">{trade.symbol}</span>
                  <span className="trade-card-time" style={{ marginLeft: 'auto' }}>
                    {trade.traded_at?.replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                <div className="trade-card-row">
                  <div>
                    <div className="trade-card-label">가격</div>
                    <div className={`trade-card-value ${trade.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                      {formatPrice(trade.price, trade.exchange)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">수량</div>
                    <div className="trade-card-value">{Number(trade.qty).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">수수료</div>
                    <div className="trade-card-value text-muted">
                      {formatPrice(trade.fee, trade.exchange)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeListPage;
