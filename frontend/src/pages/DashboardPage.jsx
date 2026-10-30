import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteMonthlyGoal, getDashboard, getMonthlyGoal, getMyExchangeKeys, saveMonthlyGoal } from '../api/exchangeApi';
import { useLocale } from '../i18n/localeContext';

const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const pnlColor = value => Number(value) >= 0 ? '#d44b5c' : '#3477bd';
const fmtPnl = value => {
  const number = Number(value);
  if (Number.isNaN(number)) return '—';
  const amount = Math.abs(number).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${number >= 0 ? '+' : '-'}${amount}`;
};
const today = locale => new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

const DashboardPage = () => {
  const navigate = useNavigate();
  const { locale, language } = useLocale();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [goalEdit, setGoalEdit] = useState(false);
  const [goalForm, setGoalForm] = useState({ targetWinRate: '', targetPnl: '', targetTradeCount: '' });
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalDeleting, setGoalDeleting] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    getDashboard().then(response => setData(response.data)).catch(() => {}).finally(() => setLoading(false));
    getMonthlyGoal().then(response => {
      setGoal(response.data);
      setGoalForm({ targetWinRate: response.data.target_win_rate ?? '', targetPnl: response.data.target_pnl ?? '', targetTradeCount: response.data.target_trade_count ?? '' });
    }).catch(() => {});
    getMyExchangeKeys().then(response => setHasKeys((response.data?.length ?? 0) > 0)).catch(() => {});
  }, []);

  const saveGoal = async () => {
    setGoalSaving(true);
    try {
      const response = await saveMonthlyGoal({
        target_win_rate: goalForm.targetWinRate ? Number(goalForm.targetWinRate) : null,
        target_pnl: goalForm.targetPnl ? Number(goalForm.targetPnl) : null,
        target_trade_count: goalForm.targetTradeCount ? Number(goalForm.targetTradeCount) : null,
      });
      setGoal(response.data); setGoalEdit(false);
    } finally { setGoalSaving(false); }
  };
  const removeGoal = async () => {
    if (!window.confirm('Delete this month’s goal?')) return;
    setGoalDeleting(true);
    try {
      const response = await deleteMonthlyGoal();
      setGoal(response.data); setGoalForm({ targetWinRate: '', targetPnl: '', targetTradeCount: '' }); setGoalEdit(false);
    } finally { setGoalDeleting(false); }
  };

  const empty = !data || (data.overall?.total_positions === 0 && !hasKeys);
  return <div className="page">
    <header className="anim-fade-up" style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>{today(locale)}</p>
      <h1 className="syne" style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.04em' }}>
        {loading ? (language === 'ko' ? '다시 오신 것을 환영합니다' : 'Welcome back') : data?.nickname ? (language === 'ko' ? `${data.nickname}님, 반갑습니다` : `Welcome back, ${data.nickname}`) : (language === 'ko' ? '트레이딩 개요' : 'Trading overview')}
      </h1>
    </header>

    {loading ? <div className="empty-state"><p className="empty-state-title">Loading your workspace...</p></div> :
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {empty && <Onboarding navigate={navigate} />}
        <GoalCard goal={goal} editing={goalEdit} setEditing={setGoalEdit} form={goalForm} setForm={setGoalForm}
          saving={goalSaving} deleting={goalDeleting} onSave={saveGoal} onDelete={removeGoal} />
        {!empty && <>
          <div className="anim-fade-up2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Positions this month', value: data.this_month?.total_count ?? 0 },
              { label: 'Monthly win rate', value: `${data.this_month?.win_rate ?? 0}%`, color: pnlColor((data.this_month?.win_rate ?? 0) - 50) },
              { label: 'Monthly PnL', value: fmtPnl(data.this_month?.total_pnl ?? 0), color: pnlColor(data.this_month?.total_pnl ?? 0) },
            ].map(card => <div className="card" key={card.label} style={{ padding: 17, textAlign: 'center' }}><div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{card.label}</div><div style={{ ...MONO, color: card.color || 'var(--text-primary)', fontSize: 19, fontWeight: 700 }}>{card.value}</div></div>)}
          </div>
          {data.insights?.length > 0 && <section><SectionLabel>Insights</SectionLabel>{data.insights.map((item, index) => <div key={index} className="card" style={{ marginBottom: 7, padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item.message}</div>)}</section>}
          {data.recent_positions?.length > 0 && <section><div style={{ display: 'flex', justifyContent: 'space-between' }}><SectionLabel>Recent positions</SectionLabel><button onClick={() => navigate('/positions')} style={linkStyle}>View all →</button></div><div className="card" style={{ padding: 0, overflow: 'hidden' }}>{data.recent_positions.map((position, index) => <div key={`${position.symbol}-${index}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: index < data.recent_positions.length - 1 ? '1px solid var(--border)' : 0 }}><div style={{ flex: 1 }}><b style={MONO}>{position.symbol}</b><span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 10 }}>{position.side} · {position.exchange}</span></div><div style={{ ...MONO, color: pnlColor(position.pnl), fontWeight: 700 }}>{fmtPnl(position.pnl)}</div></div>)}</div></section>}
        </>}
        <QuickLinks navigate={navigate} empty={empty} />
      </div>}
  </div>;
};

