// [파일 용도] 이번 달 트레이더 승률 랭킹 페이지

import { useEffect, useState } from 'react';
import { getMonthlyRanking } from '../api/exchangeApi';

// [컴포넌트] 월별 승률 기준 트레이더 랭킹 리스트 / [호출] App.jsx > /ranking
const RankingPage = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlyRanking()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const curr = localStorage.getItem('displayCurrency') || 'KRW';
  const fmtPnl = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return curr === 'KRW'
      ? `${sign}${(n * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
      : `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  };

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>로딩 중...</div>
      </div>
    );
  }

  const myRank = data?.my_rank;
  const entries = data?.entries ?? [];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>이번 달 랭킹</h1>
        {data?.year_month && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{data.year_month}</span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px' }}>
        이번 달 5건 이상 거래한 트레이더의 승률 기준 랭킹입니다.
      </p>

      {/* 내 랭킹 배너 */}
      {myRank && (
        <div className="card" style={{
          marginBottom: '16px',
          borderLeft: myRank.rank ? '3px solid var(--accent)' : '3px solid var(--text-muted)',
          background: myRank.rank ? 'var(--bg-card)' : 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>내 순위</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>
                {myRank.rank ? rankIcon(myRank.rank) : '—'}
              </div>
              {myRank.notice && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {myRank.notice}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>거래 수</div>
                <div style={{ fontWeight: 600 }}>{myRank.trade_count}건</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>승률</div>
                <div style={{ fontWeight: 600, color: myRank.win_rate >= 50 ? '#f87171' : '#60a5fa' }}>
                  {myRank.win_rate}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>수익</div>
                <div style={{ fontWeight: 600, color: parseFloat(myRank.total_pnl) >= 0 ? '#f87171' : '#60a5fa' }}>
                  {fmtPnl(myRank.total_pnl)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 랭킹 테이블 */}
      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            아직 랭킹 집계 대상이 없어요
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            이번 달 5건 이상 포지션이 쌓이면 랭킹이 등록됩니다.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 80px 80px 120px',
            gap: '8px',
            padding: '12px 20px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div>순위</div>
            <div>닉네임</div>
            <div style={{ textAlign: 'right' }}>거래</div>
            <div style={{ textAlign: 'right' }}>승률</div>
            <div style={{ textAlign: 'right' }}>수익</div>
          </div>

          {/* 항목 */}
          {entries.map((entry, idx) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 80px 120px',
              gap: '8px',
              padding: '14px 20px',
              borderBottom: idx < entries.length - 1 ? '1px solid var(--border)' : 'none',
              background: entry.is_me ? 'rgba(var(--accent-rgb, 99,102,241), 0.06)' : 'transparent',
              alignItems: 'center',
            }}>
              {/* 순위 */}
              <div style={{ fontSize: entry.rank <= 3 ? '1.3rem' : '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {rankIcon(entry.rank)}
              </div>
              {/* 닉네임 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: entry.is_me ? 700 : 500, color: entry.is_me ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {entry.nickname}
                </span>
                {entry.is_me && (
                  <span style={{
                    fontSize: '0.65rem', padding: '2px 6px',
                    background: 'var(--accent)', color: '#fff',
                    borderRadius: '99px', fontWeight: 600,
                  }}>나</span>
                )}
              </div>
              {/* 거래 수 */}
              <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {entry.trade_count}건
              </div>
              {/* 승률 */}
              <div style={{ textAlign: 'right', fontWeight: 600, color: entry.win_rate >= 50 ? '#f87171' : '#60a5fa' }}>
                {entry.win_rate}%
              </div>
              {/* 수익 */}
              <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem',
                color: parseFloat(entry.total_pnl) >= 0 ? '#f87171' : '#60a5fa' }}>
                {fmtPnl(entry.total_pnl)}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
        본인 외 닉네임은 첫 글자만 표시됩니다. 매 페이지 로드 시 실시간 집계됩니다.
      </p>
    </div>
  );
};

export default RankingPage;
