// [파일 용도] 이번 달 트레이더 승률 랭킹 페이지 (정렬 + 아바타 + 내 순위 0번 + 모바일 심플 뷰)

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlyRanking } from '../api/exchangeApi';

// 그리드: 순위 | 아바타 | 닉네임 | 자산 | 승률 | 거래 | 수익
const GRID_COLS = '36px 30px 1fr 100px 56px 48px 120px';

// 정렬 옵션
const SORT_OPTIONS = [
  { key: 'win_rate',     label: '승률순' },
  { key: 'total_assets', label: '자산순' },
  { key: 'trade_count',  label: '거래순' },
  { key: 'total_pnl',    label: '수익순' },
];

// [컴포넌트] 아바타 원형 / [호출] RankingPage
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
const numStyle = (color) => ({
  textAlign: 'right', fontSize: '0.82rem', fontWeight: 400, color, whiteSpace: 'nowrap',
});

// [용도] 정렬 키에 해당하는 display value 반환 / [호출] 모바일 카드
const getSortValue = (entry, key, fmtAssets, fmtPnl) => {
  switch (key) {
    case 'total_assets': return fmtAssets(entry.total_assets);
    case 'win_rate':     return `${entry.win_rate}%`;
    case 'trade_count':  return `${entry.trade_count}건`;
    case 'total_pnl':    return fmtPnl(entry.total_pnl);
    default:             return `${entry.win_rate}%`;
  }
};

