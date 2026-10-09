// [파일 용도] 다른 트레이더의 공 Profile 페이지 (Journal + Strategy statistics)

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPublicProfile, getPublicJournals, getPublicJournalImage, getPublicStats, getPublicPortfolio, getPublicPositions, getPublicTrades, followUser, unfollowUser, checkFollowStatus, getFollowCount, updateTradeAlerts } from '../api/exchangeApi';
import '../styles/trader-profile.css';
import '../styles/profile-symbols.css';
import useAuthStore, { getUserId } from '../store/authStore';
import ChartState from '../components/ChartState';

const PublicJournalImage = ({ userId, journal }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!journal.has_image) return;
    let active = true;
    getPublicJournalImage(userId, journal.id)
      .then(response => { if (active) setSrc(response.data.image); })
      .catch(() => {});
    return () => { active = false; };
  }, [userId, journal.id, journal.has_image]);
  return src ? <img src={src} alt="Public journal attachment" loading="lazy"
    style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: '10px', marginTop: '12px' }} /> : null;
};

// 감정 이모지 매핑
const emotionLabel = (e) => {
  const map = { CALM: '😌 Calm', CONFIDENT: '😎 Confident', FOMO: '😨 FOMO', GREEDY: '🤑 Greedy', FEARFUL: '😱 Fearful', ANXIOUS: '😰 Anxious' };
  return map[e] || e || '';
};

