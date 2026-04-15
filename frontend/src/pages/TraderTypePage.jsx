// [파일 용도] 트레이더 유형 분석 결과 표시 페이지

import { useEffect, useState } from 'react';
import { getTraderType } from '../api/exchangeApi';

// [컴포넌트] 포지션 데이터 기반 트레이더 유형 분석 카드 / [호출] App.jsx > /trader-type, StatsPage (embedded)
const TraderTypePage = ({ embedded = false }) => {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTraderType()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const curr = localStorage.getItem('displayCurrency') || 'KRW';
  const fmtPnl = (v) => {
    if (v === 0) return '—';
    const sign = v > 0 ? '+' : '';
    return curr === 'KRW'
      ? `${sign}${(v * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
      : `${sign}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'page-container'} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>분석 중...</div>
      </div>
    );
  }

  const isUnknown = !data || data.type_code === 'UNKNOWN';

  return (
    <div className={embedded ? '' : 'page-container'}>
      <h1 className="page-title">나의 트레이더 유형</h1>

      {isUnknown ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            아직 데이터가 부족해요
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            포지션이 5건 이상 쌓이면 트레이더 유형을 분석해드릴게요.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 유형 메인 카드 */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
            border: '2px solid var(--accent)',
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{data.icon}</div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: '12px',
            }}>
              {data.type_name}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              {data.description}
            </div>
          </div>

          {/* 강점 / 약점 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="card" style={{ borderLeft: '3px solid #f87171' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                강점
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {data.strength}
              </div>
            </div>
            <div className="card" style={{ borderLeft: '3px solid #60a5fa' }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                약점
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {data.weakness}
              </div>
            </div>
          </div>

          {/* 분석 통계 */}
          <div className="card">
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '16px' }}>
              분석 기반 통계
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <StatItem label="총 포지션" value={`${data.stats?.total_positions ?? 0}건`} />
              <StatItem label="평균 보유시간"
                value={formatHours(data.stats?.avg_hold_hours ?? 0)} />
              <StatItem label="거래 종목 수" value={`${data.stats?.unique_symbols ?? 0}개`} />
              <StatItem label="전체 승률"
                value={`${data.stats?.win_rate ?? 0}%`}
                color={data.stats?.win_rate >= 50 ? '#f87171' : '#60a5fa'} />
              <StatItem label="평균 손익"
                value={fmtPnl(data.stats?.avg_pnl_per_trade ?? 0)}
                color={data.stats?.avg_pnl_per_trade >= 0 ? '#f87171' : '#60a5fa'} />
            </div>
          </div>

          {/* 유형 안내 */}
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              💡 트레이더 유형은 <strong>평균 포지션 보유 시간</strong>과 <strong>거래 종목 다양성</strong>을 기반으로 분류됩니다.
              포지션이 쌓일수록 분석이 더 정확해집니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// [컴포넌트] 통계 항목 카드 / [호출] TraderTypePage
const StatItem = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
  </div>
);

// [용도] 시간 단위 포맷 변환 / [호출] TraderTypePage
const formatHours = (hours) => {
  if (hours < 1) return `${Math.round(hours * 60)}분`;
  if (hours < 24) return `${Math.round(hours)}시간`;
  const days = Math.round(hours / 24);
  return `${days}일`;
};

export default TraderTypePage;