// [컴포넌트] 월별 승률 기준 트레이더 랭킹 리스트 / [호출] App.jsx > /ranking
const RankingPage = () => {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort] = useState({ key: 'win_rate', dir: 'desc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const fmtAssets = (v) => {
    if (!v) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return curr === 'KRW'
      ? `${(n * 1350).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
      : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
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

  const rawEntries = data?.entries ?? [];
  const sortedEntries = useMemo(() => {
    const all = [...rawEntries];
    const { key, dir } = sort;
    const mul = dir === 'desc' ? -1 : 1;
    all.sort((a, b) => {
      let va, vb;
      switch (key) {
        case 'total_assets': va = parseFloat(a.total_assets) || 0; vb = parseFloat(b.total_assets) || 0; break;
        case 'win_rate':     va = a.win_rate; vb = b.win_rate; break;
        case 'trade_count':  va = a.trade_count; vb = b.trade_count; break;
        case 'total_pnl':    va = parseFloat(a.total_pnl) || 0; vb = parseFloat(b.total_pnl) || 0; break;
        default:             va = a.win_rate; vb = b.win_rate;
      }
      return mul * (va - vb);
    });
    return all;
  }, [rawEntries, sort]);

  // 내 데이터 (entries에 없는 경우만 별도 행으로 표시: 5건 미만 등)
  const myEntryFromList = rawEntries.find(e => e.is_me);
  const myRank = data?.my_rank;
  let myData = myEntryFromList ? null : null;  // entries에 있으면 별도 행 불필요
  if (!myEntryFromList && myRank) {
    myData = {
      rank: myRank.rank, user_id: null, nickname: '나', avatar: null,
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

  // [용도] 모바일 카드 1행 (순위 + 아바타 + 닉네임 + 정렬값) / [호출] 모바일 뷰
  const MobileRow = ({ entry, isMe, notice }) => {
    const clickable = entry.diary_public;
    return (
      <div
        onClick={() => handleRowClick(entry)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: isMe ? '14px 14px' : '12px 14px',
          background: isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
          borderBottom: isMe ? '2px solid var(--accent)' : '1px solid var(--border)',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => clickable && (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.background = isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent')}
      >
        {/* 순위 */}
        <span style={{
          flexShrink: 0, width: '28px', textAlign: 'center',
          fontSize: entry.rank <= 3 ? '1.1rem' : '0.8rem', fontWeight: 700,
          color: isMe ? 'var(--accent)' : 'var(--text-secondary)',
        }}>
          {rankIcon(entry.rank)}
        </span>
        {/* 아바타 */}
        <AvatarCircle avatar={entry.avatar} nickname={entry.nickname} size={32} />
        {/* 닉네임 + 태그 */}
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
            }}>나</span>
          )}
          {entry.diary_public && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>📖</span>}
          {notice && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {notice}
            </span>
          )}
        </div>
        {/* 정렬 기준 값 */}
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
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>이번 달 랭킹</h1>
        {data?.year_month && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{data.year_month}</span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px' }}>
        이번 달 5건 이상 거래한 트레이더의 승률 기준 랭킹입니다.
      </p>

      {(sortedEntries.length === 0 && !myData) ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            아직 랭킹 집계 대상이 없어요
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            이번 달 5건 이상 포지션이 쌓이면 랭킹이 등록됩니다.
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
              정렬 기준
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

          {/* 0순위: 나 (entries에 없는 경우만) */}
          {myData && <MobileRow entry={myData} isMe notice={myRank?.notice} />}

          {/* 전체 트레이더 (내 것 포함) */}
          {sortedEntries.map((entry, idx) => (
            <MobileRow key={idx} entry={entry} isMe={entry.is_me} />
          ))}
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
            <div>순위</div>
            <div />
            <div>닉네임</div>
            <div style={sortableHeader('total_assets')} onClick={() => handleSort('total_assets')}>
              자산{sortArrow('total_assets')}
            </div>
            <div style={sortableHeader('win_rate')} onClick={() => handleSort('win_rate')}>
              승률{sortArrow('win_rate')}
            </div>
            <div style={sortableHeader('trade_count')} onClick={() => handleSort('trade_count')}>
              거래{sortArrow('trade_count')}
            </div>
            <div style={sortableHeader('total_pnl')} onClick={() => handleSort('total_pnl')}>
              수익{sortArrow('total_pnl')}
            </div>
          </div>

          {/* 0순위: 나 (entries에 없는 경우만) */}
          {myData && (
            <div style={{
              display: 'grid', gridTemplateColumns: GRID_COLS, gap: '4px',
              padding: '14px 14px', alignItems: 'center',
              background: 'rgba(var(--accent-rgb, 99,102,241), 0.08)',
              borderBottom: '2px solid var(--accent)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>
                {myData.rank ? rankIcon(myData.rank) : '—'}
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
                }}>나</span>
                {myRank?.notice && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {myRank.notice}
                  </span>
                )}
              </div>
              <div style={numStyle('var(--text-primary)')}>{fmtAssets(myData.total_assets)}</div>
              <div style={numStyle(myData.win_rate >= 50 ? '#f87171' : '#60a5fa')}>{myData.win_rate}%</div>
              <div style={numStyle('var(--text-secondary)')}>{myData.trade_count}건</div>
              <div style={numStyle(parseFloat(myData.total_pnl) >= 0 ? '#f87171' : '#60a5fa')}>
                {fmtPnl(myData.total_pnl)}
              </div>
            </div>
          )}

          {/* 전체 트레이더 목록 (내 것 포함, is_me면 하이라이트) */}
          {sortedEntries.map((entry, idx) => {
            const clickable = entry.diary_public;
            const isMe = entry.is_me;
            return (
              <div key={idx} onClick={() => handleRowClick(entry)} style={{
                display: 'grid', gridTemplateColumns: GRID_COLS, gap: '4px',
                padding: '14px 14px', alignItems: 'center',
                background: isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
                borderBottom: idx === sortedEntries.length - 1 ? 'none' : '1px solid var(--border)',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => clickable && !isMe && (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = isMe ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent')}
              >
                {/* 순위 */}
                <div style={{ fontSize: entry.rank <= 3 ? '1.1rem' : '0.85rem', fontWeight: 700, color: isMe ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {rankIcon(entry.rank)}
                </div>
                {/* 아바타 */}
                <AvatarCircle avatar={entry.avatar} nickname={entry.nickname} />
                {/* 닉네임 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{ fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {entry.nickname}
                  </span>
                  {isMe && (
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 5px',
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: '99px', fontWeight: 600, flexShrink: 0,
                    }}>나</span>
                  )}
                  {entry.diary_public && !isMe && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>📖</span>
                  )}
                </div>
                {/* 자산 */}
                <div style={numStyle('var(--text-primary)')}>{fmtAssets(entry.total_assets)}</div>
                {/* 승률 */}
                <div style={numStyle(entry.win_rate >= 50 ? '#f87171' : '#60a5fa')}>{entry.win_rate}%</div>
                {/* 거래 수 */}
                <div style={numStyle('var(--text-secondary)')}>{entry.trade_count}건</div>
                {/* 수익 */}
                <div style={numStyle(parseFloat(entry.total_pnl) >= 0 ? '#f87171' : '#60a5fa')}>
                  {fmtPnl(entry.total_pnl)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
        📖 일기를 공개한 트레이더는 행 클릭으로 프로필을 볼 수 있습니다.
      </p>
    </div>
  );
};

export default RankingPage;
