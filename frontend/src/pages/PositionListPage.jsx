// [파일 용도] 포지션 목록 페이지 (거래소 필터 탭 + 수익률/수익금 표시)

import { useState, useEffect } from 'react';
import { getPositions, rebuildPositions } from '../api/exchangeApi';

// [컴포넌트] 완결된 포지션 목록 및 통계 표시 / [호출] App.jsx 라우터
const PositionListPage = () => {
  const [positions,   setPositions]   = useState([]);
  const [activeTab,   setActiveTab]   = useState('ALL');
  const [loading,     setLoading]     = useState(true);
  const [rebuilding,  setRebuilding]  = useState(null);
  const [message,     setMessage]     = useState('');

  useEffect(() => { fetchPositions(); }, []);

  // [용도] 포지션 목록 조회 / [호출] useEffect, rebuild 완료 후
  const fetchPositions = async () => {
    setLoading(true);
    try {
      const res = await getPositions();
      setPositions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // [용도] 포지션 수동 재계산 버튼 / [호출] 재계산 버튼 클릭
  const handleRebuild = async (exchange) => {
    if (rebuilding) return;
    setRebuilding(exchange);
    setMessage('');
    try {
      await rebuildPositions(exchange);
      setMessage(`${exchange} 포지션 재계산 완료`);
      fetchPositions();
    } catch {
      setMessage('포지션 재계산 실패');
    } finally {
      setRebuilding(null);
    }
  };

  const tabs = [
    { key: 'ALL',    label: '전체' },
    { key: 'UPBIT',  label: 'Upbit' },
    { key: 'BYBIT',  label: 'Bybit' },
    { key: 'BITGET', label: 'Bitget' },
    { key: 'OKX',    label: 'OKX' },
  ];

  const filtered = activeTab === 'ALL'
    ? positions
    : positions.filter((p) => p.exchange === activeTab);

  // [용도] 숫자 포맷 (소수점 정리) / [호출] 테이블/카드 렌더
  const fmt = (val, digits = 2) => {
    const num = Number(val);
    return isNaN(num) ? '-' : num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  };

  // [용도] PnL 부호에 따른 색상 클래스 / [호출] 렌더
  const pnlClass = (pnl) => Number(pnl) >= 0 ? 'text-buy' : 'text-sell';

  // [용도] 거래소별 통화 기호 / [호출] 렌더
  const currency = (exchange) => exchange === 'UPBIT' ? '원' : ' USDT';

  // [용도] 날짜 포맷 (T 제거, 초 이하 제거) / [호출] 렌더
  const fmtDate = (dt) => dt?.replace('T', ' ').slice(0, 16) ?? '-';

  // 탭별 승/패 통계
  const wins  = filtered.filter((p) => Number(p.pnl) >= 0).length;
  const total = filtered.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const totalPnlByExchange = (exchange) =>
    filtered.filter((p) => exchange === 'ALL' || p.exchange === exchange)
      .reduce((sum, p) => sum + Number(p.pnl), 0);

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">포지션</h1>
        <div className="header-actions">
          <button
            className="btn btn-upbit btn-sm"
            onClick={() => handleRebuild('UPBIT')}
            disabled={rebuilding !== null}
          >
            {rebuilding === 'UPBIT' ? '계산 중...' : 'Upbit 재계산'}
          </button>
          <button
            className="btn btn-bybit btn-sm"
            onClick={() => handleRebuild('BYBIT')}
            disabled={rebuilding !== null}
          >
            {rebuilding === 'BYBIT' ? '계산 중...' : 'Bybit 재계산'}
          </button>
          <button
            className="btn btn-bitget btn-sm"
            onClick={() => handleRebuild('BITGET')}
            disabled={rebuilding !== null}
          >
            {rebuilding === 'BITGET' ? '계산 중...' : 'Bitget 재계산'}
          </button>
          <button
            className="btn btn-okx btn-sm"
            onClick={() => handleRebuild('OKX')}
            disabled={rebuilding !== null}
          >
            {rebuilding === 'OKX' ? '계산 중...' : 'OKX 재계산'}
          </button>
        </div>
      </div>

      {message && (
        <p className={message.includes('실패') ? 'msg-error' : 'msg-success'}
           style={{ marginBottom: '12px' }}>
          {message}
        </p>
      )}

      {/* 거래소 탭 */}
      <div className="filter-bar anim-fade-up2">
        <div className="tabs">
          {tabs.map((tab) => {
            const count = tab.key === 'ALL' ? positions.length
              : positions.filter((p) => p.exchange === tab.key).length;
            return (
              <button
                key={tab.key}
                className={`tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
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
          <div className="table-header">
            <span className="mono text-xs text-muted">총 {total}건</span>
          </div>

          {/* ── 데스크탑 테이블 ── */}
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>거래소</th>
                  <th>종목</th>
                  <th>방향</th>
                  <th>수량</th>
                  <th>진입가</th>
                  <th>청산가</th>
                  <th>손익</th>
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
                    <td className="mono">{fmt(pos.qty, 6)}</td>
                    <td className="mono">{fmt(pos.entry_price)}{currency(pos.exchange)}</td>
                    <td className="mono">{fmt(pos.exit_price)}{currency(pos.exchange)}</td>
                    <td className={`mono ${pnlClass(pos.pnl)}`}>
                      {Number(pos.pnl) >= 0 ? '+' : ''}{fmt(pos.pnl)}{currency(pos.exchange)}
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
                    <div className="trade-card-value mono">{fmt(pos.entry_price)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="trade-card-label">청산가</div>
                    <div className="trade-card-value mono">{fmt(pos.exit_price)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="trade-card-label">손익</div>
                    <div className={`trade-card-value mono ${pnlClass(pos.pnl)}`}>
                      {Number(pos.pnl) >= 0 ? '+' : ''}{fmt(pos.pnl)}
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
    </div>
  );
};

export default PositionListPage;
