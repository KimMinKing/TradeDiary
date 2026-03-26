// [파일 용도] 포지션 목록 페이지 (거래소 필터 탭 + 수익률/수익금 표시)

import { useState, useEffect, useRef } from 'react';
import { getPositions, rebuildAllPositions, getOpenWindows, getTrades } from '../api/exchangeApi';
import api from '../api/authApi';

// [컴포넌트] 완결된 포지션 목록 및 통계 표시 / [호출] App.jsx 라우터
const PositionListPage = () => {
  const [positions,       setPositions]       = useState([]);
  const [openWindows,     setOpenWindows]     = useState([]);  // 미청산 포지션 윈도우
  const [openWindowsOpen, setOpenWindowsOpen] = useState(false); // 미청산 섹션 펼침 여부
  const [selectedExchanges, setSelectedExchanges] = useState([]); // [] = 전체
  const [exFilterOpen,    setExFilterOpen]    = useState(false); // 거래소 필터 팝업
  const [loading,         setLoading]         = useState(true);
  const [rebuilding,      setRebuilding]      = useState(false);
  const [message,         setMessage]         = useState('');
  const [tradesModal,     setTradesModal]      = useState(null); // { symbol, exchange, trades[] }
  const exFilterRef = useRef(null);
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [rates, setRates] = useState({ KRW: 1400, USD: 1, CNY: 7.2, JPY: 150 });

  useEffect(() => {
    fetchPositions();
    fetchExchangeRate();
    const onAutoSync = () => fetchPositions(true);
    const onCurrencyChange = (e) => setDisplayCurrency(e.detail);
    window.addEventListener('autoSyncComplete', onAutoSync);
    window.addEventListener('currencyChange', onCurrencyChange);
    return () => {
      window.removeEventListener('autoSyncComplete', onAutoSync);
      window.removeEventListener('currencyChange', onCurrencyChange);
    };
  }, []);

  // [용도] 포지션 목록 + 미청산 윈도우 조회 / [호출] useEffect, rebuild 완료 후
  // silent=true 이면 로딩 스피너 없이 데이터만 갱신 (자동 동기화 후 호출 시)
  const fetchPositions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getPositions();
      setPositions(res.data);
      // Upbit 미청산 포지션 윈도우 조회 (진단용)
      const [upbitOpen, bybitOpen, bitgetOpen, okxOpen, binanceOpen, bingxOpen] = await Promise.allSettled([
        getOpenWindows('UPBIT'),
        getOpenWindows('BYBIT'),
        getOpenWindows('BITGET'),
        getOpenWindows('OKX'),
        getOpenWindows('BINANCE'),
        getOpenWindows('BINGX'),
      ]);
      const allOpen = [
        ...(upbitOpen.status   === 'fulfilled' ? upbitOpen.value.data.map(w   => ({ ...w, exchange: 'UPBIT'   })) : []),
        ...(bybitOpen.status   === 'fulfilled' ? bybitOpen.value.data.map(w   => ({ ...w, exchange: 'BYBIT'   })) : []),
        ...(bitgetOpen.status  === 'fulfilled' ? bitgetOpen.value.data.map(w  => ({ ...w, exchange: 'BITGET'  })) : []),
        ...(okxOpen.status     === 'fulfilled' ? okxOpen.value.data.map(w     => ({ ...w, exchange: 'OKX'     })) : []),
        ...(binanceOpen.status === 'fulfilled' ? binanceOpen.value.data.map(w => ({ ...w, exchange: 'BINANCE' })) : []),
        ...(bingxOpen.status   === 'fulfilled' ? bingxOpen.value.data.map(w   => ({ ...w, exchange: 'BINGX'   })) : []),
      ];
      setOpenWindows(allOpen);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // [용도] 미청산 포지션 거래 내역 모달 열기 / [호출] 보기 버튼 클릭
  const handleViewWindow = async (w) => {
    const res = await getTrades(w.exchange);
    const filtered = res.data.filter(t => t.symbol === w.symbol);
    setTradesModal({ symbol: w.symbol, exchange: w.exchange, trades: filtered });
  };

  // [용도] 전체 포지션 일괄 재계산 / [호출] 재계산 버튼 클릭
  const handleRebuildAll = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    setMessage('');
    try {
      await rebuildAllPositions();
      setMessage('전체 포지션 재계산 완료');
      fetchPositions();
    } catch {
      setMessage('포지션 재계산 실패');
    } finally {
      setRebuilding(false);
    }
  };

  const EXCHANGES = [
    { key: 'UPBIT',   label: 'Upbit' },
    { key: 'BYBIT',   label: 'Bybit' },
    { key: 'BITGET',  label: 'Bitget' },
    { key: 'OKX',     label: 'OKX' },
    { key: 'BINANCE', label: 'Binance' },
    { key: 'BINGX',   label: 'BingX' },
  ];

  // [용도] 거래소 필터 토글 (다중 선택) / [호출] 팝업 버튼 클릭
  const toggleExchange = (key) => {
    setSelectedExchanges((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // [용도] 거래소 필터 팝업 외부 클릭 시 닫기 / [호출] mousedown
  useEffect(() => {
    if (!exFilterOpen) return;
    const handler = (e) => {
      if (exFilterRef.current && !exFilterRef.current.contains(e.target)) {
        setExFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exFilterOpen]);

  const filtered = selectedExchanges.length === 0
    ? positions
    : positions.filter((p) => selectedExchanges.includes(p.exchange));

  // [용도] 환율 조회 / [호출] useEffect
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
      console.error('환율 조회 실패', e);
    }
  };

  const CURRENCY_SYMBOL = { KRW: '₩', USD: '$', CNY: '¥', JPY: '¥' };

  // [용도] 가격을 선택된 통화로 변환 / [호출] formatPrice
  const convertPrice = (price, exchange) => {
    const num = Number(price);
    const isKrw = exchange === 'UPBIT';
    const targetRate = rates[displayCurrency] ?? 1;
    return isKrw ? (num / rates.KRW * targetRate) : (num * targetRate);
  };

  // [용도] 가격 포맷 (통화 기호 포함) / [호출] 테이블/카드 렌더
  const formatPrice = (price, exchange) => {
    const converted = convertPrice(price, exchange);
    if (displayCurrency === 'KRW') return Math.round(converted).toLocaleString() + '원';
    const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
    return sym + Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // [용도] PnL 포맷 (부호 포함) / [호출] 테이블/카드 렌더
  const formatPnl = (pnl, exchange) => {
    const converted = convertPrice(pnl, exchange);
    const sign = converted >= 0 ? '+' : '';
    if (displayCurrency === 'KRW') return sign + Math.round(converted).toLocaleString() + '원';
    const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
    return sign + sym + Math.abs(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // [용도] 숫자 포맷 (소수점 정리) / [호출] 수량 렌더
  const fmt = (val, digits = 6) => {
    const num = Number(val);
    return isNaN(num) ? '-' : num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  };

  // [용도] PnL 부호에 따른 색상 클래스 / [호출] 렌더
  const pnlClass = (pnl) => Number(pnl) >= 0 ? 'text-buy' : 'text-sell';

  // [용도] 날짜 포맷 (T 제거, 초 이하 제거) / [호출] 렌더
  const fmtDate = (dt) => dt?.replace('T', ' ').slice(0, 16) ?? '-';

  // 탭별 승/패 통계
  const wins  = filtered.filter((p) => Number(p.pnl) >= 0).length;
  const total = filtered.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  // 거래소별 환율 변환을 적용한 총 손익
  const totalPnl = filtered.reduce((sum, p) => sum + convertPrice(Number(p.pnl), p.exchange), 0);

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">포지션</h1>
        <div className="header-actions">
          <button
            className="btn btn-sm"
            onClick={handleRebuildAll}
            disabled={rebuilding}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-secondary)',
            }}
          >
            {rebuilding ? '재계산 중...' : '전체 재계산'}
          </button>
        </div>
      </div>

      {message && (
        <p className={message.includes('실패') ? 'msg-error' : 'msg-success'}
           style={{ marginBottom: '12px' }}>
          {message}
        </p>
      )}

      {/* 거래소 필터 */}
      <div className="filter-bar anim-fade-up2">
        <div className="tabs">
          {/* 전체 탭 */}
          <button
            className={`tab${selectedExchanges.length === 0 ? ' active' : ''}`}
            onClick={() => setSelectedExchanges([])}
          >
            전체
            <span className="tab-count">{positions.length}</span>
          </button>

          {/* 거래소 필터 팝업 */}
          <div style={{ position: 'relative' }} ref={exFilterRef}>
            <button
              className={`tab${selectedExchanges.length > 0 ? ' active' : ''}`}
              onClick={() => setExFilterOpen((v) => !v)}
            >
              거래소
              {selectedExchanges.length > 0 && (
                <span className="tab-count">{selectedExchanges.length}</span>
              )}
              <span style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.6 }}>
                {exFilterOpen ? '▲' : '▼'}
              </span>
            </button>

            {exFilterOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 500,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-glow)',
                borderRadius: 'var(--radius)',
                padding: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                minWidth: '240px',
              }}>
                {EXCHANGES.map((ex) => {
                  const count = positions.filter((p) => p.exchange === ex.key).length;
                  const isSelected = selectedExchanges.includes(ex.key);
                  return (
                    <button
                      key={ex.key}
                      onClick={() => toggleExchange(ex.key)}
                      style={{
                        width: '100%',
                        height: '52px',
                        padding: '0',
                        background: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                      }}
                    >
                      <span>{ex.label}</span>
                      <span style={{ fontSize: '10px', opacity: 0.55, fontFamily: 'var(--font-ui)' }}>
                        {count}건
                      </span>
                    </button>
                  );
                })}
                {selectedExchanges.length > 0 && (
                  <button
                    onClick={() => { setSelectedExchanges([]); setExFilterOpen(false); }}
                    style={{
                      gridColumn: '1 / -1',
                      marginTop: '4px',
                      padding: '5px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    선택 초기화
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      {!loading && total > 0 && (
        <div className="anim-fade-up2" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: '120px', padding: '16px' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>총 포지션</div>
            <div className="syne" style={{ fontSize: '22px', fontWeight: 700 }}>{total}</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', padding: '16px' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>승률</div>
            <div className={`syne ${winRate >= 50 ? 'text-buy' : 'text-sell'}`}
                 style={{ fontSize: '22px', fontWeight: 700 }}>
              {winRate}%
            </div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', padding: '16px' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>승 / 패</div>
            <div className="syne" style={{ fontSize: '22px', fontWeight: 700 }}>
              <span className="text-buy">{wins}</span>
              <span className="text-muted" style={{ fontSize: '14px' }}> / </span>
              <span className="text-sell">{total - wins}</span>
            </div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', padding: '16px' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>총 손익 ({displayCurrency})</div>
            <div className={`syne ${pnlClass(totalPnl)}`} style={{ fontSize: '22px', fontWeight: 700 }}>
              {totalPnl >= 0 ? '+' : ''}
              {displayCurrency === 'KRW'
                ? Math.round(totalPnl).toLocaleString() + '원'
                : (CURRENCY_SYMBOL[displayCurrency] ?? '') + Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* 포지션 목록 */}
      {loading ? (
        <div className="empty-state">
          <p className="empty-state-title">불러오는 중...</p>
        </div>
      ) : total === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">◻</div>
          <p className="empty-state-title">포지션 없음</p>
          <p className="empty-state-desc">
            거래 내역을 동기화하면 포지션이 자동으로 계산됩니다
          </p>
        </div>
      ) : (
        <div className="table-wrap anim-fade-up3">

          {/* ── 데스크탑 테이블 ── */}
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>거래소</th>
                  <th>종목</th>
                  <th>방향</th>
                  <th>수량</th>
                  <th>진입가 ({displayCurrency})</th>
                  <th>청산가 ({displayCurrency})</th>
                  <th>손익 ({displayCurrency})</th>
                  <th>수익률</th>
                  <th>청산일시</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pos) => (
                  <tr key={pos.id}>
                    <td>
                      <span className={`badge badge-${pos.exchange.toLowerCase()}`}>
                        {pos.exchange}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 500 }}>{pos.symbol}</td>
                    <td>
                      <span className={`badge badge-${pos.side === 'LONG' ? 'buy' : 'sell'}`}>
                        {pos.side === 'LONG' ? '롱' : '숏'}
                      </span>
                    </td>
                    <td className="mono">{fmt(pos.qty)}</td>
                    <td className="mono">{formatPrice(pos.entry_price, pos.exchange)}</td>
                    <td className="mono">{formatPrice(pos.exit_price, pos.exchange)}</td>
                    <td className={`mono ${pnlClass(pos.pnl)}`}>
                      {formatPnl(pos.pnl, pos.exchange)}
                    </td>
                    <td className={`mono ${pnlClass(pos.pnl)}`} style={{ fontWeight: 600 }}>
                      {Number(pos.pnl_rate) >= 0 ? '+' : ''}{fmt(pos.pnl_rate, 2)}%
                    </td>
                    <td className="mono text-secondary" style={{ fontSize: '12px' }}>
                      {fmtDate(pos.closed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── 모바일 카드 ── */}
            {filtered.map((pos) => (
              <div key={`card-${pos.id}`} className="trade-card">
                <div className="trade-card-top">
                  <span className={`badge badge-${pos.exchange.toLowerCase()}`}>
                    {pos.exchange}
                  </span>
                  <span className={`badge badge-${pos.side === 'LONG' ? 'buy' : 'sell'}`}>
                    {pos.side === 'LONG' ? '롱' : '숏'}
                  </span>
                  <span className="trade-card-symbol">{pos.symbol}</span>
                  <span className="trade-card-time" style={{ marginLeft: 'auto' }}>
                    {fmtDate(pos.closed_at)}
                  </span>
                </div>
                <div className="trade-card-row">
                  <div>
                    <div className="trade-card-label">진입가</div>
                    <div className="trade-card-value mono">{formatPrice(pos.entry_price, pos.exchange)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="trade-card-label">청산가</div>
                    <div className="trade-card-value mono">{formatPrice(pos.exit_price, pos.exchange)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">손익</div>
                    <div className={`trade-card-value mono ${pnlClass(pos.pnl)}`}>
                      {formatPnl(pos.pnl, pos.exchange)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">수익률</div>
                    <div className={`trade-card-value mono ${pnlClass(pos.pnl)}`}
                         style={{ fontWeight: 700 }}>
                      {Number(pos.pnl_rate) >= 0 ? '+' : ''}{fmt(pos.pnl_rate, 2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 미청산 포지션 (접힘/펼침) */}
      {openWindows.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => setOpenWindowsOpen((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 16px',
              background: 'rgba(250,204,21,0.05)',
              border: '1px solid rgba(250,204,21,0.2)',
              borderRadius: openWindowsOpen ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
              cursor: 'pointer',
              transition: 'background 0.15s',
              color: '#facc15',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>⏳</span>
              미청산 포지션
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(250,204,21,0.15)',
                border: '1px solid rgba(250,204,21,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 7px',
                color: '#facc15',
              }}>
                {openWindows.length}
              </span>
            </span>
            <span style={{ fontSize: '11px', opacity: 0.6 }}>
              {openWindowsOpen ? '▲' : '▼'}
            </span>
          </button>

          {openWindowsOpen && (
            <div style={{
              border: '1px solid rgba(250,204,21,0.2)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius) var(--radius)',
              padding: '14px 16px',
              background: 'rgba(250,204,21,0.03)',
            }}>
              <p className="text-xs text-muted" style={{ marginBottom: '12px' }}>
                매수/매도 수량이 일치하지 않아 포지션으로 확정되지 않은 종목입니다.
                잔여 수량이 모두 청산되면 포지션으로 기록됩니다.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {openWindows.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(250,204,21,0.07)',
                    border: '1px solid rgba(250,204,21,0.18)',
                    fontSize: '12px',
                  }}>
                    <span className={`badge badge-${w.exchange.toLowerCase()}`} style={{ fontSize: '10px' }}>
                      {w.exchange}
                    </span>
                    <span className="mono" style={{ fontWeight: 500 }}>{w.symbol}</span>
                    <span className="text-muted">
                      잔여 <span className="mono" style={{ color: '#facc15' }}>
                        {parseFloat(Number(w.net_qty).toFixed(8)).toString()}
                      </span>
                    </span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      ({w.trade_count}건)
                    </span>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ marginLeft: 'auto', fontSize: '11px' }}
                      onClick={() => handleViewWindow(w)}
                    >
                      보기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 미청산 거래 내역 모달 */}
      {tradesModal && (
        <div className="modal-overlay" onClick={() => setTradesModal(null)}>
          <div className="modal" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <span className={`badge badge-${tradesModal.exchange.toLowerCase()}`} style={{ marginRight: '8px' }}>
                  {tradesModal.exchange}
                </span>
                {tradesModal.symbol} 미완결 거래 내역
              </h2>
              <button className="btn btn-ghost btn-xs" onClick={() => setTradesModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {tradesModal.trades.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>거래 내역이 없습니다</p>
              ) : (
                <table className="trade-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>방향</th>
                      <th>수량</th>
                      <th>가격</th>
                      <th>체결시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradesModal.trades.map(t => (
                      <tr key={t.id}>
                        <td>
                          <span className={`badge badge-${t.side.toLowerCase()}`}>
                            {t.side === 'BUY' ? '매수' : '매도'}
                          </span>
                        </td>
                        <td className="mono">{parseFloat(Number(t.qty).toFixed(8)).toString()}</td>
                        <td className="mono">{Number(t.price).toLocaleString()}</td>
                        <td className="mono text-secondary" style={{ fontSize: '11px' }}>
                          {t.traded_at?.replace('T', ' ').slice(0, 19)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setTradesModal(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionListPage;
