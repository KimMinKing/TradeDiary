// [파일 용도] 대시보드 페이지 - 핵심 지표 요약 + 최근 포지션 + 인사이트

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getMonthlyGoal, saveMonthlyGoal } from '../api/exchangeApi';

// [용도] 손익 색상 / [호출] 렌더
const pnlColor = (val) => Number(val) >= 0 ? '#f87171' : '#60a5fa';

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

// [컴포넌트] 대시보드 메인 화면 / [호출] App.jsx 라우터
const DashboardPage = () => {
  const navigate = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [goal,       setGoal]       = useState(null);
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
                    fontSize: '13px', fontWeight: 700, color: s.color,
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
                  <div style={{ fontSize: '30px', fontWeight: 800, fontFamily: 'monospace', color: pnlColor(data.this_month.total_pnl), lineHeight: 1.1 }}>
                    {fmtPnl(data.this_month.total_pnl)}
                  </div>
                  {pnlDiff !== null && (
                    <div style={{ fontSize: '12px', color: pnlColor(pnlDiff), marginTop: '4px' }}>
                      {pnlDiff >= 0 ? '▲' : '▼'} 전달 대비 {fmtPnl(pnlDiff)}
                    </div>
                  )}
                </div>

                {/* 승률 */}
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '3px' }}>승률</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: data.this_month.win_rate >= 50 ? '#f87171' : '#60a5fa' }}>
                    {data.this_month.win_rate}%
                  </div>
                  {winRateDiff !== null && (
                    <div style={{ fontSize: '11px', color: Number(winRateDiff) >= 0 ? '#f87171' : '#60a5fa' }}>
                      {Number(winRateDiff) >= 0 ? '▲' : '▼'} {Math.abs(winRateDiff)}%p
                    </div>
                  )}
                </div>

                {/* 거래 수 */}
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '3px' }}>거래</div>
                  <div style={{ fontSize: '22px', fontWeight: 700 }}>{data.this_month.total_count}건</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {data.this_month.win_count}승 / {data.this_month.total_count - data.this_month.win_count}패
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>이번 달 거래 내역이 없습니다</p>
            )}
          </div>

          {/* 이번 달 목표 카드 */}
          {goal && (
            <div className="card anim-fade-up2" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  이번 달 목표
                </div>
                <button onClick={() => setGoalEdit(v => !v)} style={{
                  fontSize: '12px', color: 'var(--text-muted)', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                }}>
                  {goalEdit ? '취소' : '수정'}
                </button>
              </div>

              {goalEdit ? (
                /* 목표 편집 폼 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'targetWinRate', label: '목표 승률 (%)', placeholder: '예: 60' },
                    { key: 'targetPnl', label: '목표 수익 (USDT)', placeholder: '예: 500' },
                    { key: 'targetTradeCount', label: '목표 거래 횟수', placeholder: '예: 20' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>{f.label}</label>
                      <input
                        type="number" value={goalForm[f.key]}
                        placeholder={f.placeholder}
                        onChange={e => setGoalForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                      />
                    </div>
                  ))}
                  <button onClick={handleGoalSave} disabled={goalSaving} style={{
                    padding: '8px', borderRadius: '8px', background: 'var(--accent)',
                    color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '4px',
                  }}>{goalSaving ? '저장 중...' : '저장'}</button>
                </div>
              ) : (goal.target_win_rate || goal.target_pnl || goal.target_trade_count) ? (
                /* 목표 진행 현황 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {goal.target_win_rate && (
                    <GoalProgress
                      label="승률"
                      current={goal.current_win_rate}
                      target={Number(goal.target_win_rate)}
                      unit="%"
                      color="#f87171"
                    />
                  )}
                  {goal.target_trade_count && (
                    <GoalProgress
                      label="거래 횟수"
                      current={goal.current_trade_count}
                      target={goal.target_trade_count}
                      unit="건"
                      color="#a78bfa"
                    />
                  )}
                  {goal.target_pnl && (
                    <GoalProgress
                      label="수익"
                      current={parseFloat(goal.current_pnl)}
                      target={Number(goal.target_pnl)}
                      unit=" USDT"
                      color="#60a5fa"
                    />
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                  이번 달 목표를 설정해보세요 →{' '}
                  <button onClick={() => setGoalEdit(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>목표 추가</button>
                </p>
              )}
            </div>
          )}

          {/* 전체 통계 카드 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="anim-fade-up2">
            {[
              { label: '총 포지션', value: `${data.overall.total_positions}건` },
              { label: '전체 승률', value: `${data.overall.win_rate}%`, color: data.overall.win_rate >= 50 ? '#f87171' : '#60a5fa' },
              { label: '총 손익', value: fmtPnl(data.overall.total_pnl), color: pnlColor(data.overall.total_pnl) },
            ].map(card => (
              <div key={card.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: card.color || 'var(--text)' }}>{card.value}</div>
              </div>
            ))}
          </div>

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
                        <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>{pos.symbol}</span>
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
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: pnlColor(pos.pnl) }}>
                        {fmtPnl(pos.pnl)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pos.closed_at}</div>
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

// [컴포넌트] 목표 달성 프로그레스 바 / [호출] DashboardPage
const GoalProgress = ({ label, current, target, unit, color }) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done = current >= target;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: done ? '#f87171' : 'var(--text-primary)' }}>
          {current.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}
          {' / '}
          {target.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}
          {done && ' ✓'}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: done ? '#f87171' : color,
          borderRadius: '99px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
};

export default DashboardPage;
