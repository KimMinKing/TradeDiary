import { useEffect } from 'react';
import ProfitChart from './ProfitChart';
import './ProfitChart.css';

const ProfitChartSlide = ({ symbol, avgBuyPrice, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="auth-overlay" onMouseDown={onClose} role="presentation">
      <section
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label={`${symbol} asset details`}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(680px, 94vw)', maxHeight: '88vh', overflow: 'auto' }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <span className="workspace-kicker">ASSET DETAIL</span>
            <h2 style={{ fontSize: '22px', marginTop: '4px' }}>{symbol}</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <ProfitChart symbol={symbol} interval="day" />
        <div className="profit-stats" style={{ marginTop: '16px' }}>
          <div className="stat-item">
            <span className="stat-label">Average entry</span>
            <strong className="stat-value">{Number(avgBuyPrice || 0).toLocaleString()}</strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">data 상태</span>
            <strong className="stat-value">Indicative preview</strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfitChartSlide;
