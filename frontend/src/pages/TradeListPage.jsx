// [파일 용도] Trade history 목록 페이지 (Exchange 필터 탭 + 날짜 필터 + KRW/USD 통화 토글)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CurrentPriceModal, { SymbolPriceButton } from '../components/CurrentPriceModal';
import { getTrades, syncTrades, getMyExchangeKeys } from '../api/exchangeApi';
import api from '../api/authApi';

// [컴포넌트] Trade history 목록 및 Exchange별 Sync 화면 / [호출] App.jsx 라우터, PositionListPage (embedded)
const TradeListPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [allTrades,      setAllTrades]      = useState([]);
  const [activeTab,      setActiveTab]      = useState('ALL');
  const [syncing,        setSyncing]        = useState(null);
  const [syncMessage,    setSyncMessage]    = useState('');
  const [loading,        setLoading]        = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [rates, setRates] = useState({ KRW: 1400, USD: 1, CNY: 7.2, JPY: 150 });
  // Exchange 신규 connection 직후 1분간 Sync 대기 중 여부
  const [pendingSync, setPendingSync] = useState(false);
  const [priceQuote, setPriceQuote] = useState(null);

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

    const onAutoSync = () => fetchTrades(true);
    window.addEventListener('autoSyncComplete', onAutoSync);

    // 내비게이션 바 통화 변경 이벤트 수신
    const onCurrencyChange = (e) => setDisplayCurrency(e.detail);
    window.addEventListener('currencyChange', onCurrencyChange);

    return () => {
      window.removeEventListener('autoSyncComplete', onAutoSync);
      window.removeEventListener('currencyChange', onCurrencyChange);
    };
  // 최초 마운트에서만 서버 data와 로컬 Sync 대기 상태를 복 KRW한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [용도] Exchange 신규 connection 후 1분 대기 여부 Confirm / [호출] useEffect
  const checkPendingSync = () => {
    const exchanges = ['UPBIT', 'BYBIT', 'BITGET', 'OKX', 'BINANCE', 'BINGX', 'KRAKEN'];
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

  // [용도] 달력 외부 클릭 시 Close / [호출] useEffect
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [용도] Trade 목록 조회 / [호출] useEffect, handleSync
  // silent=true 이면 로딩 스피너 없이 data만 갱신 (자동 Sync 후 호출 시)
  const fetchTrades = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getTrades();
      setAllTrades(res.data);
      if (res.data.length > 0) setPendingSync(false);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // [용도] 실시간 환율 조회 / [호출] useEffect
  const fetchExchangeRate = async () => {
    try {
      const res = await api.get('/api/exchange-rate');
      setRates({
        KRW: Number(res.data.krwPerUsdt),
        USD: 1,
        CNY: Number(res.data.cnyPerUsdt),
        JPY: Number(res.data.jpyPerUsdt),
      });
    } catch (e) {
      console.error('환율 Could not load', e);
    }
  };

  // [용도] Add된 Exchange All Sync / [호출] All Sync 버튼 클릭
  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing('ALL');
    setSyncMessage('');

    let exchanges = [];
    try {
      const res = await getMyExchangeKeys();
      exchanges = res.data.map(item => typeof item === 'string' ? item : item.exchange);
    } catch {
      setSyncMessage('Exchange 목록 Could not load');
      setSyncing(null);
      return;
    }

    let totalSaved = 0;
    const errors = [];
    for (const exchange of exchanges) {
      try {
        const res = await syncTrades(exchange);
        if (res.data.error) errors.push(`${exchange}: ${res.data.error}`);
        else totalSaved += res.data.savedCount ?? 0;
      } catch (e) {
        errors.push(`${exchange}: ${e.response?.data?.error || 'failed'}`);
      }
    }

    if (errors.length > 0) {
      setSyncMessage(errors.join(' / '));
    } else {
      setSyncMessage(`All Sync complete — ${totalSaved} Save됨`);
      setPendingSync(false);
      fetchTrades();
    }
    setSyncing(null);
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

  // [용도] 커스텀 날짜 범위 Apply / [호출] Apply 버튼
  const handleApplyCustom = () => {
    if (customFrom || customTo) setDatePreset('custom');
    setShowCalendar(false);
  };

  // [용도] 날짜 필터 Reset / [호출] Reset 버튼
  const handleClearDate = () => {
    setDatePreset(null);
    setCustomFrom('');
    setCustomTo('');
    setShowCalendar(false);
  };

  // [용도] Quantity 포맷 (소수점 작은 값도 정확히 표시) / [호출] 테이블/카드 렌더
  const formatQty = (qty) => {
    const num = Number(qty);
    if (num === 0) return '0';
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    // 0.001 미만은 소수점 8자리까지 표시 후 후행 0 제거
    return parseFloat(num.toFixed(8)).toString();
  };

  const CURRENCY_SYMBOL = { KRW: '₩', USD: '$', CNY: '¥', JPY: '¥' };
  const CURRENCY_SUFFIX = { KRW: ' KRW', USD: '$', CNY: '¥', JPY: '¥' };

  // [용도] Price을 선택된 통화로 변환 / [호출] formatPrice
  const convertPrice = (price, exchange) => {
    const num = Number(price);
    const isKrw = exchange === 'UPBIT';
    const targetRate = rates[displayCurrency] ?? 1;
    // UPBIT은 KRW 기준, You머지는 USDT 기준
    return isKrw ? (num / rates.KRW * targetRate) : (num * targetRate);
  };

  // [용도] Price 포맷 (통화 기호 포함) / [호출] 테이블/카드 렌더
  const formatPrice = (price, exchange) => {
    const converted = convertPrice(price, exchange);
    const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
    if (displayCurrency === 'KRW') {
      return Math.round(converted).toLocaleString() + ' KRW';
    }
    return sym + Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

  // [용도] Exchange + 날짜 복합 필터 / [호출] 렌더
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
    { key: 'ALL',     label: 'All' },
    { key: 'UPBIT',   label: 'Upbit' },
    { key: 'BYBIT',   label: 'Bybit' },
    { key: 'BITGET',  label: 'Bitget' },
    { key: 'OKX',     label: 'OKX' },
    { key: 'BINANCE', label: 'Binance' },
    { key: 'BINGX',   label: 'BingX' },
    { key: 'KRAKEN',  label: 'Kraken' },
  ];

  const datePresets = [
    { key: '1d',  label: '1 day' },
    { key: '7d',  label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '1y',  label: '1 year' },
  ];

  const customLabel = datePreset === 'custom' && (customFrom || customTo)
    ? `${customFrom || '~'} ~ ${customTo || '~'}`
    : 'Custom dates';

  return (
    <div className={embedded ? '' : 'page'}>
      {/* 페이지 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">Trade history</h1>
        <div className="header-actions">
          {/* Sync 버튼 */}
          <button
            className="compact-primary-action"
            onClick={handleSyncAll}
            disabled={syncing !== null}
          >
            {syncing === 'ALL' ? 'Syncing' : 'Sync all'}
          </button>
        </div>
      </div>

      {/* Sync 메시지 */}
      {syncMessage && (
        <p
          className={
            syncMessage.includes('failed') || syncMessage.includes('error') || syncMessage.includes('IP') || syncMessage.includes('인증')
              ? 'msg-error'
              : 'msg-success'
          }
          style={{ marginBottom: '12px' }}
        >
          {syncMessage}
        </p>
      )}

      {/* 필터 바 */}
      <div className="filter-bar anim-fade-up2" style={{ position: 'relative', zIndex: 10 }}>
        {/* Exchange 탭 */}
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
                      <label className="input-label">Start date</label>
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
                      <label className="input-label">End date</label>
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
                      Apply
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={handleClearDate}>
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {datePreset && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearDate}>
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Trade 목록 */}
      {pendingSync && allTrades.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-state-title">Sync in progress</p>
          <p className="empty-state-desc">Exchange connection 후 data를 불러오고 있습니다. 잠시만 기다려주세요.</p>
        </div>
      ) : loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">Loading...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="card anim-fade-up" style={{ padding: '28px 24px' }}>
          {datePreset ? (
            <>
              <p className="empty-state-title">선택한 기간에 Trade history이 없습니다</p>
              <p className="empty-state-desc">Change the date range or select All time.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text)' }}>
                Trade history을 가져오려면
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#60a5fa20', border: '1px solid #60a5fa60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Exchange API Key Add</div>
                    <button onClick={() => navigate('/exchange-keys')} style={{ marginTop: '4px', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #60a5fa60', background: '#60a5fa10', color: '#60a5fa', cursor: 'pointer' }}>Exchange connection하기</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a78bfa20', border: '1px solid #a78bfa60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#a78bfa', flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Sync 버튼 클릭</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>위 Sync 버튼을 or it will sync automatically every five minutes.</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="table-wrap anim-fade-up3">
          {/* 테이블 헤더 */}
          <div className="table-header">
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
              총 <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{trades.length}</strong>
            </span>
          </div>

          {/* ── 데스크탑 테이블 ── */}
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price ({displayCurrency})</th>
                  <th>Fee</th>
                  <th>Executed at</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const sideColor = trade.side === 'BUY' ? 'text-buy' : 'text-sell';
                  return (
                  <tr key={trade.id}>
                    <td>
                      <SymbolPriceButton
                        symbol={trade.symbol}
                        exchange={trade.exchange}
                        className={`mono ${sideColor}`}
                        onClick={() => setPriceQuote({ symbol: trade.symbol, exchange: trade.exchange })}
                      />
                    </td>
                    <td>
                      <span className={`badge badge-${trade.side.toLowerCase()}`}>
                        {trade.side === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className={`mono ${sideColor}`}>{formatQty(trade.qty)}</td>
                    <td className={`mono ${sideColor}`}>{formatPrice(trade.price, trade.exchange)}</td>
                    <td className="mono text-muted">{formatPrice(trade.fee, trade.exchange)}</td>
                    <td className="mono text-secondary" style={{ fontSize: '12px', lineHeight: 1.3 }}>
                      <div>{trade.traded_at?.replace('T', ' ').slice(0, 16)}</div>
                      <div style={{ marginTop: '3px', textAlign: 'right' }}>
                        <img
                          src={`/exchanges/${trade.exchange.toLowerCase()}_logo.png`}
                          alt={trade.exchange}
                          style={{ height: '11px', width: 'auto', objectFit: 'contain', opacity: 0.6 }}
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'none' }}>
                          {trade.exchange.charAt(0) + trade.exchange.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── 모바일 카드 리스트 ── */}
            {trades.map((trade) => (
              <div key={`card-${trade.id}`} className="trade-card">
                <div className="trade-card-top">
                  <span className={`badge badge-${trade.side.toLowerCase()}`}>
                    {trade.side === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span className="trade-card-symbol" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SymbolPriceButton
                      symbol={trade.symbol}
                      exchange={trade.exchange}
                      onClick={() => setPriceQuote({ symbol: trade.symbol, exchange: trade.exchange })}
                    />
                    <img
                      src={`/exchanges/${trade.exchange.toLowerCase()}_logo.png`}
                      alt={trade.exchange}
                      style={{ height: '12px', width: 'auto', objectFit: 'contain', opacity: 0.55 }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, display: 'none' }}>
                      {trade.exchange.charAt(0) + trade.exchange.slice(1).toLowerCase()}
                    </span>
                  </span>
                  <span className="trade-card-time" style={{ marginLeft: 'auto' }}>
                    {trade.traded_at?.replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                <div className="trade-card-row">
                  <div>
                    <div className="trade-card-label">Price</div>
                    <div className={`trade-card-value ${trade.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                      {formatPrice(trade.price, trade.exchange)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">Quantity</div>
                    <div className={`trade-card-value ${trade.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{formatQty(trade.qty)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">Fee</div>
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
      <CurrentPriceModal quote={priceQuote} onClose={() => setPriceQuote(null)} />
    </div>
  );
};

export default TradeListPage;
