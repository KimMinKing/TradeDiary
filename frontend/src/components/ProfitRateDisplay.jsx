// [파일 용도] Asset Return 표시 컴포넌트

import { useEffect, useState, useCallback } from 'react';
import api from '../api/authApi';
import { cachedGet } from '../api/requestCache';

// [컴포넌트] Asset별 현재 정보 표시 / [호출] HoldingsPage 테이블 셀
const ProfitRateDisplay = ({ symbol, avgBuyPrice, qty: propQty = 0, type = 'all', onShowChart, compact = false, currentPrice: propCurrentPrice }) => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [profitRate, setProfitRate] = useState(null);
  const [profitAmount, setProfitAmount] = useState(null);
  const [qty, setQty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [coinNotFound, setCoinNotFound] = useState(false);

  const handleClick = () => {
    if (currentPrice && profitRate !== null) {
      onShowChart(symbol, avgBuyPrice);
    }
  };

  // Price data 처리 함수
  const handlePriceData = useCallback((data) => {
    setCoinNotFound(false);
    setCurrentPrice(data.tradePrice);

    const quantity = propQty > 0 ? propQty : 1;
    setQty(quantity);

    const rate = (data.tradePrice - avgBuyPrice) / avgBuyPrice * 100;
    const amount = (data.tradePrice - avgBuyPrice) * quantity;
    setProfitRate(rate);
    setProfitAmount(amount);
  }, [avgBuyPrice, propQty]);

  // 현재가 조회
  const fetchCurrentPrice = useCallback(async () => {
    setLoading(true);

    try {
      const normalizedSymbol = symbol.trim().toUpperCase();
      const res = await cachedGet(
        `market-ticker:${normalizedSymbol}`,
        () => api.get('/api/market/ticker', { params: { symbol: normalizedSymbol } }),
        300000,
      );

      // Asset이 존재하지 않는 경우 (COIN_NOT_FOUND 에러)
      if (res.data.error === 'COIN_NOT_FOUND') {
        setCoinNotFound(true);
        setCurrentPrice(null);
        setProfitRate(null);
        setProfitAmount(null);
        setLoading(false);
        return;
      }

      const price = res.data.tradePrice;
      if (!price || isNaN(Number(price))) {
        throw new Error('유효하지 않은 현재가 data');
      }
      handlePriceData(res.data);

    } catch {
      setCoinNotFound(true);
      setCurrentPrice(null);
      setProfitRate(null);
      setProfitAmount(null);
    } finally {
      setLoading(false);
    }
  }, [handlePriceData, symbol]);

  useEffect(() => {
    void fetchCurrentPrice();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchCurrentPrice();
    };

    // 10분마다 자동 갱신 (600,000ms)
    const interval = setInterval(fetchCurrentPrice, 600000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchCurrentPrice]);

  if (loading) {
    return <span style={{ fontSize: '12px' }}>조회중...</span>;
  }

  if (coinNotFound) {
    return <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>;
  }

  if (!currentPrice || profitRate === null) {
    return <span>-</span>;
  }

  const isPositive = profitRate >= 0;
  const rateColor = isPositive ? '#10b981' : '#ef4444';
  const amountColor = isPositive ? '#10b981' : '#ef4444';

  // 타입에 따라 다른 내용 표시
  switch (type) {
    case 'currentPrice':
      if (compact) {
        return (
          <span className="mono" style={{
            fontSize: '11px',
            color: isPositive ? '#10b981' : '#ef4444',
            fontWeight: 600,
          }}>
            {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
          </span>
        );
      }
      if (propCurrentPrice) {
        return (
          <div
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onClick={handleClick}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {Number(propCurrentPrice).toLocaleString('ko-KR', { maximumFractionDigits: 8 })} KRW
          </div>
        );
      }
      if (symbol === 'CHR') {
        return <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>;
      }
      return (
        <div
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          onClick={handleClick}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {Number(currentPrice).toLocaleString('ko-KR', { maximumFractionDigits: 8 })} KRW
        </div>
      );

    case 'profitRate':
      return (
        <div
          style={{
            color: rateColor,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          onClick={handleClick}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {profitRate.toFixed(1)}%
        </div>
      );

    case 'profitAmount':
      if (compact) {
        return (
          <span className="mono" style={{
            fontSize: '11px',
            color: amountColor,
            fontWeight: 600,
          }}>
            {Math.round(profitAmount).toLocaleString()} KRW
          </span>
        );
      }
      return (
        <div
          style={{
            color: amountColor,
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          onClick={handleClick}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {Math.round(profitAmount).toLocaleString()} KRW
        </div>
      );

    default:
      // 상장 종료 Asset은 평가금액만 표시
      if (coinNotFound) {
        const evaluationValue = avgBuyPrice * qty;
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.03)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 500 }}>
              상장 종료
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
              평가금액: {Math.round(evaluationValue).toLocaleString()} KRW
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              ※ 더 이상 상장되지 않은 Asset
            </div>
          </div>
        );
      }

      // 일반 Asset 표시
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '1px solid transparent'
          }}
          onClick={handleClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.border = '1px solid transparent';
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            현재가
          </div>
          <div className="mono" style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            {Number(currentPrice).toLocaleString('ko-KR', { maximumFractionDigits: 8 })} KRW
          </div>

          <div style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            margin: '8px 0'
          }} />

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Return
          </div>
          <div style={{
            color: rateColor,
            fontSize: '16px',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            {profitRate.toFixed(1)}%
          </div>

          <div style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            margin: '8px 0'
          }} />

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Profit
          </div>
          <div className="mono" style={{
            color: amountColor,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'monospace'
          }}>
            {Math.round(profitAmount).toLocaleString()} KRW
          </div>
        </div>
      );
  }
};

export default ProfitRateDisplay;
