// [파일 용도] 이번 달 트레이더 Win rate Ranking 페이지 (정렬 + 아바타 + 내 Rank 0번 + 모바일 심플 뷰 + 팔로우 필터)

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlyRanking, getMyFollowings } from '../api/exchangeApi';

// 그리드: Rank | 아바타 | Display name | Assets | Win rate | Trade | Profit
const GRID_COLS = '36px 30px 1fr 100px 56px 48px 120px';

// 정렬 옵션
const SORT_OPTIONS = [
  { key: 'win_rate',     label: 'Win Rate' },
  { key: 'total_assets', label: 'Assets' },
  { key: 'trade_count',  label: 'Trades' },
  { key: 'total_pnl',    label: 'PnL' },
];

// [컴포넌트] 아바타  KRW형 / [호출] RankingPage
const AvatarCircle = ({ avatar, nickname, size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: 'var(--accent)', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.45, fontWeight: 700, overflow: 'hidden',
  }}>
    {avatar
      ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : (nickname || '?').charAt(0).toUpperCase()}
  </div>
);

// 숫자 표시 공통 스타일 (얇게)
const PublicDiaryIcon = () => (
  <span
    title="공 Journal"
    aria-label="공 Journal"
    style={{
      width: 18,
      height: 18,
      borderRadius: '5px',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 55%, #facc15 56%, #f59e0b 100%)',
      border: '1px solid rgba(255,255,255,0.34)',
      boxShadow: '0 0 0 1px rgba(34,211,238,0.18), 0 0 12px rgba(34,211,238,0.35)',
      position: 'relative',
    }}
  >
    <span style={{
      position: 'absolute',
      left: 4,
      top: 3,
      bottom: 3,
      width: 1,
      background: 'rgba(255,255,255,0.75)',
      borderRadius: 1,
    }} />
    <span style={{
      width: 8,
      height: 6,
      borderTop: '2px solid rgba(255,255,255,0.95)',
      borderBottom: '2px solid rgba(255,255,255,0.8)',
      borderRadius: 1,
      transform: 'translateX(2px)',
    }} />
  </span>
);

const numStyle = (color) => ({
  textAlign: 'right', fontSize: '0.82rem', fontWeight: 400, color, whiteSpace: 'nowrap',
});

const formatTradeCount = (count) => (count > 0 ? `${count}` : '');

// [용도] 정렬 키에 해당하는 display value 반환 / [호출] 모바일 카드
const getSortValue = (entry, key, fmtAssets, fmtPnl) => {
  switch (key) {
    case 'total_assets': return fmtAssets(entry.total_assets);
    case 'win_rate':     return `${entry.win_rate ?? 0}%`;
    case 'trade_count':  return formatTradeCount(entry.trade_count);
    case 'total_pnl':    return fmtPnl(entry.total_pnl);
    default:             return `${entry.win_rate ?? 0}%`;
  }
};

