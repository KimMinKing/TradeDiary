// [파일 용도] Exchange별 현재 Holdings 표시 페이지

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getBalances } from '../api/exchangeApi';
import api from '../api/authApi';
import ProfitRateDisplay from '../components/ProfitRateDisplay';
import ProfitChart from '../components/ProfitChart';
import ProfitChartSlide from '../components/ProfitChartSlide';

// [컴포넌트] Add된 Exchange의 Holdings 목록 표시 / [호출] App.jsx 라우터, PositionListPage (embedded)
const HoldingsPage = ({ embedded = false }) => {
  const [exchangeBalances, setExchangeBalances] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [rates, setRates] = useState({ KRW: 1400, USD: 1, CNY: 7.2, JPY: 150 });
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideSymbol, setSlideSymbol] = useState(null);
  const [slideAvgBuyPrice, setSlideAvgBuyPrice] = useState(0);

  useEffect(() => {
    fetchBalances();
    fetchExchangeRate();
    const onCurrencyChange = (e) => setDisplayCurrency(e.detail);
    window.addEventListener('currencyChange', onCurrencyChange);
    return () => window.removeEventListener('currencyChange', onCurrencyChange);
  }, []);

  // [용도] Exchange Balance 조회 / [호출] useEffect, 새로고침 버튼
  const fetchBalances = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getBalances();
      setExchangeBalances(res.data);
    } catch (e) {
      console.error('Balance Could not load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
      console.error('환율 Could not load', e);
    }
  };

  const CURRENCY_SYMBOL = { KRW: ' KRW', USD: '$', CNY: '¥', JPY: '¥' };

  // [용도] Assets 가치를 선택 통화로 환산하여 포맷 / [호출] 렌더
  // avgBuyPrice가 있으면 (Upbit) balance × avgBuyPrice로 가치 계산
  const formatValue = (balance, avgBuyPrice, unitCurrency) => {
    const qty = Number(balance);
    if (isNaN(qty) || qty === 0) return null;

    let valueInKrw;
    if (avgBuyPrice && unitCurrency === 'KRW' && Number(avgBuyPrice) > 0) {
      // Upbit: Average entry × Quantity = KRW 가치
      valueInKrw = qty * Number(avgBuyPrice);
    } else {
      return null; // Price 정보 없는 경우 가치 미표시
    }

    const targetRate = rates[displayCurrency] ?? 1;
    const converted = valueInKrw / rates.KRW * targetRate;

    if (displayCurrency === 'KRW') {
      return Math.round(converted).toLocaleString('ko-KR') + ' KRW';
    }
    const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
    return sym + Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // [용도] 숫자 정리 (불필요한 소수점 제거) / [호출] Balance 표시
  const fmt = (val, maxDigits = 8) => {
    const num = Number(val);
    if (isNaN(num)) return val ?? '-';
    return parseFloat(num.toFixed(maxDigits)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
    });
  };

  const fmtSigned = (val, maxDigits = 4) => {
    const num = Number(val);
    if (isNaN(num)) return val ?? '-';
    const formatted = parseFloat(Math.abs(num).toFixed(maxDigits)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
    });
    return `${num > 0 ? '+' : num < 0 ? '-' : ''}${formatted}`;
  };

  const positionSideLabel = (side) => {
    if (side === 'long') return 'LONG';
    if (side === 'short') return 'SHORT';
    return side ?? '-';
  };

  // Exchange 색상 매핑
  const EXCHANGE_COLORS = {
    UPBIT:   '#3b82f6',
    BYBIT:   '#f59e0b',
    BITGET:  '#10b981',
    OKX:     '#6366f1',
    BINANCE: '#facc15',
    BINGX:   '#ec4899',
    KRAKEN:  '#7252f3',
  };

  // Balance 있는 Exchange 목록 (error 포함 All 표시)
  const hasAny = exchangeBalances.length > 0;

  // [용도] 포트폴리오 파이 차트 data 구성 / [호출] 렌더
  // Upbit: balance × avgBuyPrice = KRW → displayCurrency 환산
  // 다른 Exchange: USDT/USDC 스테이블Asset만 USD 가치로 계산
  const PIE_COLORS = ['#f87171','#60a5fa','#a78bfa','#facc15','#34d399','#fb923c','#e879f9','#94a3b8'];
  const STABLE = ['USDT','USDC','BUSD','DAI'];

  const portfolioData = (() => {
    const map = {};
    exchangeBalances.forEach(ex => {
      if (!ex.assets) return;
      ex.assets.forEach(asset => {
        const qty = Number(asset.balance);
        if (!qty || qty === 0) return;
        let valueInUsd = 0;
        if (asset.unit_currency === 'KRW' && asset.avg_buy_price && Number(asset.avg_buy_price) > 0) {
          valueInUsd = (qty * Number(asset.avg_buy_price)) / rates.KRW;
        } else if (asset.unit_currency === 'USD' && STABLE.includes(asset.currency)) {
          valueInUsd = qty;
        } else {
          return;
        }
        if (valueInUsd > 0) {
          map[asset.currency] = (map[asset.currency] || 0) + valueInUsd;
        }
      });
    });
    const sorted = Object.entries(map)
      .map(([name, usd]) => {
        const targetRate = rates[displayCurrency] ?? 1;
        const val = usd * targetRate;
        return { name, value: Math.round(val * 100) / 100, usd };
      })
      .sort((a, b) => b.usd - a.usd);

    if (sorted.length > 7) {
      const others = sorted.slice(7).reduce((acc, x) => acc + x.usd, 0) * (rates[displayCurrency] ?? 1);
      return [...sorted.slice(0, 7), { name: 'Other', value: Math.round(others * 100) / 100 }];
    }
    return sorted;
  })();

  const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
  const totalPortfolio = portfolioData.reduce((acc, d) => acc + d.value, 0);
  const formatPortfolioValue = (value) => {
    const formatted = Number(value).toLocaleString('ko-KR', {
      maximumFractionDigits: displayCurrency === 'KRW' ? 0 : 2,
    });
    return displayCurrency === 'KRW' ? `${formatted} KRW` : `${sym}${formatted}`;
  };

  return (
    <div className={embedded ? '' : 'page'}>
      {/* 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">Holdings</h1>
        <div className="header-actions">
          <button
            className="compact-secondary-action"
            onClick={() => fetchBalances(true)}
            disabled={refreshing || loading}
          >
            <span className={refreshing ? 'compact-action-icon spinning' : 'compact-action-icon'}>↻</span>
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <p className="text-sm text-secondary anim-fade-up" style={{ marginBottom: '24px' }}>
        Current balances reported by your connected exchanges.
      </p>

      {/* 포트폴리오 요약 차트 */}
      {!loading && portfolioData.length > 0 && (
        <div className="card anim-fade-up" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
            Portfolio allocation
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
              (Upbit 평가금액 + 스테이블Asset 기준)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* 도넛 차트 */}
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {portfolioData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const pct = totalPortfolio > 0 ? ((d.value / totalPortfolio) * 100).toFixed(1) : 0;
                      return (
                        <div className="chart-tooltip">
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
                          <div className="mono" style={{ fontSize: 13 }}>{formatPortfolioValue(d.value)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 범례 + 총액 */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
                {formatPortfolioValue(totalPortfolio)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {portfolioData.map((d, i) => {
                  const pct = totalPortfolio > 0 ? ((d.value / totalPortfolio) * 100).toFixed(1) : 0;
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '60px' }}>{d.name}</span>
                      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: '2px', transition: 'width 0.4s' }} />
                      </div>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <p className="empty-state-title">Loading balances...</p>
        </div>
      ) : !hasAny ? (
        <div className="card empty-state">
          <div className="empty-state-icon">◻</div>
          <p className="empty-state-title">Add된 Exchange 없음</p>
          <p className="empty-state-desc">
            Exchange connection 페이지에서 API Key를 Add하면 Balance를 볼 수 있습니다
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exchangeBalances.map((ex) => {
            const accentColor = EXCHANGE_COLORS[ex.exchange] ?? 'var(--accent)';
            const hasError = !!ex.error;
            const hasAssets = ex.assets && ex.assets.length > 0;
            const hasPositions = ex.positions && ex.positions.length > 0;

            return (
              <div
                key={ex.exchange}
                className="card anim-fade-up2"
                style={{ padding: '0', overflow: 'hidden' }}
              >
                {/* Exchange 헤더 */}
                <div style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: `${accentColor}0d`,
                }}>
                  <span className={`badge badge-${ex.exchange.toLowerCase()}`}>
                    {ex.exchange}
                  </span>
                  {hasError && (
                    <span className="text-xs text-sell" style={{ marginLeft: '4px' }}>
                      Could not load: {ex.error.length > 60 ? ex.error.slice(0, 60) + '...' : ex.error}
                    </span>
                  )}
                  {!hasError && !hasAssets && !hasPositions && (
                    <span className="text-xs text-muted">Holdings 없음</span>
                  )}
                  {!hasError && (hasAssets || hasPositions) && (
                    <span className="text-xs text-muted">{ex.assets.length}종</span>
                  )}
                </div>

                {/* Assets 목록 */}
                {hasAssets && (
                  <>
                    {/* 데스크탑 테이블 */}
                    <div className="trade-table-wrap">
                      <table className="trade-table">
                        <thead>
                          <tr>
                            <th>Asset</th>
                            <th>All Balance</th>
                            <th>Available Balance</th>
                            {ex.exchange === 'UPBIT' && <th>Average entry</th>}
                            {ex.exchange === 'UPBIT' && <th>평가 금액</th>}
                            {ex.exchange === 'UPBIT' && <th>현재가</th>}
                            {ex.exchange === 'UPBIT' && <th>Return</th>}
                            {ex.exchange === 'UPBIT' && <th>Profit</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {ex.assets.map((asset, i) => {
                            const valueStr = formatValue(
                              asset.balance,
                              asset.avg_buy_price,
                              asset.unit_currency
                            );
                            const hasAvgPrice = ex.exchange === 'UPBIT' &&
                                              asset.avg_buy_price &&
                                              Number(asset.avg_buy_price) > 0;

                            return (
                              <>
                                <tr key={`${ex.exchange}-${asset.currency}-${i}`}>
                                  <td>
                                    <span className="mono" style={{
                                      fontWeight: 600,
                                      color: asset.currency === 'KRW' || asset.currency === 'USDT'
                                        ? 'var(--text-secondary)' : 'var(--text)',
                                    }}>
                                      {asset.currency}
                                    </span>
                                  </td>
                                  <td className="mono">{fmt(asset.balance)}</td>
                                  <td className="mono text-secondary">{fmt(asset.available)}</td>
                                  {ex.exchange === 'UPBIT' && (
                                    <td className="mono text-secondary">
                                      {asset.avg_buy_price && Number(asset.avg_buy_price) > 0
                                        ? Number(asset.avg_buy_price).toLocaleString() + ' KRW'
                                        : '-'}
                                    </td>
                                  )}
                                  {ex.exchange === 'UPBIT' && (
                                    <td className="mono text-buy" style={{ fontWeight: 500 }}>
                                      {valueStr ?? '-'}
                                    </td>
                                  )}
                                  {ex.exchange === 'UPBIT' && hasAvgPrice && (
                                    <td className="mono text-secondary">
                                      <ProfitRateDisplay
                                        symbol={asset.currency}
                                        avgBuyPrice={Number(asset.avg_buy_price)}
                                        qty={Number(asset.balance)}
                                        type="currentPrice"
                                        currentPrice={asset.current_price}
                                        onShowChart={(symbol, avgBuyPrice) => {
                                          setSlideSymbol(symbol);
                                          setSlideAvgBuyPrice(avgBuyPrice);
                                          setSlideOpen(true);
                                        }}
                                      />
                                    </td>
                                  )}
                                  {ex.exchange === 'UPBIT' && hasAvgPrice && (
                                    <td className="mono">
                                      <ProfitRateDisplay
                                        symbol={asset.currency}
                                        avgBuyPrice={Number(asset.avg_buy_price)}
                                        qty={Number(asset.balance)}
                                        type="profitRate"
                                        onShowChart={(symbol, avgBuyPrice) => {
                                          setSlideSymbol(symbol);
                                          setSlideAvgBuyPrice(avgBuyPrice);
                                          setSlideOpen(true);
                                        }}
                                      />
                                    </td>
                                  )}
                                  {ex.exchange === 'UPBIT' && hasAvgPrice && (
                                    <td className="mono">
                                      <ProfitRateDisplay
                                        symbol={asset.currency}
                                        avgBuyPrice={Number(asset.avg_buy_price)}
                                        qty={Number(asset.balance)}
                                        type="profitAmount"
                                        onShowChart={(symbol, avgBuyPrice) => {
                                          setSlideSymbol(symbol);
                                          setSlideAvgBuyPrice(avgBuyPrice);
                                          setSlideOpen(true);
                                        }}
                                        compact={true}
                                        // Holdings 탭의 값들 그대로 전달
                                        balance={asset.balance}
                                        available={asset.available}
                                        avgBuyPrice={asset.avg_buy_price}
                                        valueStr={valueStr}
                                        profitAmount={asset.profit_amount}
                                      />
                                    </td>
                                  )}
                                  {ex.exchange === 'UPBIT' && !hasAvgPrice && (
                                    <>
                                      <td className="mono text-secondary">-</td>
                                      <td className="mono text-secondary">-</td>
                                      <td className="mono text-secondary">-</td>
                                    </>
                                  )}
                                </tr>
                                {/* 모바일용 차트 영역 - 일시적으로 숨김 */}
                                {/* {ex.exchange === 'UPBIT' && hasAvgPrice && (
                                  <tr key={`chart-${ex.exchange}-${asset.currency}`}>
                                    <td colSpan="5" style={{ padding: '20px 0 0 0' }}>
                                      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                                        <ProfitChart symbol={asset.currency} />
                                      </div>
                                    </td>
                                  </tr>
                                )} */}
                              </>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* 모바일 카드 */}
                      {ex.assets.map((asset, i) => {
                        const valueStr = formatValue(
                          asset.balance,
                          asset.avg_buy_price,
                          asset.unit_currency
                        );
                        const hasAvgPrice = ex.exchange === 'UPBIT' &&
                                          asset.avg_buy_price &&
                                          Number(asset.avg_buy_price) > 0;

                        return (
                          <div key={`mobile-${ex.exchange}-${asset.currency}-${i}`} className="trade-card">
                            <div className="trade-card-top">
                              <span className="mono" style={{ fontWeight: 700, fontSize: '15px' }}>
                                {asset.currency}
                              </span>
                              {valueStr && (
                                <span className="mono text-buy" style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '14px' }}>
                                  {valueStr}
                                </span>
                              )}
                            </div>
                            <div className="trade-card-row">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div className="trade-card-label">All Balance</div>
                                <div className="trade-card-value mono">{fmt(asset.balance)}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div className="trade-card-label">Available Balance</div>
                                <div className="trade-card-value mono text-secondary">{fmt(asset.available)}</div>
                              </div>
                              {ex.exchange === 'UPBIT' && asset.avg_buy_price && Number(asset.avg_buy_price) > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                  <div className="trade-card-label">Average entry</div>
                                  <div className="trade-card-value mono text-secondary">
                                    {Number(asset.avg_buy_price).toLocaleString()} KRW
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Return/Profit 표시 영역 */}
                            {hasAvgPrice && (
                              <div
                                className="trade-card-profit"
                                onClick={() => {
                                  setSlideSymbol(asset.currency);
                                  setSlideAvgBuyPrice(Number(asset.avg_buy_price));
                                  setSlideOpen(true);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  marginTop: '12px',
                                  padding: '0',
                                  background: 'transparent',
                                  borderRadius: '0',
                                  border: 'none'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  width: '100%'
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', flex: 1 }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Return</span>
                                    <ProfitRateDisplay
                                      symbol={asset.currency}
                                      avgBuyPrice={Number(asset.avg_buy_price)}
                                      qty={Number(asset.balance)}
                                      type="currentPrice"
                                      compact={true}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Profit</span>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>▶</span>
                                    </div>
                                    <ProfitRateDisplay
                                      symbol={asset.currency}
                                      avgBuyPrice={Number(asset.avg_buy_price)}
                                      qty={Number(asset.balance)}
                                      type="profitAmount"
                                      compact={true}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {hasPositions && (
                  <div style={{ padding: '18px', borderTop: hasAssets ? '1px solid var(--border)' : 'none' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '12px'
                    }}>
                      Futures Positions
                    </div>

                    <div className="trade-table-wrap">
                      <table className="trade-table">
                        <thead>
                          <tr>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th>Quantity</th>
                            <th>Available to close</th>
                            <th>Entry</th>
                            <th>Mark price</th>
                            <th>Unrealized PnL</th>
                            <th>Leverage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.positions.map((position, i) => (
                            <tr key={`${ex.exchange}-position-${position.symbol}-${position.side}-${i}`}>
                              <td className="mono" style={{ fontWeight: 600 }}>{position.symbol}</td>
                              <td>
                                <span
                                  className={position.side === 'long' ? 'text-buy' : 'text-sell'}
                                  style={{ fontWeight: 700 }}
                                >
                                  {positionSideLabel(position.side)}
                                </span>
                              </td>
                              <td className="mono">{fmt(position.size)}</td>
                              <td className="mono text-secondary">{fmt(position.available_size)}</td>
                              <td className="mono">{fmt(position.entry_price)}</td>
                              <td className="mono text-secondary">{fmt(position.mark_price)}</td>
                              <td
                                className="mono"
                                style={{
                                  color: Number(position.unrealized_pnl) >= 0 ? 'var(--buy)' : 'var(--sell)',
                                  fontWeight: 600
                                }}
                              >
                                {fmtSigned(position.unrealized_pnl)}
                              </td>
                              <td className="mono text-secondary">{position.leverage}x</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {ex.positions.map((position, i) => (
                        <div key={`mobile-position-${ex.exchange}-${position.symbol}-${position.side}-${i}`} className="trade-card">
                          <div className="trade-card-top">
                            <span className="mono" style={{ fontWeight: 700, fontSize: '15px' }}>
                              {position.symbol}
                            </span>
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontWeight: 700,
                                color: position.side === 'long' ? 'var(--buy)' : 'var(--sell)'
                              }}
                            >
                              {positionSideLabel(position.side)}
                            </span>
                          </div>
                          <div className="trade-card-row">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div className="trade-card-label">Quantity</div>
                              <div className="trade-card-value mono">{fmt(position.size)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div className="trade-card-label">Entry</div>
                              <div className="trade-card-value mono">{fmt(position.entry_price)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                              <div className="trade-card-label">Leverage</div>
                              <div className="trade-card-value mono text-secondary">{position.leverage}x</div>
                            </div>
                          </div>
                          <div className="trade-card-row" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div className="trade-card-label">Mark price</div>
                              <div className="trade-card-value mono text-secondary">{fmt(position.mark_price)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginLeft: 'auto' }}>
                              <div className="trade-card-label">Unrealized PnL</div>
                              <div
                                className="trade-card-value mono"
                                style={{ color: Number(position.unrealized_pnl) >= 0 ? 'var(--buy)' : 'var(--sell)' }}
                              >
                                {fmtSigned(position.unrealized_pnl)}
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
          })}
        </div>
      )}

      {/* Return 차트 슬라이드 패널 */}
      {slideOpen && slideSymbol && (
        <ProfitChartSlide
          symbol={slideSymbol}
          avgBuyPrice={slideAvgBuyPrice}
          isOpen={slideOpen}
          onClose={() => setSlideOpen(false)}
        />
      )}
    </div>
  );
};

export default HoldingsPage;