// [컴포넌트] 다른 트레이더의 공 Profile / [호출] App.jsx > /trader/:userId
const TraderProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const currentUserId = getUserId();
  const isOwnProfile = currentUserId !== null && String(currentUserId) === String(userId);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('diary');

  // 팔로우 상태
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tradeAlerts, setTradeAlerts] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  // Journal 탭 data
  const [journals, setJournals] = useState([]);
  const [journalsLoading, setJournalsLoading] = useState(false);

  // Strategy statistics 탭 data
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [performanceRange, setPerformanceRange] = useState('all');
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Trade history 탭 data
  const [activeSubTab, setActiveSubTab] = useState('positions'); // 'positions' | 'trades'
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [tradesList, setTradesList] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  // 통화 포맷
  const curr = localStorage.getItem('displayCurrency') || 'KRW';
  const liveKrwPerUsd = Number(portfolioData?.krw_per_usdt) || null;
  const fmtPnl = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    if (curr !== 'KRW' && !liveKrwPerUsd) return '—';
    return curr === 'KRW'
      ? `${sign}${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW`
      : `${sign}$${(n / liveKrwPerUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtAssets = (v) => {
    if (!v) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    if (curr === 'KRW' && !liveKrwPerUsd) return '—';
    return curr === 'KRW'
      ? `${(n * liveKrwPerUsd).toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW`
      : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // [용도] Profile data 로드 / [호출] 마운트 시
  useEffect(() => {
    getPublicProfile(userId)
      .then(res => {
        const data = res.data;
        setProfile(data);
        if (!data.diary_public) {
          setActiveTab(data.stats_public ? 'stats' : (data.positions_public || data.trades_public ? 'trades' : 'diary'));
        }
        if (!data.positions_public && data.trades_public) setActiveSubTab('trades');
      })
      .catch(err => {
        setError(err?.response?.status === 403 ? 'This profile is private.' : 'Could not load this profile.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // [용도] 팔로우 상태 Confirm / [호출] 마운트 시
  useEffect(() => {
    if (!isLoggedIn || isOwnProfile) return;

    checkFollowStatus(userId)
      .then(res => { setIsFollowing(res.data.is_following); setTradeAlerts(Boolean(res.data.trade_alerts_enabled)); })
      .catch(() => { setIsFollowing(false); setTradeAlerts(false); });
  }, [userId, isLoggedIn, isOwnProfile]);

  // [용도] Followers 수 조회 / [호출] 마운트 시
  useEffect(() => {
    getFollowCount(userId)
      .then(res => setFollowerCount(res.data.follower_count))
      .catch(() => setFollowerCount(0));
  }, [userId]);

  // [용도] 팔로우/언팔로우 처리 / [호출] 팔로우 버튼 클릭
  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      alert('Sign in is required.');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        setTradeAlerts(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('팔로우 처리 failed:', err);
      const status = err?.response?.status;
      alert(status === 401 ? 'Your session needs to be refreshed. Please try again.' : (err?.response?.data?.message || 'Could not update the follow status.'));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTradeAlerts = async () => {
    setAlertLoading(true);
    try {
      const { data } = await updateTradeAlerts(userId, !tradeAlerts);
      setTradeAlerts(Boolean(data.trade_alerts_enabled));
    } catch {
      alert('Could not update trade alerts.');
    } finally {
      setAlertLoading(false);
    }
  };

  // [용도] Journal data 로드 / [호출] Journal 탭 활성화 시
  useEffect(() => {
    if (activeTab !== 'diary' || !profile || !profile.diary_public) return;
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

  // [용도] Strategy statistics data 로드 / [호출] Strategy statistics 탭 활성화 시
  useEffect(() => {
    if (activeTab !== 'stats' || !profile || !profile.stats_public) return;
    setStatsLoading(true);
    getPublicStats(userId)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [activeTab, userId, profile]);

  useEffect(() => {
    if (activeTab !== 'stats' || !profile?.stats_public || !profile?.positions_public) return;
    setPortfolioLoading(true);
    getPublicPortfolio(userId, performanceRange)
      .then(response => setPortfolioData(response.data))
      .catch(() => setPortfolioData(null))
      .finally(() => setPortfolioLoading(false));
  }, [activeTab, userId, profile, performanceRange]);

  // [용도] 공 포지션 data 로드 / [호출] Trade history 탭 - 포지션 서브탭 활성화 시
  useEffect(() => {
    const needsPositions = activeTab === 'trades' && activeSubTab === 'positions';
    if (!needsPositions || !profile || !profile.positions_public) return;
    setPositionsLoading(true);
    getPublicPositions(userId)
      .then(res => setPositions(res.data))
      .catch(() => setPositions([]))
      .finally(() => setPositionsLoading(false));
  }, [activeTab, activeSubTab, userId, profile]);

  const portfolio = useMemo(() => {
    if (!portfolioData) return { visible: [], curve: [], totalPnl: 0, monthPnl: 0, maxDrawdown: 0, avgHoldHours: 0, tradesPer30: 0, tradeCount: 0 };
    const curve = (portfolioData.daily_performance || []).map(point => ({ date: point.date.slice(5), fullDate: point.date, pnl: Number(point.cumulative_pnl) }));
    if (curve.length === 1) curve.unshift({ date: 'Open', fullDate: curve[0].fullDate, pnl: 0 });
    return { visible: portfolioData.recent_positions || [], curve, totalPnl: Number(portfolioData.realized_trading_pnl), monthPnl: Number(portfolioData.current_month_pnl), maxDrawdown: Number(portfolioData.maximum_drawdown), avgHoldHours: portfolioData.average_holding_hours || 0, tradesPer30: portfolioData.trades_per30_days || 0, tradeCount: portfolioData.trade_count || 0 };
  }, [portfolioData]);

  // [용도] 공 Trade history data 로드 / [호출] Trade history 탭 - Executions 서브탭 활성화 시
  useEffect(() => {
    if (activeTab !== 'trades' || activeSubTab !== 'trades' || !profile || !profile.trades_public) return;
    setTradesLoading(true);
    getPublicTrades(userId)
      .then(res => setTradesList(res.data))
      .catch(() => setTradesList([]))
      .finally(() => setTradesLoading(false));
  }, [activeTab, activeSubTab, userId, profile]);

  // [용도] Trade history 탯 전환 시 서브탭 Reset / [호출] Trade history 탯 활성화 시
  useEffect(() => {
    if (activeTab === 'trades') {
      setActiveSubTab('positions'); // 포지션 탭을 기본으로 Settings
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading...</div>
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
        }}>Back to ranking</button>
      </div>
    );
  }

  return (
    <div className="page trader-profile-page">
      {/* 뒤로가기 */}
      <button onClick={() => navigate('/ranking')} style={{
        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
        cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px',
        marginBottom: '16px', padding: 0,
      }}>
        ← Back to ranking
      </button>

      <section className="trader-profile-hero">
        <aside className="trader-identity-panel">
          <div className="trader-avatar-xl">
            {profile.avatar ? <img src={profile.avatar} alt="Profile" /> : profile.nickname?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="trader-profile-label">PUBLIC TRADER PROFILE</span>
          <h1>{profile.nickname}</h1>
          <p>{followerCount} followers · {profile.total_trades || 0} recorded trades</p>
          {!isOwnProfile && <div className="trader-profile-actions">
            <button className={isFollowing ? 'secondary' : 'primary'} onClick={handleFollowToggle} disabled={followLoading}>
              {followLoading ? 'Updating...' : isFollowing ? 'Following' : '+ Follow trader'}
            </button>
            {isFollowing && <button className={tradeAlerts ? 'alert-on' : 'secondary'} onClick={handleTradeAlerts} disabled={alertLoading}>
              {tradeAlerts ? '● Trade alerts on' : 'Trade alerts off'}
            </button>}
          </div>}
          <dl className="trader-access-list">
            <div><dt>Journal</dt><dd>{profile.diary_public ? 'Public' : 'Private'}</dd></div>
            <div><dt>Positions</dt><dd>{profile.positions_public ? 'Public' : 'Private'}</dd></div>
            <div><dt>Executions</dt><dd>{profile.trades_public ? 'Public' : 'Private'}</dd></div>
          </dl>
        </aside>
        <div className="trader-performance-panel">
          <header><div><span className="trader-profile-label">PERFORMANCE OVERVIEW</span><h2>{profile.nickname}'s track record</h2></div><span className="profile-live-dot"><i /> Public data</span></header>
          <div className="trader-kpi-grid">
            <ProfileKpi label="Total assets" value={profile.assets_public ? fmtAssets(profile.total_assets) : 'Private'} />
            <ProfileKpi label="Cumulative PnL" value={profile.stats_public ? fmtPnl(profile.total_pnl) : 'Private'} tone={Number(profile.total_pnl) >= 0 ? 'positive' : 'negative'} />
            <ProfileKpi label="Win rate" value={profile.stats_public ? `${profile.win_rate}%` : 'Private'} />
            <ProfileKpi label="Wins / Losses" value={profile.stats_public ? `${profile.win_count} / ${profile.loss_count}` : 'Private'} />
          </div>
          <div className="trader-curve-card">
            <div><span>Performance curve</span><b>{profile.stats_public ? `${Number(profile.total_pnl) >= 0 ? '+' : ''}${profile.win_rate || 0}% win rate` : 'Performance is private'}</b></div>
            <ProfileCurve positive={Number(profile.total_pnl) >= 0} available={profile.stats_public} />
          </div>
          <div className="trader-streak-row">
            <div><span>Longest win streak</span><b>{profile.stats_public ? `${profile.max_win_streak} trades` : '—'}</b></div>
            <div><span>Longest loss streak</span><b>{profile.stats_public ? `${profile.max_loss_streak} trades` : '—'}</b></div>
            <div><span>Data scope</span><b>Verified executions</b></div>
          </div>
        </div>
      </section>

      {/* Legacy summary retained for data compatibility, hidden by the new profile layout. */}
      <div className="card old-profile-summary" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* 아바타 */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--accent)', color: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              fontWeight: 700, flexShrink: 0, overflow: 'hidden',
            }}>
              {profile.avatar
                ? <img src={profile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile.nickname?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {profile.nickname}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Trader profile · {followerCount} followers
              </div>
            </div>
          </div>

          {/* 팔로우 버튼 */}
          {!isOwnProfile && (<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isFollowing && <button
              onClick={handleTradeAlerts}
              disabled={alertLoading}
              title="Notify me when this trader has a newly detected execution"
              style={{ padding: '8px 14px', borderRadius: '6px', border: tradeAlerts ? '1px solid var(--accent)' : '1px solid var(--border)', background: tradeAlerts ? 'var(--accent-soft)' : 'transparent', color: tradeAlerts ? 'var(--accent)' : 'var(--text-secondary)', cursor: alertLoading ? 'wait' : 'pointer', fontSize: '0.82rem' }}
            >
              {tradeAlerts ? '🔔 Trade alerts on' : '🔕 Trade alerts off'}
            </button>}
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: isFollowing ? '1px solid var(--border)' : '1px solid var(--accent)',
                background: isFollowing ? 'transparent' : 'var(--accent)',
                color: isFollowing ? 'var(--text-primary)' : '#fff',
                cursor: followLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: isFollowing ? 500 : 600,
                transition: 'all 0.15s',
                opacity: followLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => !followLoading && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {followLoading ? 'Updating...' : isFollowing ? 'Following' : '+ Follow'}
            </button>
          </div>)}
        </div>

        {/* 통계 지표 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          {profile.stats_public && <><StatItem label="Win rate" value={`${profile.win_rate}%`}
            color={profile.win_rate >= 50 ? '#f87171' : '#60a5fa'} />
          <StatItem label="Trade 수" value={`${profile.total_trades}`} />
          <StatItem label="Cumulative profit" value={fmtPnl(profile.total_pnl)}
            color={parseFloat(profile.total_pnl) >= 0 ? '#f87171' : '#60a5fa'} />
          <StatItem label="Wins / Losses" value={`${profile.win_count}승 ${profile.loss_count}패`} />
          <StatItem label="Longest win streak" value={`${profile.max_win_streak}연승`} color="#f87171" />
          <StatItem label="Longest loss streak" value={`${profile.max_loss_streak}연패`} color="#60a5fa" /></>}
          {profile.assets_public && <StatItem label="총 Assets" value={fmtAssets(profile.total_assets)} />}
        </div>
      </div>

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        {profile.diary_public && <TabButton active={activeTab === 'diary'} onClick={() => setActiveTab('diary')}>
          📖 Trading journal
        </TabButton>}
        {profile.stats_public && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
          Portfolio
        </TabButton>}
        {(profile.positions_public || profile.trades_public) && <TabButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')}>
          💹 Trade history
        </TabButton>}
      </div>

      {/* Journal 탭 */}
      {activeTab === 'diary' && (
        <div>
          {journalsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : journals.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No public journal entries.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {journals.map((j) => (
                <div key={j.id} className="card" style={{ padding: '16px 20px' }}>
                  {/* 날짜 (제목 역할) + Symbol + 감정 */}
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
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '6px' }}>Entry</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{j.entry_reason}</span>
                    </div>
                  )}
                  {j.exit_reason && (
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '6px' }}>Exit</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{j.exit_reason}</span>
                    </div>
                  )}
                  {j.memo && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      {j.memo}
                    </div>
                  )}
                  <PublicJournalImage userId={userId} journal={j} />
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

      {/* Strategy statistics 탭 */}
      {activeTab === 'stats' && (
        <div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : !stats ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No performance data.</div>
            </div>
          ) : (
            <>
              {profile.positions_public ? <section className="public-portfolio">
                <header className="public-portfolio-head">
                  <div><span>VERIFIED PORTFOLIO</span><h2>{profile.nickname}'s performance</h2><p>Calculated from publicly shared closed positions.</p></div>
                  <div className="public-range-tabs">
                    {[['1d','1D'],['7d','7D'],['30d','30D'],['all','All']].map(([key, label]) => <button key={key} className={performanceRange === key ? 'active' : ''} onClick={() => setPerformanceRange(key)}>{label}</button>)}
                  </div>
                </header>
                <div className="public-portfolio-kpis">
                  <ProfileKpi label="Current assets" value={profile.assets_public ? fmtAssets(profile.total_assets) : 'Private'} />
                  <ProfileKpi label="Period PnL" value={fmtPnl(portfolio.totalPnl)} tone={portfolio.totalPnl >= 0 ? 'positive' : 'negative'} />
                  <ProfileKpi label="This month" value={fmtPnl(portfolio.monthPnl)} tone={portfolio.monthPnl >= 0 ? 'positive' : 'negative'} />
                  <ProfileKpi label="Maximum drawdown" value={fmtPnl(-portfolio.maxDrawdown)} tone="negative" />
                </div>
                {portfolioData?.cash_flow && !portfolioData.cash_flow.tracked && <div className="public-data-notice"><b>Return methodology</b><span>Trading return uses realized PnL divided by deployed entry capital. Deposits, withdrawals and time-weighted return will remain unavailable until balance history collection is enabled.</span></div>}
                <div className="public-performance-grid">
                  <div className="public-curve-panel">
                    <div className="public-panel-title"><div><b>Cumulative performance</b><span>{portfolio.tradeCount} closed positions</span></div><strong className={portfolio.totalPnl >= 0 ? 'positive' : 'negative'}>{fmtPnl(portfolio.totalPnl)}</strong></div>
                    {portfolioLoading ? <ChartState status="loading" title="Loading portfolio" height={230} /> : portfolio.curve.length === 0 ? <ChartState title="No closed positions in this period" description="Select a wider range or sync more trading history." height={230} /> : (
                      <ResponsiveContainer width="100%" height={230}>
                        <AreaChart data={portfolio.curve} margin={{ top:14, right:10, left:4, bottom:0 }}>
                          <defs><linearGradient id="publicPnlGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#25806a" stopOpacity=".25"/><stop offset="100%" stopColor="#25806a" stopOpacity="0"/></linearGradient></defs>
                          <CartesianGrid vertical={false} stroke="#e8edf2" strokeDasharray="3 4" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill:'#8290a0', fontSize:10 }} minTickGap={28}/>
                          <YAxis axisLine={false} tickLine={false} width={54} tick={{ fill:'#8290a0', fontSize:10 }} tickFormatter={value => Math.abs(value) >= 1000000 ? `${(value/1000000).toFixed(1)}M` : `${Math.round(value/1000)}K`}/>
                          <Tooltip formatter={value => [fmtPnl(value), 'Cumulative PnL']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}/>
                          <Area type="monotone" dataKey="pnl" stroke="#25806a" strokeWidth={2} fill="url(#publicPnlGradient)" activeDot={{ r:4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <aside className="public-style-panel">
                    <div className="public-panel-title"><div><b>Trading style</b><span>Behavioral summary</span></div></div>
                    <dl>
                      <div><dt>Win rate</dt><dd>{profile.win_rate}%</dd></div>
                      <div><dt>Average holding time</dt><dd>{portfolio.avgHoldHours ? `${portfolio.avgHoldHours.toFixed(1)}h` : '—'}</dd></div>
                      <div><dt>30-day trade pace</dt><dd>{portfolio.tradesPer30.toFixed(1)}</dd></div>
                      <div><dt>Capital-weighted return</dt><dd>{portfolioData ? `${portfolioData.capital_weighted_return_pct}%` : '—'}</dd></div>
                      <div><dt>Risk level</dt><dd>{portfolioData?.risk_level || '—'}</dd></div>
                      <div><dt>Best streak</dt><dd>{profile.max_win_streak} trades</dd></div>
                    </dl>
                  </aside>
                </div>
                {portfolio.visible.length > 0 && <div className="public-recent-positions">
                  <div className="public-panel-title"><div><b>Recent closed positions</b><span>Latest verified results in the selected period</span></div></div>
                  <div className="public-position-head"><span>Market</span><span>Side</span><span>Closed</span><span>Return</span><span>Realized PnL</span></div>
                  {[...portfolio.visible].reverse().slice(0,5).map((position, index) => <div className="public-position-row" key={`${position.exchange}-${position.symbol}-${position.closed_at}-${index}`}>
                    <b>{position.symbol}</b><span>{position.side}</span><span>{position.closed_at.slice(0,10)}</span><span className={Number(position.pnl_rate) >= 0 ? 'positive' : 'negative'}>{Number(position.pnl_rate) >= 0 ? '+' : ''}{Number(position.pnl_rate).toFixed(2)}%</span><strong className={Number(position.realized_pnl) >= 0 ? 'positive' : 'negative'}>{fmtPnl(position.realized_pnl)}</strong>
                  </div>)}
                </div>}
              </section> : <div className="card public-chart-empty" style={{ marginBottom: 20 }}>
                Detailed portfolio analytics are private. Only the trader's public summary is available.
              </div>}

              {/* 전략 태그별 Win rate */}
              {stats.tag_stats?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    Win rate by strategy tag
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.tag_stats.map((t, i) => (
                      <StatsBar key={i} label={t.tag_name} color={t.tag_color}
                        winRate={t.win_rate} total={t.total_count} pnl={t.total_pnl} />
                    ))}
                  </div>
                </div>
              )}

              {/* 감정별 Win rate */}
              {stats.emotion_stats?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    Win rate by emotion
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.emotion_stats.map((e, i) => (
                      <StatsBar key={i} label={e.label} color={e.win_rate >= 50 ? '#f87171' : '#60a5fa'}
                        winRate={e.win_rate} total={e.total_count} pnl={e.total_pnl} />
                    ))}
                  </div>
                </div>
              )}

              {/* Symbol별 Win rate */}
              {stats.symbol_stats?.length > 0 && (
                <div className="card profile-symbol-performance">
                  <div className="profile-stat-heading">
                    <div><h3>Symbol performance</h3><p>Win rate, sample size and realized result by market</p></div>
                    <span>{stats.symbol_stats.length} markets</span>
                  </div>
                  <div className="profile-symbol-list">
                    {stats.symbol_stats.slice(0, 10).map((s, i) => (
                      <StatsBar key={i} label={s.symbol} color={s.win_rate >= 50 ? '#f87171' : '#60a5fa'}
                        winRate={s.win_rate} total={s.total_count} wins={s.win_count} pnlLabel={fmtPnl(s.total_pnl)} />
                    ))}
                  </div>
                </div>
              )}

              {(!stats.tag_stats?.length && !stats.emotion_stats?.length && !stats.symbol_stats?.length) && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No performance data to display.</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Trade history 탭 */}
      {activeTab === 'trades' && (
        <div>
          {/* 서브탭 바 */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            {profile.positions_public && <TabButton active={activeSubTab === 'positions'} onClick={() => setActiveSubTab('positions')} style={{ fontSize: '0.85rem' }}>
              Positions
            </TabButton>}
            {profile.trades_public && <TabButton active={activeSubTab === 'trades'} onClick={() => setActiveSubTab('trades')} style={{ fontSize: '0.85rem' }}>
              📝 Executions
            </TabButton>}
          </div>

          {/* 포지션 서브탭 */}
          {profile.positions_public && activeSubTab === 'positions' && (
            <div>
              {positionsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
              ) : positions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No position history.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  {/* ── 데스크탑 테이블 ── */}
                  <div className="trade-table-wrap">
                    <table className="trade-table">
                      <thead>
                        <tr>
                          <th>Exchange</th>
                          <th>Symbol</th>
                          <th>Side</th>
                          <th>Quantity</th>
                          <th>Entry price (₩)</th>
                          <th>Exit price (₩)</th>
                          <th>PnL (₩)</th>
                          <th>Return</th>
                          <th>Closed at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos) => (
                          <tr key={pos.id}>
                            <td>
                              <span className={`badge badge-${pos.exchange.toLowerCase()}`}>
                                {pos.exchange}
                              </span>
                            </td>
                            <td className="mono" style={{ fontWeight: 500 }}>{pos.symbol}</td>
                            <td>
                              <span className={`badge badge-${pos.side === 'LONG' ? 'buy' : 'sell'}`}>
                                {pos.side === 'LONG' ? 'LONG' : 'SHORT'}
                              </span>
                            </td>
                            <td className="mono">{pos.qty}</td>
                            <td className="mono">{Number(pos.entry_price).toLocaleString()}</td>
                            <td className="mono">{pos.exit_price ? Number(pos.exit_price).toLocaleString() : '-'}</td>
                            <td className={`mono ${Number(pos.pnl) >= 0 ? 'text-buy' : 'text-sell'}`}>
                              {Number(pos.pnl) >= 0 ? '+' : ''}{Number(pos.pnl).toLocaleString()} KRW
                            </td>
                            <td className={`mono ${Number(pos.pnl_rate) >= 0 ? 'text-buy' : 'text-sell'}`} style={{ fontWeight: 600 }}>
                              {Number(pos.pnl_rate) >= 0 ? '+' : ''}{Number(pos.pnl_rate).toFixed(2)}%
                            </td>
                            <td className="mono text-secondary" style={{ fontSize: '12px' }}>
                              {pos.closed_at?.replace('T', ' ').slice(0, 16)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* ── 모바일 카드 ── */}
                    {positions.map((pos) => (
                      <div key={`card-${pos.id}`} className="trade-card">
                        <div className="trade-card-top">
                          <span className={`badge badge-${pos.exchange.toLowerCase()}`}>
                            {pos.exchange}
                          </span>
                          <span className={`badge badge-${pos.side === 'LONG' ? 'buy' : 'sell'}`}>
                            {pos.side === 'LONG' ? 'LONG' : 'SHORT'}
                          </span>
                          <span className="trade-card-symbol">{pos.symbol}</span>
                          <span className="trade-card-time" style={{ marginLeft: 'auto' }}>
                            {pos.closed_at?.replace('T', ' ').slice(0, 16)}
                          </span>
                        </div>
                        <div className="trade-card-row">
                          <div>
                            <div className="trade-card-label">Entry price</div>
                            <div className="trade-card-value mono">{Number(pos.entry_price).toLocaleString()} KRW</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div className="trade-card-label">Exit price</div>
                            <div className="trade-card-value mono">{pos.exit_price ? Number(pos.exit_price).toLocaleString() + ' KRW' : '-'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="trade-card-label">PnL</div>
                            <div className={`trade-card-value mono ${Number(pos.pnl) >= 0 ? 'text-buy' : 'text-sell'}`}>
                              {Number(pos.pnl) >= 0 ? '+' : ''}{Number(pos.pnl).toLocaleString()} KRW
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="trade-card-label">Return</div>
                            <div className={`trade-card-value mono ${Number(pos.pnl_rate) >= 0 ? 'text-buy' : 'text-sell'}`}
                                 style={{ fontWeight: 700 }}>
                              {Number(pos.pnl_rate) >= 0 ? '+' : ''}{Number(pos.pnl_rate).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Executions 서브탭 */}
          {profile.trades_public && activeSubTab === 'trades' && (
            <div>
              {tradesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
              ) : tradesList.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No execution history.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  {/* ── 데스크탑 테이블 ── */}
                  <div className="trade-table-wrap">
                    <table className="trade-table">
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Price (₩)</th>
                          <th>Fee (₩)</th>
                          <th>Executed at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradesList.map((trade) => {
                          const sideColor = trade.side === 'BUY' ? 'text-buy' : 'text-sell';
                          return (
                          <tr key={trade.id}>
                            <td className={`mono ${sideColor}`} style={{ fontWeight: 600 }}>{trade.symbol}</td>
                            <td>
                              <span className={`badge badge-${trade.side.toLowerCase()}`}>
                                {trade.side === 'BUY' ? 'BUY' : 'SELL'}
                              </span>
                            </td>
                            <td className={`mono ${sideColor}`}>{trade.qty}</td>
                            <td className={`mono ${sideColor}`}>{Number(trade.price).toLocaleString()}</td>
                            <td className="mono text-muted">{trade.fee ? Number(trade.fee).toLocaleString() : '0'}</td>
                            <td className="mono text-secondary" style={{ fontSize: '12px' }}>
                              {trade.traded_at?.replace('T', ' ').slice(0, 16)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* ── 모바일 카드 리스트 ── */}
                    {tradesList.map((trade) => (
                      <div key={`card-${trade.id}`} className="trade-card">
                        <div className="trade-card-top">
                          <span className={`badge badge-${trade.side.toLowerCase()}`}>
                            {trade.side === 'BUY' ? 'BUY' : 'SELL'}
                          </span>
                          <span className="trade-card-symbol" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {trade.symbol}
                            <img
                              src={`/exchanges/${trade.exchange.toLowerCase()}_logo.png`}
                              alt={trade.exchange}
                              style={{ height: '12px', width: 'auto', objectFit: 'contain', opacity: 0.55 }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, display: 'none' }}>
                              {trade.exchange.charAt(0) + trade.exchange.slice(1).toLowerCase()}
                            </span>
                          </span>
                          <span className="trade-card-time" style={{ marginLeft: 'auto' }}>
                            {trade.traded_at?.replace('T', ' ').slice(0, 16)}
                          </span>
                        </div>
                        <div className="trade-card-row">
                          <div>
                            <div className="trade-card-label">Price</div>
                            <div className={`trade-card-value ${trade.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                              {Number(trade.price).toLocaleString()} KRW
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="trade-card-label">Quantity</div>
                            <div className={`trade-card-value ${trade.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{trade.qty}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="trade-card-label">Fee</div>
                            <div className="trade-card-value text-muted">
                              {trade.fee ? Number(trade.fee).toLocaleString() + ' KRW' : '0'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

const ProfileKpi = ({ label, value, tone = '' }) => (
  <div className="trader-kpi"><span>{label}</span><b className={tone}>{value}</b></div>
);

const ProfileCurve = ({ positive, available }) => {
  if (!available) return <svg viewBox="0 0 800 120" role="img" aria-label="Performance data is private"><path d="M0 74 H800" stroke="#d8e1e9" strokeDasharray="5 7" fill="none"/><text x="400" y="64" textAnchor="middle" fill="#8997a6" fontSize="12">Private performance</text></svg>;
  const line = positive
    ? 'M0 92 C70 91 95 82 145 84 S230 62 288 68 S375 43 435 51 S520 32 581 38 S680 18 800 23'
    : 'M0 28 C75 31 112 40 160 36 S247 59 302 52 S390 79 446 70 S535 98 602 88 S705 103 800 96';
  const area = `${line} L800 120 L0 120 Z`;
  const color = positive ? '#239b7b' : '#cf5360';
  return <svg viewBox="0 0 800 120" preserveAspectRatio="none" role="img" aria-label="Public performance curve">
    <defs><linearGradient id={`profile-area-${positive}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <path d="M0 30 H800 M0 60 H800 M0 90 H800" stroke="#e7ecf1" strokeWidth="1" fill="none"/>
    <path d={area} fill={`url(#profile-area-${positive})`}/><path d={line} stroke={color} strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke"/>
  </svg>;
};

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

// [컴포넌트] Win rate 바 차트 / [호출] TraderProfilePage (Strategy statistics 탭)
const StatsBar = ({ label, color, winRate, total, wins, pnlLabel }) => (
  <div className="profile-symbol-row">
    <div className="profile-symbol-main">
      <span className="profile-symbol-name">{label}</span>
      <span className="profile-symbol-sample">{total} {total === 1 ? 'trade' : 'trades'}</span>
    </div>
    <div className="profile-symbol-rate">
      <div className="profile-symbol-track"><i style={{ width: `${Math.min(winRate, 100)}%`, background: color }} /></div>
      <b style={{ color }}>{winRate}%</b>
    </div>
    <span className="profile-symbol-record">{wins ?? Math.round(total * winRate / 100)}W · {total - (wins ?? Math.round(total * winRate / 100))}L</span>
    <span className={`profile-symbol-pnl${String(pnlLabel).trim().startsWith('-') ? ' negative' : ''}`}>{pnlLabel || '—'}</span>
  </div>
);

export default TraderProfilePage;
