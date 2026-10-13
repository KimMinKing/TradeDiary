import { useMemo } from 'react';
import './ProfitChart.css';

const makeSeries = (symbol, points) => {
  let seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return Array.from({ length: points }, (_, index) => {
    seed = (seed * 9301 + 49297) % 233280;
    const wave = Math.sin((index / Math.max(1, points - 1)) * Math.PI * 2) * 0.7;
    return Number((wave + (seed / 233280 - 0.5) * 0.65).toFixed(2));
  });
};

const ProfitChart = ({ symbol, interval = 'hour' }) => {
  const points = interval === 'week' ? 8 : interval === 'day' ? 14 : 24;
  const values = useMemo(() => makeSeries(symbol, points), [symbol, points]);
  const maxMagnitude = Math.max(1, ...values.map(Math.abs));

  return (
    <section className="profit-chart-container" aria-label={`${symbol} performance preview`}>
      <div className="profit-chart-header">
        <div>
          <h3 className="chart-title">{symbol}</h3>
          <span className="chart-subtitle">Performance preview</span>
        </div>
        <span className="status-badge">Indicative</span>
      </div>
      <div className="chart-wrapper" role="img" aria-label="Indicative normalized movement chart">
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '100%', padding: '12px 4px' }}>
          {values.map((value, index) => (
            <span
              key={`${index}-${value}`}
              title={`${value > 0 ? '+' : ''}${value}%`}
              style={{
                flex: 1,
                minWidth: '3px',
                height: `${20 + Math.abs(value) / maxMagnitude * 70}%`,
                borderRadius: '3px',
                background: value >= 0
                  ? 'linear-gradient(180deg, #68a5ff, #3979ee)'
                  : 'linear-gradient(180deg, #fb7185, #be3550)',
                opacity: 0.72 + index / values.length * 0.28,
              }}
            />
          ))}
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '10px' }}>
        실제 체결 기반 상세 차트는 analysis 화면에서 Confirm할 수 있습니다.
      </p>
    </section>
  );
};

export default ProfitChart;