// [컴포넌트] 월별 Win rate 기준 트레이더 Ranking 리스트 / [호출] App.jsx > /ranking
const RankingPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort] = useState({ key: 'win_rate', dir: 'desc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [followings, setFollowings] = useState([]); // 팔로우한 사용자 ID 목록
  const [showFollowedOnly, setShowFollowedOnly] = useState(false); // Following only 필터
  const [category, setCategory] = useState('score');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    getMonthlyRanking(category)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    // 팔로우 목록 가져오기
    const loadFollowings = () => {
      getMyFollowings()
        .then(res => {
          const followingIds = res.data?.map(f => f.following_id) ?? [];
          setFollowings(followingIds);
        })
        .catch(() => setFollowings([]));
    };
    loadFollowings();
  }, [category]);

  const curr = localStorage.getItem('displayCurrency') || 'KRW';
  const fmtPnl = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return curr === 'KRW'
      ? `${sign}${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW`
      : `${sign}$${(n / 1350).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtAssets = (v) => {
    if (!v) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return curr === 'KRW'
      ? `${(n * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW`
      : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getEntryKey = (entry, rank) => {
    if (entry?.user_id != null) return `user-${entry.user_id}`;
    if (entry?.nickname) return `nick-${entry.nickname}-${rank}`;
    return `rank-${rank}`;
  };

  const handleRowClick = (entry) => {
    if (!entry.diary_public) return;
    navigate(`/trader/${entry.user_id}`);
  };

  const handleSort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getTradeCountText = (count) => {
    return count > 0 ? `${count}` : '';
  };

  const rawEntries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const sortedEntries = useMemo(() => {
    let all = [...rawEntries].filter(entry => entry); // null 항목 제거

    // 팔로우 필터 Apply
    if (showFollowedOnly) {
      all = all.filter(entry => followings.includes(entry.user_id));
    }

    // 정렬
    const { key, dir } = sort;
    const mul = dir === 'desc' ? -1 : 1;
    all.sort((a, b) => {
      let va, vb;
      switch (key) {
        case 'total_assets': va = parseFloat(a.total_assets) || 0; vb = parseFloat(b.total_assets) || 0; break;
        case 'win_rate':     va = a.win_rate ?? 0; vb = b.win_rate ?? 0; break;
        case 'trade_count':  va = a.trade_count ?? 0; vb = b.trade_count ?? 0; break;
        case 'total_pnl':    va = parseFloat(a.total_pnl) || 0; vb = parseFloat(b.total_pnl) || 0; break;
        default:             va = a.win_rate ?? 0; vb = b.win_rate ?? 0;
      }
      return mul * (va - vb);
    });

    // 팔로우한 사용자를 상단에 표시 (필터 OFF일 때)
    if (!showFollowedOnly && followings.length > 0) {
      const followed = all.filter(e => followings.includes(e.user_id));
      const others = all.filter(e => !followings.includes(e.user_id));
      all = [...followed, ...others];
    }

    return all;
  }, [rawEntries, sort, followings, showFollowedOnly]);

  // 내 data (entries에 없는 경우만 별도 행으로 표시: 5 미만 등)
  const myRank = data?.my_rank;
  const myDisplayRank = useMemo(() => {
    const idx = sortedEntries.findIndex(entry => entry?.is_me);
    return idx >= 0 ? idx + 1 : (myRank?.rank ?? 0);
  }, [sortedEntries, myRank]);
  let myData = null;
  if (myRank) {
    myData = {
      rank: myRank.rank, user_id: null, nickname: 'You', avatar: null,
      trade_count: myRank.trade_count, win_rate: myRank.win_rate,
      total_pnl: myRank.total_pnl, total_assets: myRank.total_assets,
      is_me: true, diary_public: false,
    };
  }

  const sortArrow = (key) => sort.key === key ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : '';
  const sortableHeader = (key) => ({
    textAlign: 'right', cursor: 'pointer', userSelect: 'none',
    color: sort.key === key ? 'var(--accent)' : 'var(--text-muted)',
  });

  // [용도] 모바일 카드 1행 (Rank + 아바타 + Display name + 정렬값) / [호출] 모바일 뷰
  const renderMobileRow = (entry, isMe, notice, rank) => {
    const clickable = entry.diary_public;
    const isFollowed = followings.includes(entry.user_id);
    return (
      <div
        onClick={() => handleRowClick(entry)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: isMe ? '14px 14px' : '12px 14px',
          background: isFollowed && !isMe ? 'rgba(var(--neon-rgb, 34,211,238), 0.08)' :
                     isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
          borderBottom: isMe ? '2px solid var(--accent)' :
                      isFollowed ? '1px solid var(--neon)' : '1px solid var(--border)',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => clickable && (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.background = isFollowed && !isMe ? 'rgba(var(--neon-rgb, 34,211,238), 0.08)' :
                                                                   isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent')}
      >
        {/* Rank */}
        <span style={{
          flexShrink: 0, width: '28px', textAlign: 'center',
          fontSize: rank <= 3 ? '1.1rem' : '0.8rem', fontWeight: 700,
          color: isMe ? 'var(--accent)' : 'var(--text-secondary)',
        }}>
          {rankIcon(rank)}
        </span>
        {/* 아바타 */}
        <AvatarCircle avatar={entry.avatar} nickname={entry.nickname} size={32} />
        {/* Display name + 태그 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontWeight: isMe ? 700 : 500,
            color: isMe ? 'var(--accent)' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {entry.nickname}
          </span>
          {isMe && (
            <span style={{
              fontSize: '0.6rem', padding: '1px 5px',
              background: 'var(--accent)', color: '#fff',
              borderRadius: '99px', fontWeight: 600, flexShrink: 0,
            }}>You</span>
          )}
          {isFollowed && !isMe && (
            <span style={{ fontSize: '0.8rem', color: 'var(--neon)', fontWeight: 600 }}>⭐</span>
          )}
          {entry.diary_public && <PublicDiaryIcon />}
          {notice && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {notice}
            </span>
          )}
        </div>
        {/* Sort by 값 */}
        <span style={{
          flexShrink: 0, fontSize: '0.82rem', fontWeight: 400,
          color: sort.key === 'win_rate' ? (entry.win_rate >= 50 ? '#f87171' : '#60a5fa') :
                 sort.key === 'total_pnl' ? (parseFloat(entry.total_pnl) >= 0 ? '#f87171' : '#60a5fa') :
                 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}>
          {getSortValue(entry, sort.key, fmtAssets, fmtPnl)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={embedded ? 'community-ranking' : 'page'} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'community-ranking' : 'page'}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Monthly Ranking</h1>
        {data?.year_month && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{data.year_month}</span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px' }}>
        Risk-adjusted ranking based on return, drawdown, consistency and sample size.
      </p>
      <div className="ranking-category-tabs">
        {[['score','Overall'],['return','Return'],['win_rate','Win rate'],['risk','Low risk']].map(([key,label]) => <button key={key} className={category === key ? 'active' : ''} onClick={() => { setLoading(true); setCategory(key); }}>{label}</button>)}
      </div>

      {/* 팔로우 필터 버튼 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowFollowedOnly(!showFollowedOnly)}
          style={{
            background: showFollowedOnly ? 'var(--accent)' : 'var(--bg-elevated)',
            color: showFollowedOnly ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${showFollowedOnly ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => !showFollowedOnly && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => !showFollowedOnly && (e.currentTarget.style.background = 'var(--bg-elevated)')}
        >
          <span>{showFollowedOnly ? '⭐' : '☆'}</span>
          <span>Following only</span>
          {followings.length > 0 && (
            <span style={{
              background: showFollowedOnly ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
              color: '#fff',
              fontSize: '0.7rem',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              {followings.length}
            </span>
          )}
        </button>
        {showFollowedOnly && sortedEntries.length === 0 && (
          <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            팔로우한 트레이더가 Ranking에 없습니다
          </span>
        )}
      </div>

      {(sortedEntries.length === 0 && !myData) ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            아직 Ranking 집계 대상이 없어요
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            이번 달 5 이상 포지션이 쌓이면 Ranking이 Add됩니다.
          </div>
        </div>
      ) : isMobile ? (
        /* ── 모바일 심플 카드 뷰 ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 모바일 헤더: 정렬 콤보박스 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>
              Sort by
            </span>
            <select
              value={sort.key}
              onChange={e => handleSort(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: '6px',
                padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer',
                outline: 'none',
              }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 모바일 팔로우 필터 */}
          <div style={{
            padding: '10px 14px',
            borderBottom: showFollowedOnly ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: showFollowedOnly ? 'var(--accent-soft)' : 'transparent',
          }}>
            <button
              onClick={() => setShowFollowedOnly(!showFollowedOnly)}
              style={{
                background: showFollowedOnly ? 'var(--accent)' : 'var(--bg-elevated)',
                color: showFollowedOnly ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${showFollowedOnly ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <span>{showFollowedOnly ? '⭐' : '☆'}</span>
              <span>Following only</span>
              {followings.length > 0 && (
                <span style={{
                  background: showFollowedOnly ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}>
                  {followings.length}
                </span>
              )}
            </button>
          </div>

          {/* 0Rank: You (entries에 없는 경우만) */}
          {myData && renderMobileRow(myData, true, myRank?.notice, myDisplayRank || myRank?.rank || 0)}

          {/* All 트레이더 (내 것 포함) */}
          {sortedEntries.map((entry, index) => {
            const rank = index + 1;
            return (
              <div key={getEntryKey(entry, rank)}>
                {renderMobileRow(entry, entry.is_me, undefined, rank)}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── 데스크탑 테이블 뷰 ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: GRID_COLS, gap: '4px',
            padding: '12px 14px', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)', fontSize: '0.72rem',
            color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em',
          }}>
            <div>Rank</div>
            <div />
            <div>Display name</div>
            <div style={sortableHeader('total_assets')} onClick={() => handleSort('total_assets')}>
              Assets{sortArrow('total_assets')}
            </div>
            <div style={sortableHeader('win_rate')} onClick={() => handleSort('win_rate')}>
              Win rate{sortArrow('win_rate')}
            </div>
            <div style={sortableHeader('trade_count')} onClick={() => handleSort('trade_count')}>
              Trade{sortArrow('trade_count')}
            </div>
            <div style={sortableHeader('total_pnl')} onClick={() => handleSort('total_pnl')}>
              Profit{sortArrow('total_pnl')}
            </div>
          </div>

          {/* 0Rank: You (entries에 없는 경우만) */}
          {myData && (
            <div style={{
              display: 'grid', gridTemplateColumns: GRID_COLS, gap: '4px',
              padding: '14px 14px', alignItems: 'center',
              background: 'rgba(var(--accent-rgb, 99,102,241), 0.08)',
              borderBottom: '2px solid var(--accent)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>
                {myDisplayRank ? rankIcon(myDisplayRank) : '—'}
              </div>
              <AvatarCircle avatar={myData.avatar} nickname={myData.nickname} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                  {myData.nickname}
                </span>
                <span style={{
                  fontSize: '0.6rem', padding: '1px 5px',
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '99px', fontWeight: 600, flexShrink: 0,
                }}>You</span>
                {myRank?.notice && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {myRank.notice}
                  </span>
                )}
              </div>
              <div style={numStyle('var(--text-primary)')}>{fmtAssets(myData.total_assets)}</div>
              <div style={numStyle(myData.win_rate >= 50 ? '#f87171' : '#60a5fa')}>{myData.win_rate}%</div>
              <div style={numStyle('var(--text-secondary)')}>{getTradeCountText(myData.trade_count)}</div>
              <div style={numStyle(parseFloat(myData.total_pnl) >= 0 ? '#f87171' : '#60a5fa')}>
                {fmtPnl(myData.total_pnl)}
              </div>
            </div>
          )}

          {/* All 트레이더 목록 (내 것 포함, is_me면 하이라이트) */}
          {sortedEntries.map((entry, index) => {
            const clickable = entry.diary_public;
            const isMe = entry.is_me;
            const isFollowed = followings.includes(entry.user_id);
            const rank = index + 1;
            const isLast = index === sortedEntries.length - 1;
            return (
              <div key={getEntryKey(entry, rank)} onClick={() => handleRowClick(entry)} style={{
                display: 'grid', gridTemplateColumns: GRID_COLS, gap: '4px',
                padding: '14px 14px', alignItems: 'center',
                background: isFollowed && !isMe ? 'rgba(var(--neon-rgb, 34,211,238), 0.08)' :
                           isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
                borderBottom: isLast ? 'none' :
                            isFollowed ? '1px solid var(--neon)' : '1px solid var(--border)',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => clickable && !isMe && !isFollowed && (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = isFollowed && !isMe ? 'rgba(var(--neon-rgb, 34,211,238), 0.08)' :
                                                                     isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent')}
              >
                {/* Rank */}
                <div style={{ fontSize: rank <= 3 ? '1.1rem' : '0.85rem', fontWeight: 700, color: isMe ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {rankIcon(rank)}
                </div>
                {/* 아바타 */}
                <AvatarCircle avatar={entry.avatar} nickname={entry.nickname} />
                {/* Display name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{ fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {entry.nickname}
                  </span>
                  {isMe && (
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 5px',
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: '99px', fontWeight: 600, flexShrink: 0,
                    }}>You</span>
                  )}
                  {isFollowed && !isMe && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--neon)', fontWeight: 600 }}>⭐</span>
                  )}
                  {entry.diary_public && !isMe && (
                    <PublicDiaryIcon />
                  )}
                </div>
                {/* Assets */}
                <div style={numStyle('var(--text-primary)')}>{fmtAssets(entry.total_assets)}</div>
                {/* Win rate */}
                <div style={numStyle(entry.win_rate >= 50 ? '#f87171' : '#60a5fa')}>{entry.win_rate}%</div>
                {/* Trade 수 */}
                <div style={numStyle('var(--text-secondary)')}>{getTradeCountText(entry.trade_count)}</div>
                {/* Profit */}
                <div style={numStyle(parseFloat(entry.total_pnl) >= 0 ? '#f87171' : '#60a5fa')}>
                  {fmtPnl(entry.total_pnl)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
        📖 Journal를 공한 트레이더는 행 클릭으로 Profile을 볼 수 있습니다.
      </p>
    </div>
  );
};

export default RankingPage;