const SectionLabel = ({ children }) => <div style={{ marginBottom: 10, color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{children}</div>;
const linkStyle = { padding: 0, border: 0, color: '#376caa', background: 'transparent', fontSize: 11, cursor: 'pointer' };

const Onboarding = ({ navigate }) => <section className="card anim-fade-up" style={{ padding: '25px 22px' }}>
  <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>Set up your trading workspace</h2><p style={{ margin: '0 0 22px', color: 'var(--text-secondary)', fontSize: 12 }}>Connect an exchange to unlock position tracking, performance analytics and trading insights.</p>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>{[
    ['01', 'Connect exchange', 'Add a read-only API key for Upbit, Bybit, Binance and more.', '/exchange-keys'],
    ['02', 'Sync history', 'Import trades now and keep them synchronized automatically.', '/sync'],
    ['03', 'Review performance', 'Explore calculated positions, analytics and behavior.', '/positions'],
  ].map(item => <button key={item[0]} onClick={() => navigate(item[3])} style={{ padding: 16, border: '1px solid #d9e2eb', color: 'inherit', background: '#f8fafc', textAlign: 'left', cursor: 'pointer' }}><span style={{ color: '#3972b1', fontSize: 10, fontWeight: 800 }}>{item[0]}</span><b style={{ display: 'block', margin: '7px 0 4px', fontSize: 13 }}>{item[1]}</b><small style={{ color: '#748599', lineHeight: 1.5 }}>{item[2]}</small></button>)}</div>
</section>;

const QuickLinks = ({ navigate, empty }) => <section><SectionLabel>Quick access</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9 }}>{(empty ? [
  ['/journal', 'Trading journal'], ['/community', 'Community'], ['/ranking', 'Ranking'], ['/stats', 'Analytics'], ['/positions', 'Portfolio'],
] : [['/stats', 'Analytics'], ['/journal?tab=plans', 'Trade plans'], ['/journal', 'Trading journal'], ['/community', 'Community'], ['/ranking', 'Ranking'], ['/positions?tab=holdings', 'Holdings']]).map(([path, label]) => <button key={path} className="card" onClick={() => navigate(path)} style={{ padding: '14px 12px', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>{label}<span style={{ float: 'right' }}>→</span></button>)}</div></section>;

const GoalProgress = ({ label, current = 0, target, unit, last }) => {
  const percent = target > 0 ? Math.min(Number(current) / target * 100, 100) : 0;
  const done = Number(current) >= target;
  const format = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
  return <div style={{ padding: '11px 0', borderBottom: last ? 0 : '1px solid var(--border)' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12 }}><span style={{ color: 'var(--text-secondary)' }}>{label}</span><span style={MONO}><b>{format(current)}{unit}</b> <span style={{ color: 'var(--text-muted)' }}>/ {format(target)}{unit}</span></span></div><div style={{ height: 5, background: '#e8edf3' }}><div style={{ width: `${percent}%`, height: '100%', background: done ? '#278266' : '#3474b7' }} /></div><div style={{ marginTop: 5, color: done ? '#278266' : 'var(--text-muted)', fontSize: 10, textAlign: 'right' }}>{done ? 'Goal complete' : `${format(Math.max(target - Number(current), 0))}${unit} remaining`}</div></div>;
};

const GoalCard = ({ goal, editing, setEditing, form, setForm, saving, deleting, onSave, onDelete }) => {
  const hasGoal = goal && (goal.target_win_rate != null || goal.target_pnl != null || goal.target_trade_count != null);
  const fields = [['targetWinRate', 'Target win rate (%)', '60'], ['targetPnl', 'Target profit (USDT)', '500'], ['targetTradeCount', 'Target trade count', '20']];
  const progress = hasGoal ? [
    goal.target_win_rate != null && ['Win rate', goal.current_win_rate, Number(goal.target_win_rate), '%'],
    goal.target_trade_count != null && ['Trade count', goal.current_trade_count, Number(goal.target_trade_count), ''],
    goal.target_pnl != null && ['Profit', Number(goal.current_pnl), Number(goal.target_pnl), ' USDT'],
  ].filter(Boolean) : [];
  return <section className="card anim-fade-up2" style={{ padding: '18px 20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasGoal && !editing ? 3 : 14 }}><SectionLabel>Monthly goal</SectionLabel><div style={{ display: 'flex', gap: 7 }}>{hasGoal && !editing && <button onClick={onDelete} disabled={deleting} style={{ ...linkStyle, color: '#ad3f4b' }}>{deleting ? 'Deleting...' : 'Delete'}</button>}<button onClick={() => setEditing(value => !value)} style={{ padding: '6px 10px', border: '1px solid #bed0e3', color: '#2d639f', background: '#f5f8fb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{editing ? 'Cancel' : hasGoal ? 'Edit goal' : '+ Add goal'}</button></div></div>
    {editing ? <div>{fields.map(([key, label, placeholder]) => <label key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 10, marginBottom: 9, color: 'var(--text-secondary)', fontSize: 11 }}>{label}<input type="number" value={form[key]} placeholder={placeholder} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} style={{ padding: 8, border: '1px solid #ccd7e3', color: 'var(--text-primary)', background: '#fff', ...MONO }} /></label>)}<button onClick={onSave} disabled={saving} style={{ width: '100%', marginTop: 4, padding: 9, border: 0, color: '#fff', background: '#225f9f', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save goal'}</button></div> : hasGoal ? <div>{progress.map((item, index) => <GoalProgress key={item[0]} label={item[0]} current={item[1]} target={item[2]} unit={item[3]} last={index === progress.length - 1} />)}</div> : <p style={{ margin: 0, padding: '4px 0', color: 'var(--text-muted)', fontSize: 12 }}>Set a monthly goal to track your progress at a glance.</p>}
  </section>;
};

export default DashboardPage;
