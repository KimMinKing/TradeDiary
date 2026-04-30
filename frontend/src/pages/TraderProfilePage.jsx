// [파일 용도] 다른 트레이더의 공개 프로필 페이지 (일기 + 전략 통계)

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicProfile, getPublicJournals, getPublicStats } from '../api/exchangeApi';

// 감정 이모지 매핑
const emotionLabel = (e) => {
  const map = { CALM: '😌 차분', CONFIDENT: '😎 자신감', FOMO: '😨 FOMO', GREEDY: '🤑 욕심', FEARFUL: '😱 공포', ANXIOUS: '😰 불안' };
  return map[e] || e || '';
};

// [컴포넌트] 다른 트레이더의 공개 프로필 / [호출] App.jsx > /trader/:userId
const TraderProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('diary');

  // 일기 탭 데이터
  const [journals, setJournals] = useState([]);
  const [journalsLoading, setJournalsLoading] = useState(false);

  // 전략 통계 탭 데이터
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 통화 포맷
  const curr = localStorage.getItem('displayCurrency') || 'KRW';
  const fmtPnl = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return curr === 'KRW'
      ? `${sign}${(n * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
      : `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  };
  const fmtAssets = (v) => {
    if (!v) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return curr === 'KRW'
      ? `${(n * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
      : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // [용도] 프로필 데이터 로드 / [호출] 마운트 시
  useEffect(() => {
    getPublicProfile(userId)
      .then(res => setProfile(res.data))
      .catch(err => {
        setError(err?.response?.status === 403 ? '비공개 프로필입니다.' : '프로필을 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // [용도] 일기 데이터 로드 / [호출] 일기 탭 활성화 시
  useEffect(() => {
    if (activeTab !== 'diary' || !profile) return;
    setJournalsLoading(true);
    getPublicJournals(userId)
      .then(res => {
        const list = res.data.journals || [];
        // trade_date 내림차순 정렬 (최신 날짜가 위로)
        list.sort((a, b) => (b.trade_date || '').localeCompare(a.trade_date || ''));
        setJournals(list);
      })
      .catch(() => setJournals([]))
      .finally(() => setJournalsLoading(false));
  }, [activeTab, userId, profile]);

  // [용도] 전략 통계 데이터 로드 / [호출] 전략 통계 탭 활성화 시
  useEffect(() => {
    if (activeTab !== 'stats' || !profile) return;
    setStatsLoading(true);
    getPublicStats(userId)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [activeTab, userId, profile]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '16px' }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{error}</div>
        <button onClick={() => navigate('/ranking')} style={{
          padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)',
          background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem',
        }}>랭킹으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* 뒤로가기 */}
      <button onClick={() => navigate('/ranking')} style={{
        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
        cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px',
        marginBottom: '16px', padding: 0,
      }}>
        ← 랭킹으로 돌아가기
      </button>

      {/* 프로필 헤더 카드 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          {/* 아바타 */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--accent)', color: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            fontWeight: 700, flexShrink: 0, overflow: 'hidden',
          }}>
            {profile.avatar
              ? <img src={profile.avatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.nickname?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile.nickname}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              트레이더 프로필
            </div>
          </div>
        </div>

        {/* 통계 지표 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          <StatItem label="승률" value={`${profile.win_rate}%`}
            color={profile.win_rate >= 50 ? '#f87171' : '#60a5fa'} />
          <StatItem label="거래 수" value={`${profile.total_trades}건`} />
          <StatItem label="누적 수익" value={fmtPnl(profile.total_pnl)}
            color={parseFloat(profile.total_pnl) >= 0 ? '#f87171' : '#60a5fa'} />
          <StatItem label="총 자산" value={fmtAssets(profile.total_assets)} />
          <StatItem label="승리/패배" value={`${profile.win_count}승 ${profile.loss_count}패`} />
          <StatItem label="최대 연승" value={`${profile.max_win_streak}연승`} color="#f87171" />
          <StatItem label="최대 연패" value={`${profile.max_loss_streak}연패`} color="#60a5fa" />
        </div>
      </div>

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <TabButton active={activeTab === 'diary'} onClick={() => setActiveTab('diary')}>
          📖 매매 일기
        </TabButton>
        <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
          📊 전략 통계
        </TabButton>
      </div>

      {/* 일기 탭 */}
      {activeTab === 'diary' && (
        <div>
          {journalsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : journals.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>작성된 일기가 없습니다.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {journals.map((j) => (
                <div key={j.id} className="card" style={{ padding: '16px 20px' }}>
                  {/* 날짜 (제목 역할) + 심볼 + 감정 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {j.trade_date}
                      </span>
                      {j.symbol && (
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px',
                          background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)', fontWeight: 600,
                        }}>{j.symbol}</span>
                      )}
                    </div>
                    {j.emotion && (
                      <span style={{ fontSize: '0.8rem' }}>{emotionLabel(j.emotion)}</span>
                    )}
                  </div>
                  {j.entry_reason && (
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '6px' }}>진입</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{j.entry_reason}</span>
                    </div>
                  )}
                  {j.exit_reason && (
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '6px' }}>청산</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{j.exit_reason}</span>
                    </div>
                  )}
                  {j.memo && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      {j.memo}
                    </div>
                  )}
                  {j.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {j.tags.map(t => (
                        <span key={t.id} style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px',
                          background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}30`,
                        }}>{t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 전략 통계 탭 */}
      {activeTab === 'stats' && (
        <div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : !stats ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>통계 데이터가 없습니다.</div>
            </div>
          ) : (
            <>
              {/* 전략 태그별 승률 */}
              {stats.tag_stats?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    전략 태그별 승률
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.tag_stats.map((t, i) => (
                      <StatsBar key={i} label={t.tag_name} color={t.tag_color}
                        winRate={t.win_rate} total={t.total_count} pnl={t.total_pnl} />
                    ))}
                  </div>
                </div>
              )}

              {/* 감정별 승률 */}
              {stats.emotion_stats?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    감정별 승률
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.emotion_stats.map((e, i) => (
                      <StatsBar key={i} label={e.label} color={e.win_rate >= 50 ? '#f87171' : '#60a5fa'}
                        winRate={e.win_rate} total={e.total_count} pnl={e.total_pnl} />
                    ))}
                  </div>
                </div>
              )}

              {/* 종목별 승률 */}
              {stats.symbol_stats?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    종목별 승률
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.symbol_stats.slice(0, 10).map((s, i) => (
                      <StatsBar key={i} label={s.symbol} color={s.win_rate >= 50 ? '#f87171' : '#60a5fa'}
                        winRate={s.win_rate} total={s.total_count} pnl={s.total_pnl} />
                    ))}
                  </div>
                </div>
              )}

              {(!stats.tag_stats?.length && !stats.emotion_stats?.length && !stats.symbol_stats?.length) && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>표시할 통계 데이터가 없습니다.</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// [컴포넌트] 통계 지표 아이템 / [호출] TraderProfilePage
const StatItem = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
  </div>
);

// [컴포넌트] 탭 버튼 / [호출] TraderProfilePage
const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: '10px 20px',
    border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }}>
    {children}
  </button>
);

// [컴포넌트] 승률 바 차트 / [호출] TraderProfilePage (전략 통계 탭)
const StatsBar = ({ label, color, winRate, total, pnl }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{total}건</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color, minWidth: '45px', textAlign: 'right' }}>
          {winRate}%
        </span>
      </div>
    </div>
    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(winRate, 100)}%`,
        background: color, borderRadius: '3px',
        transition: 'width 0.3s ease',
      }} />
    </div>
  </div>
);

export default TraderProfilePage;
