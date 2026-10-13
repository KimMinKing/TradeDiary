// [파일 용도] 종목 클릭 시 거래소 현재가와 24시간 시세 정보 표시

import { useEffect, useState } from 'react';
import api from '../api/authApi';
import { cachedGet } from '../api/requestCache';

const normalizeSymbol = (symbol, exchange) => {
  const value = String(symbol ?? '').trim().toUpperCase();
  if (exchange === 'UPBIT') return value.replace(/^KRW-/, '');
  return value;
};

const formatPrice = (value, exchange) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  const digits = number >= 1000 ? 0 : number >= 1 ? 4 : 8;
  const unit = exchange === 'UPBIT' ? ' KRW' : ' USDT';
  return `${number.toLocaleString('ko-KR', { maximumFractionDigits: digits })}${unit}`;
};

export const SymbolPriceButton = ({ symbol, className = '', children, onClick }) => (
  <button
    type="button"
    className={`symbol-price-button ${className}`.trim()}
    title={`${symbol} 현재가 보기`}
    aria-label={`${symbol} 현재가 보기`}
    onClick={onClick}
  >
    {children ?? symbol}
  </button>
);

const CurrentPriceModal = ({ quote, onClose }) => {
  const [state, setState] = useState({ key: '', data: null, error: '' });
  const exchange = String(quote?.exchange ?? '').toUpperCase();
  const symbol = normalizeSymbol(quote?.symbol, exchange);
  const quoteKey = `${exchange}:${symbol}`;

  useEffect(() => {
    if (!quote) return undefined;
    let active = true;

    cachedGet(
      `market-ticker:${exchange}:${symbol}`,
      () => api.get(`/api/market/ticker/${exchange}`, { params: { symbol } }),
      30_000,
    ).then((response) => {
      if (!active) return;
      if (response.data?.error) {
        setState({ key: quoteKey, data: null, error: response.data.message || '현재가를 찾을 수 없습니다.' });
        return;
      }
      setState({ key: quoteKey, data: response.data, error: '' });
    }).catch(() => {
      if (active) setState({ key: quoteKey, data: null, error: '현재가 조회에 실패했습니다.' });
    });

    return () => { active = false; };
  }, [exchange, quote, quoteKey, symbol]);

  useEffect(() => {
    if (!quote) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, quote]);

  if (!quote) return null;
  const loading = state.key !== quoteKey;
  const data = loading ? null : state.data;
  const rate = Number(data?.changeRate);
  const ratePercent = Number.isFinite(rate) ? rate * 100 : null;
  const updatedAt = data?.timestamp
    ? new Date(Number(data.timestamp)).toLocaleString('ko-KR')
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal current-price-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <header className="current-price-head">
          <div>
            <span className="badge">{exchange}</span>
            <h2>{symbol}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>닫기</button>
        </header>

        {loading ? (
          <div className="current-price-state">현재가를 조회하고 있습니다...</div>
        ) : state.error ? (
          <div className="current-price-state text-sell">{state.error}</div>
        ) : (
          <>
            <div className="current-price-main">
              <span>현재가</span>
              <strong>{formatPrice(data.tradePrice, exchange)}</strong>
              {ratePercent !== null && (
                <em className={ratePercent >= 0 ? 'text-buy' : 'text-sell'}>
                  24시간 {ratePercent >= 0 ? '+' : ''}{ratePercent.toFixed(2)}%
                </em>
              )}
            </div>
            <div className="current-price-grid">
              <div><span>24시간 고가</span><b>{formatPrice(data.highPrice, exchange)}</b></div>
              <div><span>24시간 저가</span><b>{formatPrice(data.lowPrice, exchange)}</b></div>
            </div>
            {updatedAt && <p className="current-price-updated">조회 기준 {updatedAt}</p>}
          </>
        )}
      </section>
    </div>
  );
};

export default CurrentPriceModal;
