// [파일 용도] 대시보드 페이지 - 핵심 지표 요약 + 매매계획 + 실적비교 + 인사이트

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getMonthlyGoal, saveMonthlyGoal, getPlans, togglePlanDone } from '../api/exchangeApi';

// [용도] 손익 색상 / [호출] 렌더
const pnlColor = (val) => Number(val) >= 0 ? '#f87171' : '#60a5fa';

// mono 폰트 공통 스타일
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// [용도] 손익 포맷 (+/- 기호 포함) / [호출] 렌더
const fmtPnl = (val) => {
  const n = Number(val);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n >= 0 ? `+${abs}` : `-${abs}`;
};

// [용도] 오늘 날짜 포맷 / [호출] 렌더
const todayStr = () => {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
};

// [용도] 날짜 포맷 (MM/DD) / [호출] 렌더
const shortDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// [용도] 요일 포맷 / [호출] 렌더
const dayOfWeek = (dateStr) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
};

// [컴포넌트] 대시보드 메인 화면 / [호출] App.jsx 라우터
const DashboardPage = () => {
  const navigate = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [goal,       setGoal]       = useState(null);
  const [todayPlans, setTodayPlans] = useState([]);
  const [goalEdit,   setGoalEdit]   = useState(false);
  const [goalForm,   setGoalForm]   = useState({ targetWinRate: '', targetPnl: '', targetTradeCount: '' });
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    getMonthlyGoal()
      .then(res => {
        setGoal(res.data);
        setGoalForm({
          targetWinRate:    res.data.target_win_rate ?? '',
          targetPnl:        res.data.target_pnl ?? '',
          targetTradeCount: res.data.target_trade_count ?? '',
        });
      })
      .catch(() => {});
    // 오늘 매매 계획 로드
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    getPlans()
      .then(res => {
        const todayList = (res.data || []).filter(p => p.plan_date === dateStr);
        setTodayPlans(todayList);
      })
      .catch(() => {});
  }, []);

  // [용도] 목표 저장 / [호출] 목표 수정 폼 확인 버튼
  const handleGoalSave = async () => {
    setGoalSaving(true);
    try {
      const res = await saveMonthlyGoal({
        targetWinRate:    goalForm.targetWinRate    ? Number(goalForm.targetWinRate)    : null,
        targetPnl:        goalForm.targetPnl        ? Number(goalForm.targetPnl)        : null,
        targetTradeCount: goalForm.targetTradeCount ? Number(goalForm.targetTradeCount) : null,
      });
      setGoal(res.data);
      setGoalEdit(false);
    } catch { /* ignore */ }
    finally { setGoalSaving(false); }
  };

  // [용도] 계획 완료 토글 / [호출] 다음 매매 할 일 카드
  const handleToggleDone = async (planId) => {
    try {
      const res = await togglePlanDone(planId);
      // 대시보드 upcomingPlans 업데이트
      if (data?.upcoming_plans) {
        setData(prev => ({
          ...prev,
          upcoming_plans: prev.upcoming_plans.map(p =>
            p.id === planId ? { ...p, done: res.data.done } : p
          ).filter(p => !p.done)
        }));
      }
      // todayPlans 업데이트
      setTodayPlans(prev => prev.map(p =>
        p.id === planId ? { ...p, done: res.data.done } : p
      ));
    } catch { /* ignore */ }
  };

  const isEmpty = !data || data.overall?.total_positions === 0;

  // 이번 달 vs 지난 달 승률 diff
  const winRateDiff = data
    ? (data.this_month?.total_count > 0 && data.last_month?.total_count > 0)
      ? (data.this_month.win_rate - data.last_month.win_rate).toFixed(1)
      : null
    : null;

  const pnlDiff = data
    ? (data.this_month?.total_count > 0 && data.last_month?.total_count > 0)
      ? Number(data.this_month.total_pnl) - Number(data.last_month.total_pnl)
      : null
    : null;

  // 다음 매매 계획 데이터
  const upcomingPlans = data?.upcoming_plans || [];

  // 계획 vs 실적 비교 데이터
  const planComparisons = data?.plan_comparisons || [];

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="anim-fade-up" style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{todayStr()}</p>
        <h1 className="syne" style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          {loading ? '안녕하세요' : data?.nickname ? `안녕하세요, ${data.nickname}` : '대시보드'}
        </h1>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">불러오는 중...</p>
        </div>
      ) : isEmpty ? (
        /* ── 온보딩 가이드 (데이터 없을 때) ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card anim-fade-up" style={{ padding: '28px 24px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>시작해볼까요?</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
              거래소를 연동하면 포지션 분석, 통계, 인사이트를 한눈에 볼 수 있습니다
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { step: 1, title: '거래소 API Key 등록', desc: 'Upbit · Bybit · Binance 등 API Key를 등록합니다', path: '/exchange-keys', color: '#60a5fa' },
                { step: 2, title: '거래 내역 동기화', desc: '동기화 버튼을 누르거나 5분마다 자동 동기화됩니다', path: '/trades', color: '#a78bfa' },
                { step: 3, title: '포지션 & 통계 확인', desc: '포지션이 자동 계산되고 성과를 분석할 수 있습니다', path: '/positions', color: '#f87171' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: `${s.color}18`, border: `1px solid ${s.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...MONO, fontSize: '13px', fontWeight: 700, color: s.color,
                  }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '3px' }}>{s.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{s.desc}</div>
                    <button onClick={() => navigate(s.path)} style={{
                      padding: '4px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                      border: `1px solid ${s.color}50`, background: `${s.color}10`, color: s.color,
                    }}>바로가기 →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 이번 달 목표 (온보딩에서도 설정 가능) */}
          <GoalCard
            goal={goal}
            goalEdit={goalEdit}
            setGoalEdit={setGoalEdit}
            goalForm={goalForm}
            setGoalForm={setGoalForm}
            goalSaving={goalSaving}
            handleGoalSave={handleGoalSave}
          />

          {/* 퀵 링크 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            {[
              { path: '/plans', label: '매매 계획', icon: '📋', color: '#facc15' },
              { path: '/journal', label: '매매 일기', icon: '📓', color: '#a78bfa' },
              { path: '/news', label: '코인 뉴스', icon: '📰', color: '#34d399' },
              { path: '/holdings', label: '보유 자산', icon: '💰', color: '#60a5fa' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="card" style={{ textAlign: 'center', padding: '16px 12px', cursor: 'pointer', border: `1px solid ${item.color}20` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = item.color + '20'}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── 데이터 있을 때 대시보드 ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 이번 달 성과 카드 */}
          <div className="card anim-fade-up" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
              이번 달 성과
            </div>

            {data.this_month?.total_count > 0 ? (
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* 손익 */}
                <div>
                  <div style={{ fontSize: '30px', fontWeight: 800, ...MONO, color: pnlColor(data.this_month.total_pnl), lineHeight: 1.1 }}>
                    {fmtPnl(data.this_month.total_pnl)}
                  </div>
                  {pnlDiff !== null && (
                    <div style={{ fontSize: '12px', ...MONO, color: pnlColor(pnlDiff), marginTop: '4px' }}>
                      {pnlDiff >= 0 ? '▲' : '▼'} 전달 대비 {fmtPnl(pnlDiff)}
                    </div>
                  )}
                </div>

                {/* 승률 */}
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '3px' }}>승률</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, ...MONO, color: data.this_month.win_rate >= 50 ? '#f87171' : '#60a5fa' }}>
                    {data.this_month.win_rate}%
                  </div>
                  {winRateDiff !== null && (
                    <div style={{ fontSize: '11px', ...MONO, color: Number(winRateDiff) >= 0 ? '#f87171' : '#60a5fa' }}>
                      {Number(winRateDiff) >= 0 ? '▲' : '▼'} {Math.abs(winRateDiff)}%p
                    </div>
                  )}
                </div>

                {/* 거래 수 */}
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '3px' }}>거래</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, ...MONO }}>{data.this_month.total_count}건</div>
                  <div style={{ fontSize: '11px', ...MONO, color: 'var(--text-muted)' }}>
                    {data.this_month.win_count}승 / {data.this_month.total_count - data.this_month.win_count}패
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>이번 달 거래 내역이 없습니다</p>
            )}
          </div>

          {/* ── 다음 매매 할 일 ── */}
          {upcomingPlans.length > 0 && (
            <div className="card anim-fade-up" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📌 다음 매매 할 일
                </div>
                <button onClick={() => navigate('/journal?tab=plans')} style={{
                  fontSize: '11px', color: 'var(--text-muted)', background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: '0',
                }}>전체 보기 →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingPlans.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: p.is_today ? 'rgba(250,204,21,0.06)' : 'var(--bg-secondary)',
                    border: `1px solid ${p.is_today ? 'rgba(250,204,21,0.2)' : 'var(--border)'}`,
                  }}>
                    {/* 날짜 */}
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '36px' }}>
                      <div style={{ ...MONO, fontSize: '13px', fontWeight: 700, color: p.is_today ? '#facc15' : 'var(--text-primary)' }}>
                        {p.is_today ? '오늘' : shortDate(p.plan_date)}
                      </div>
                      {!p.is_today && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dayOfWeek(p.plan_date)}</div>
                      )}
                    </div>
                    {/* 구분선 */}
                    <div style={{ width: '1px', height: '28px', background: 'var(--border)', flexShrink: 0 }} />
                    {/* 방향 뱃지 */}
                    <span style={{
                      flexShrink: 0, fontSize: '10px', padding: '2px 7px',
                      borderRadius: '4px', fontWeight: 600,
                      background: p.direction === 'LONG' ? 'rgba(248,113,113,0.12)' :
                                  p.direction === 'SHORT' ? 'rgba(96,165,250,0.12)' :
                                  'rgba(255,255,255,0.06)',
                      color: p.direction === 'LONG' ? '#f87171' :
                             p.direction === 'SHORT' ? '#60a5fa' : 'var(--text-muted)',
                      border: `1px solid ${p.direction === 'LONG' ? 'rgba(248,113,113,0.25)' :
                                        p.direction === 'SHORT' ? 'rgba(96,165,250,0.25)' : 'var(--border)'}`,
                    }}>
                      {p.direction === 'LONG' ? '▲ LONG' : p.direction === 'SHORT' ? '▼ SHORT' : '미정'}
                    </span>
                    {/* 심볼 */}
                    {p.symbol && (
                      <span style={{ ...MONO, fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flexShrink: 0 }}>
                        {p.symbol}
                      </span>
                    )}
                    {/* 내용 */}
                    <span style={{
                      fontSize: '12px', color: 'var(--text-secondary)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.content}
                    </span>
                    {/* 완료 버튼 */}
                    <button onClick={() => handleToggleDone(p.id)} style={{
                      flexShrink: 0, width: '22px', height: '22px', borderRadius: '6px',
                      border: '1px solid var(--border)', background: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: 'var(--text-muted)', transition: 'all 0.15s',
                    }} title="완료 처리"
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.color = '#4ade80'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >✓</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 계획 vs 실적 비교 ── */}
          {planComparisons.length > 0 && (
            <div className="card anim-fade-up2" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                📊 계획 vs 실적 (최근 7일)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planComparisons.map((c, i) => (
                  <PlanComparisonRow key={i} comparison={c} />
                ))}
              </div>
            </div>
          )}

          {/* 이번 달 목표 카드 */}
          <GoalCard
            goal={goal}
            goalEdit={goalEdit}
            setGoalEdit={setGoalEdit}
            goalForm={goalForm}
            setGoalForm={setGoalForm}
            goalSaving={goalSaving}
            handleGoalSave={handleGoalSave}
          />

          {/* 전체 통계 카드 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="anim-fade-up2">
            {[
              { label: '총 포지션', value: `${data.overall.total_positions}건` },
              { label: '전체 승률', value: `${data.overall.win_rate}%`, color: data.overall.win_rate >= 50 ? '#f87171' : '#60a5fa' },
              { label: '총 손익', value: fmtPnl(data.overall.total_pnl), color: pnlColor(data.overall.total_pnl) },
            ].map(card => (
              <div key={card.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, ...MONO, color: card.color || 'var(--text)' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* 오늘의 매매 계획 (기존 유지) */}
          {todayPlans.length > 0 && (
            <div className="card anim-fade-up2" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  오늘의 매매 계획
                </div>
                <button onClick={() => navigate('/journal?tab=plans')} style={{
                  fontSize: '11px', color: 'var(--text-muted)', background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: '0',
                }}>전체 보기 →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayPlans.filter(p => !p.done).map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  }}>
                    <span style={{
                      flexShrink: 0, fontSize: '10px', padding: '2px 6px',
                      borderRadius: '4px', fontWeight: 600,
                      background: p.direction === 'LONG' ? 'rgba(248,113,113,0.12)' :
                                  p.direction === 'SHORT' ? 'rgba(96,165,250,0.12)' :
                                  'rgba(255,255,255,0.06)',
                      color: p.direction === 'LONG' ? '#f87171' :
                             p.direction === 'SHORT' ? '#60a5fa' : 'var(--text-muted)',
                      border: `1px solid ${p.direction === 'LONG' ? 'rgba(248,113,113,0.25)' :
                                        p.direction === 'SHORT' ? 'rgba(96,165,250,0.25)' : 'var(--border)'}`,
                    }}>
                      {p.direction === 'LONG' ? '▲ LONG' : p.direction === 'SHORT' ? '▼ SHORT' : '미정'}
                    </span>
                    {p.symbol && (
                      <span style={{ ...MONO, fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flexShrink: 0 }}>
                        {p.symbol}
                      </span>
                    )}
                    <span style={{
                      fontSize: '12px', color: 'var(--text-secondary)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 인사이트 */}
          {data.insights?.length > 0 && (
            <div className="anim-fade-up2">
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                인사이트
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.insights.map((ins, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    background: ins.type === 'warning' ? 'rgba(96,165,250,0.06)' : 'rgba(248,113,113,0.06)',
                    border: `1px solid ${ins.type === 'warning' ? 'rgba(96,165,250,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    borderRadius: '10px', padding: '12px 14px',
                  }}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{ins.type === 'warning' ? '⚠️' : '💡'}</span>
                    <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{ins.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 포지션 */}
          {data.recent_positions?.length > 0 && (
            <div className="anim-fade-up3">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  최근 포지션
                </div>
                <button onClick={() => navigate('/positions')} style={{
                  fontSize: '12px', color: 'var(--text-muted)', background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: '0',
                }}>전체 보기 →</button>
              </div>
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {data.recent_positions.map((pos, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px',
                    borderBottom: i < data.recent_positions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', ...MONO }}>{pos.symbol}</span>
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                          background: pos.side === 'LONG' ? '#f8717118' : '#60a5fa18',
                          color: pos.side === 'LONG' ? '#f87171' : '#60a5fa',
                          border: `1px solid ${pos.side === 'LONG' ? '#f8717140' : '#60a5fa40'}`,
                        }}>{pos.side}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pos.exchange}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...MONO, fontWeight: 700, fontSize: '14px', color: pnlColor(pos.pnl) }}>
                        {fmtPnl(pos.pnl)}
                      </div>
                      <div style={{ fontSize: '11px', ...MONO, color: 'var(--text-muted)' }}>{pos.closed_at}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 퀵 링크 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }} className="anim-fade-up3">
            {[
              { path: '/stats',        label: '성과 통계',    icon: '📊', color: '#facc15' },
              { path: '/plans',        label: '매매 계획',    icon: '📋', color: '#a78bfa' },
              { path: '/journal',      label: '매매 일기',    icon: '📓', color: '#f87171' },
              { path: '/trader-type',  label: '나의 유형',    icon: '🎯', color: '#34d399' },
              { path: '/ranking',      label: '랭킹',         icon: '🏆', color: '#fb923c' },
              { path: '/holdings',     label: '보유 자산',    icon: '💰', color: '#60a5fa' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="card" style={{ textAlign: 'center', padding: '14px 8px', cursor: 'pointer', border: `1px solid ${item.color}20`, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = item.color + '20'}
              >
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};

// [컴포넌트] 계획 vs 실적 비교 행 / [호출] DashboardPage
const PlanComparisonRow = ({ comparison }) => {
  const statusConfig = {
    MATCHED:            { label: '일치',     color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)' },
    DIFFERENT_DIRECTION:{ label: '방향 다름', color: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' },
    DIFFERENT_SYMBOL:   { label: '다른 종목', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
    NOT_EXECUTED:       { label: '미실행',   color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)', border: 'var(--border)' },
  };

  const cfg = statusConfig[comparison.status] || statusConfig.NOT_EXECUTED;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '10px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {/* 날짜 */}
      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '36px' }}>
        <div style={{ ...MONO, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {shortDate(comparison.plan_date)}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dayOfWeek(comparison.plan_date)}</div>
      </div>

      {/* 구분선 */}
      <div style={{ width: '1px', height: '28px', background: 'var(--border)', flexShrink: 0 }} />

      {/* 계획 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {comparison.planned_direction && (
          <span style={{
            fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
            background: comparison.planned_direction === 'LONG' ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.12)',
            color: comparison.planned_direction === 'LONG' ? '#f87171' : '#60a5fa',
          }}>
            {comparison.planned_direction === 'LONG' ? '▲' : '▼'}
          </span>
        )}
        <span style={{ ...MONO, fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
          {comparison.planned_symbol || '—'}
        </span>
      </div>

      {/* 화살표 */}
      <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>→</span>

      {/* 실적 */}
      {comparison.status === 'NOT_EXECUTED' ? (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>거래 없음</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {comparison.actual_side && (
            <span style={{
              fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
              background: comparison.actual_side === 'LONG' ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.12)',
              color: comparison.actual_side === 'LONG' ? '#f87171' : '#60a5fa',
            }}>
              {comparison.actual_side === 'LONG' ? '▲' : '▼'}
            </span>
          )}
          <span style={{ ...MONO, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {comparison.actual_symbol}
          </span>
          {comparison.actual_pnl && (
            <span style={{ ...MONO, fontSize: '11px', color: pnlColor(comparison.actual_pnl), fontWeight: 600 }}>
              {fmtPnl(comparison.actual_pnl)}
            </span>
          )}
        </div>
      )}

      {/* 상태 뱃지 */}
      <span style={{
        flexShrink: 0, marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
        padding: '2px 8px', borderRadius: '4px',
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      }}>
        {cfg.label}
      </span>
    </div>
  );
};

// [컴포넌트] 목표 달성 프로그레스 바 (잔여량 포함) / [호출] GoalCard
const GoalProgress = ({ label, current, target, unit, color, isLast }) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done = current >= target;
  const remaining = Math.max(target - current, 0);
  const fmt = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <div style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, ...MONO, color: done ? '#f87171' : 'var(--text-primary)' }}>
            {fmt(current)}{unit}
          </span>
          <span style={{ fontSize: '12px', ...MONO, color: 'var(--text-muted)' }}> / {fmt(target)}{unit}</span>
        </div>
      </div>
      <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-secondary)', overflow: 'hidden', marginBottom: '5px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: done ? '#f87171' : color,
          borderRadius: '99px', transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ fontSize: '11px', ...MONO, color: done ? '#f87171' : 'var(--text-muted)', textAlign: 'right' }}>
        {done ? '✓ 달성 완료' : `앞으로 ${fmt(remaining)}${unit} 남음`}
      </div>
    </div>
  );
};

// [컴포넌트] 이번 달 목표 카드 / [호출] DashboardPage
const GoalCard = ({ goal, goalEdit, setGoalEdit, goalForm, setGoalForm, goalSaving, handleGoalSave }) => {
  const hasGoal = goal && (goal.target_win_rate != null || goal.target_pnl != null || goal.target_trade_count != null);

  return (
    <div className="card anim-fade-up2" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasGoal && !goalEdit ? '4px' : '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          이번 달 목표
        </div>
        <button
          onClick={() => setGoalEdit(v => !v)}
          style={{
            fontSize: '12px', color: goalEdit ? 'var(--text-muted)' : 'var(--accent)',
            background: 'transparent', border: `1px solid ${goalEdit ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
          }}
        >
          {goalEdit ? '취소' : hasGoal ? '수정' : '+ 목표 추가'}
        </button>
      </div>

      {goalEdit ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { key: 'targetWinRate',    label: '목표 승률 (%)',    placeholder: '예: 60' },
            { key: 'targetPnl',        label: '목표 수익 (USDT)', placeholder: '예: 500' },
            { key: 'targetTradeCount', label: '목표 거래 횟수',    placeholder: '예: 20' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>{f.label}</label>
              <input
                type="number" value={goalForm[f.key]} placeholder={f.placeholder}
                onChange={e => setGoalForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', ...MONO }}
              />
            </div>
          ))}
          <button onClick={handleGoalSave} disabled={goalSaving} style={{
            padding: '8px', borderRadius: '8px', background: 'var(--accent)',
            color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '4px',
          }}>{goalSaving ? '저장 중...' : '저장'}</button>
        </div>
      ) : hasGoal ? (
        <div style={{ marginTop: '4px' }}>
          {(() => {
            const items = [
              goal.target_win_rate != null && { label: '승률', current: goal.current_win_rate, target: Number(goal.target_win_rate), unit: '%', color: '#f87171' },
              goal.target_trade_count != null && { label: '거래 횟수', current: goal.current_trade_count, target: goal.target_trade_count, unit: '건', color: '#a78bfa' },
              goal.target_pnl != null && { label: '수익', current: parseFloat(goal.current_pnl), target: Number(goal.target_pnl), unit: ' USDT', color: '#60a5fa' },
            ].filter(Boolean);
            return items.map((item, i) => (
              <GoalProgress key={item.label} {...item} isLast={i === items.length - 1} />
            ));
          })()}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '6px 0' }}>
          이번 달 목표를 설정하면 달성 현황을 한눈에 볼 수 있어요.
        </p>
      )}
    </div>
  );
};

export default DashboardPage;
