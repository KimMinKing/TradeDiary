// [파일 용도] 거래소별 현재 보유 자산 표시 페이지

import { useState, useEffect } from 'react';
import { getBalances } from '../api/exchangeApi';
import api from '../api/authApi';

// [컴포넌트] 등록된 거래소의 보유 자산 목록 표시 / [호출] App.jsx 라우터
const HoldingsPage = () => {
  const [exchangeBalances, setExchangeBalances] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('displayCurrency') || 'KRW'
  );
  const [rates, setRates] = useState({ KRW: 1400, USD: 1, CNY: 7.2, JPY: 150 });

  useEffect(() => {
    fetchBalances();
    fetchExchangeRate();
    const onCurrencyChange = (e) => setDisplayCurrency(e.detail);
    window.addEventListener('currencyChange', onCurrencyChange);
    return () => window.removeEventListener('currencyChange', onCurrencyChange);
  }, []);

  // [용도] 거래소 잔고 조회 / [호출] useEffect, 새로고침 버튼
  const fetchBalances = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getBalances();
      setExchangeBalances(res.data);
    } catch (e) {
      console.error('잔고 조회 실패', e);
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
      console.error('환율 조회 실패', e);
    }
  };

  const CURRENCY_SYMBOL = { KRW: '₩', USD: '$', CNY: '¥', JPY: '¥' };

  // [용도] 자산 가치를 선택 통화로 환산하여 포맷 / [호출] 렌더
  // avgBuyPrice가 있으면 (Upbit) balance × avgBuyPrice로 가치 계산
  const formatValue = (balance, avgBuyPrice, unitCurrency) => {
    const qty = Number(balance);
    if (isNaN(qty) || qty === 0) return null;

    let valueInKrw;
    if (avgBuyPrice && unitCurrency === 'KRW' && Number(avgBuyPrice) > 0) {
      // Upbit: 평균 매수가 × 수량 = KRW 가치
      valueInKrw = qty * Number(avgBuyPrice);
    } else {
      return null; // 가격 정보 없는 경우 가치 미표시
    }

    const targetRate = rates[displayCurrency] ?? 1;
    const converted = valueInKrw / rates.KRW * targetRate;

    if (displayCurrency === 'KRW') {
      return Math.round(converted).toLocaleString() + '원';
    }
    const sym = CURRENCY_SYMBOL[displayCurrency] ?? '';
    return sym + Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // [용도] 숫자 정리 (불필요한 소수점 제거) / [호출] 잔고 표시
  const fmt = (val, maxDigits = 8) => {
    const num = Number(val);
    if (isNaN(num)) return val ?? '-';
    return parseFloat(num.toFixed(maxDigits)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDigits,
    });
  };

  // 거래소 색상 매핑
  const EXCHANGE_COLORS = {
    UPBIT:   '#3b82f6',
    BYBIT:   '#f59e0b',
    BITGET:  '#10b981',
    OKX:     '#6366f1',
    BINANCE: '#facc15',
    BINGX:   '#ec4899',
  };

  // 잔고 있는 거래소 목록 (오류 포함 전체 표시)
  const hasAny = exchangeBalances.length > 0;

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="page-header anim-fade-up">
        <h1 className="page-title">보유 자산</h1>
        <div className="header-actions">
          <button
            className="btn btn-sm"
            onClick={() => fetchBalances(true)}
            disabled={refreshing || loading}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-secondary)',
            }}
          >
            {refreshing ? '조회 중...' : '새로고침'}
          </button>
        </div>
      </div>

      <p className="text-sm text-secondary anim-fade-up" style={{ marginBottom: '24px' }}>
        거래소 API에서 실시간으로 조회한 현재 잔고입니다
      </p>

      {loading ? (
        <div className="empty-state">
          <p className="empty-state-title">잔고 조회 중...</p>
        </div>
      ) : !hasAny ? (
        <div className="card empty-state">
          <div className="empty-state-icon">◻</div>
          <p className="empty-state-title">등록된 거래소 없음</p>
          <p className="empty-state-desc">
            거래소 연동 페이지에서 API Key를 등록하면 잔고를 볼 수 있습니다
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exchangeBalances.map((ex) => {
            const accentColor = EXCHANGE_COLORS[ex.exchange] ?? 'var(--accent)';
            const hasError = !!ex.error;
            const hasAssets = ex.assets && ex.assets.length > 0;

            return (
              <div
                key={ex.exchange}
                className="card anim-fade-up2"
                style={{ padding: '0', overflow: 'hidden' }}
              >
                {/* 거래소 헤더 */}
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
                      조회 실패: {ex.error.length > 60 ? ex.error.slice(0, 60) + '...' : ex.error}
                    </span>
                  )}
                  {!hasError && !hasAssets && (
                    <span className="text-xs text-muted">보유 자산 없음</span>
                  )}
                  {!hasError && hasAssets && (
                    <span className="text-xs text-muted">{ex.assets.length}종</span>
                  )}
                </div>

                {/* 자산 목록 */}
                {hasAssets && (
                  <>
                    {/* 데스크탑 테이블 */}
                    <div className="trade-table-wrap">
                      <table className="trade-table">
                        <thead>
                          <tr>
                            <th>코인</th>
                            <th>전체 잔고</th>
                            <th>가용 잔고</th>
                            {ex.exchange === 'UPBIT' && <th>평균 매수가</th>}
                            {ex.exchange === 'UPBIT' && <th>평가 금액</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {ex.assets.map((asset, i) => {
                            const valueStr = formatValue(
                              asset.balance,
                              asset.avg_buy_price,
                              asset.unit_currency
                            );
                            return (
                              <tr key={i}>
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
                                      ? Number(asset.avg_buy_price).toLocaleString() + '원'
                                      : '-'}
                                  </td>
                                )}
                                {ex.exchange === 'UPBIT' && (
                                  <td className="mono text-buy" style={{ fontWeight: 500 }}>
                                    {valueStr ?? '-'}
                                  </td>
                                )}
                              </tr>
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
                        return (
                          <div key={`m-${i}`} className="trade-card">
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
                              <div>
                                <div className="trade-card-label">전체 잔고</div>
                                <div className="trade-card-value mono">{fmt(asset.balance)}</div>
                              </div>
                              <div>
                                <div className="trade-card-label">가용 잔고</div>
                                <div className="trade-card-value mono text-secondary">{fmt(asset.available)}</div>
                              </div>
                              {ex.exchange === 'UPBIT' && asset.avg_buy_price && Number(asset.avg_buy_price) > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div className="trade-card-label">평균 매수가</div>
                                  <div className="trade-card-value mono text-secondary">
                                    {Number(asset.avg_buy_price).toLocaleString()}원
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HoldingsPage;
