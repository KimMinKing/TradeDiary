import { useEffect, useState } from 'react';
import { getTraderType, getTraderTypeAdvice, refreshTraderTypeAdvice } from '../api/exchangeApi';
import { useNavigate } from 'react-router-dom';

const TYPES = {
  FOCUSED: ['Focused Trader', 'FC', 'Trades two or fewer symbols', 'Deep familiarity with a small set of markets.', 'Concentration can amplify symbol-specific risk.'],
  DIVERSIFIED: ['Diversified Trader', 'DV', 'Trades ten or more symbols', 'Finds opportunities across multiple markets.', 'Broad coverage can reduce depth of analysis.'],
  SCALPER: ['Scalper', 'SC', 'Average hold under two hours', 'Fast execution and short exposure windows.', 'Fees and overtrading require close control.'],
  DAY_TRADER: ['Day Trader', 'DT', 'Average hold from 2 to 24 hours', 'Closes risk within the trading day.', 'Requires sustained attention during sessions.'],
  SWING_TRADER: ['Swing Trader', 'SW', 'Average hold from 1 to 14 days', 'Captures medium-term price movement.', 'Positions remain exposed to overnight events.'],
  POSITION_TRADER: ['Position Trader', 'PT', 'Average hold over 14 days', 'Targets long-duration market trends.', 'Capital stays committed through larger swings.'],
};

const TraderTypePage = ({ embedded = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState(null);
  const [guide, setGuide] = useState(false);
  const navigate = useNavigate();
  const loadAdvice = refresh => (refresh ? refreshTraderTypeAdvice() : getTraderTypeAdvice()).then(response => setAdvice(response.data)).catch(() => setAdvice(null));

  useEffect(() => { getTraderType().then(response => setData(response.data)).catch(() => setData(null)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (data?.type_code && data.type_code !== 'UNKNOWN') loadAdvice(false); }, [data]);
  if (loading) return <div className={embedded ? '' : 'page'} style={{ padding: 40, color: 'var(--text-muted)' }}>Analyzing current performance...</div>;

  const unknown = !data || data.type_code === 'UNKNOWN';
  const type = TYPES[data?.type_code];
  return <section className={embedded ? 'trader-profile-module' : 'page trader-profile-module'}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><span style={eyebrow}>BEHAVIOR PROFILE</span><h2 style={{ margin: '5px 0 0', fontSize: 22 }}>Trader profile</h2></div><button style={outlineButton} onClick={() => setGuide(value => !value)}>{guide ? 'Close guide' : 'Explore profiles'}</button></header>
    {unknown ? <div className="card" style={{ padding: 30 }}><b>No trader profile yet</b><p style={muted}>A profile is calculated only from your current performance data. Complete at least five closed positions to unlock it. Any older cached profile has been removed.</p><div style={{ marginTop: 16, height: 5, background: '#e7edf3' }}><div style={{ width: `${Math.min((data?.stats?.total_positions ?? 0) / 5 * 100, 100)}%`, height: '100%', background: '#3474b7' }} /></div><small style={muted}>{data?.stats?.total_positions ?? 0} / 5 closed positions</small><div style={{display:'flex',gap:7,marginTop:18}}><button style={outlineButton} onClick={()=>navigate('/settings?tab=connections')}>Connect exchange</button><button style={outlineButton} onClick={()=>navigate('/positions?tab=trades')}>Sync executions</button></div></div> : <>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 18, padding: 24 }}><div style={typeBadge}>{type?.[1]}</div><div><h3 style={{ margin: 0 }}>{type?.[0]}</h3><p style={muted}>{type?.[2]}</p><div style={{ display: 'flex', gap: 24, marginTop: 15 }}><Metric label="Positions" value={data.stats?.total_positions} /><Metric label="Win rate" value={`${data.stats?.win_rate ?? 0}%`} /><Metric label="Avg. hold" value={`${data.stats?.avg_hold_hours ?? 0}h`} /><Metric label="Symbols" value={data.stats?.unique_symbols} /></div></div></div>
      <div className="card" style={{ marginTop: 12, padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b>AI coaching</b><button style={outlineButton} onClick={() => loadAdvice(true)}>Refresh</button></div><p style={{ ...muted, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{advice?.advice || advice?.advice_text || 'Coaching will appear when the analysis service is available.'}</p></div>
    </>}
    {guide && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10, marginTop: 16 }}>{Object.entries(TYPES).map(([code, item]) => <div className="card" key={code} style={{ padding: 17 }}><span style={eyebrow}>{item[1]} · {item[2]}</span><h3 style={{ margin: '7px 0' }}>{item[0]}</h3><p style={muted}><b>Strength:</b> {item[3]}</p><p style={muted}><b>Watch:</b> {item[4]}</p></div>)}</div>}
  </section>;
};

const Metric = ({ label, value }) => <span><small style={{ display: 'block', color: '#8392a2', fontSize: 9, textTransform: 'uppercase' }}>{label}</small><b style={{ fontSize: 14 }}>{value ?? 0}</b></span>;
const eyebrow = { color: '#59789a', fontSize: 9, fontWeight: 800, letterSpacing: '.15em' };
const muted = { color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55 };
const outlineButton = { padding: '7px 11px', border: '1px solid #cbd7e3', color: '#3c638c', background: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' };
const typeBadge = { display: 'grid', placeItems: 'center', width: 62, height: 62, color: '#fff', background: '#244e7a', fontWeight: 900, letterSpacing: '.08em' };

export default TraderTypePage;
