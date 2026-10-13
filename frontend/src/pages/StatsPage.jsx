// [파일 용도] Performance statistics 페이지 (핵심 지표 + 월별 PnL + Symbol별 + 롱/숏 비교)

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area, Line,
} from 'recharts';
import { getStats } from '../api/exchangeApi';
import TraderTypePage from './TraderTypePage';
import ChartState from '../components/ChartState';

// ── 통화 Settings ────────────────────────────────────────────────────
const CURRENCY = {
  ALL:   { symbol: '',   suffix: ' KRW', locale: 'ko-KR', mixed: false },
  UPBIT: { symbol: '₩',  suffix: ' KRW', locale: 'ko-KR', mixed: false },
  BYBIT: { symbol: '',   suffix: ' KRW', locale: 'ko-KR', mixed: false },
  BITGET: { symbol: '',  suffix: ' KRW', locale: 'ko-KR', mixed: false },
  OKX: { symbol: '',     suffix: ' KRW', locale: 'ko-KR', mixed: false },
  BINANCE: { symbol: '', suffix: ' KRW', locale: 'ko-KR', mixed: false },
  BINGX: { symbol: '',   suffix: ' KRW', locale: 'ko-KR', mixed: false },
};

// ── 포맷 헬퍼 ────────────────────────────────────────────────────
const fmt = (val, curr) => {
  const n = Number(val);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n).toLocaleString(curr.locale, { maximumFractionDigits: 2 });
  return curr.symbol
    ? (n < 0 ? `-${curr.symbol}${Math.abs(n).toLocaleString(curr.locale, { maximumFractionDigits: 2 })}` : `${curr.symbol}${abs}`)
    : `${n >= 0 ? '+' : ''}${n.toLocaleString(curr.locale, { maximumFractionDigits: 2 })}`;
};

const fmtSigned = (val, curr) => fmt(val, curr);

const pnlColor = (val) =>
  Number(val) >= 0 ? '#f87171' : '#60a5fa';

const rrDisplay = (ratio) => {
  if (!ratio || ratio === 0) return '—';
  if (ratio > 99) return '99+';
  return `1 : ${ratio}`;
};

// ── Cumulative profit 곡선 차트 ───────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: '1', label: '1D' },
  { key: '7', label: '7D' },
  { key: '30', label: '30D' },
  { key: 'all', label: 'All' },
];

// [용도] 두 날짜 사이 모든 날짜(YYYY-MM-DD) 배열 생성 / [호출] CumulativePnlChart
const fillDateRange = (startStr, endStr) => {
  const result = [];
  const cur = new Date(startStr);
  const end = new Date(endStr);
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
};

const CumulativePnlChart = ({ dailyPnl, curr, exchange, compact = false }) => {
  const capitalKey = `initCapital_${exchange}`;
  const [period,      setPeriod]      = useState('30');
  const [viewMode,    setViewMode]    = useState('pnl'); // 'pnl' | 'asset' | 'rate'
  const [initCapital, setInitCapital] = useState(() => Number(localStorage.getItem(capitalKey) || 0));
  const [capitalInput, setCapitalInput] = useState(() => localStorage.getItem(capitalKey) || '');
  const [editingCapital, setEditingCapital] = useState(false);

  const saveCapital = () => {
    const val = Number(capitalInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setInitCapital(val);
      localStorage.setItem(capitalKey, val);
    }
    setEditingCapital(false);
  };

  // [용도] 기간 필터 + 빈 날짜 채우기 + 누적 PnL 계산 / [호출] 렌더
  const chartData = (() => {
    const pnlMap = {};
    dailyPnl.forEach(d => { pnlMap[d.date] = Number(d.pnl); });
    const allDates = Object.keys(pnlMap).sort();
    if (allDates.length === 0) return [];

    let startDate = allDates[0];
    if (period !== 'all') {
      const days = Number(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days - 1));
      startDate = cutoff.toISOString().slice(0, 10);
    }
    const today = new Date().toISOString().slice(0, 10);
    const dates = fillDateRange(startDate, today);

    // 선택 기간 시작 시점의 All 누적 PnL (Assets 기준점으로만 사용)
    const cumBeforeStart = allDates
      .filter(d => d < startDate)
      .reduce((acc, d) => acc + (pnlMap[d] ?? 0), 0);

    // 기간 내 누적 (항상 0부터 시작)
    const points = dates.reduce((result, date) => {
      const pnl = pnlMap[date] ?? 0;
      const previous = result.at(-1)?.cumPnl ?? 0;
      const cumInPeriod = Math.round((previous + pnl) * 100) / 100;

      // Assets = Starting capital + All기간 누적PnL (기간 필터와 무관하게 실제 Assets)
      const totalCum = Math.round((cumBeforeStart + cumInPeriod) * 100) / 100;
      const asset    = Math.round((initCapital + totalCum) * 100) / 100;

      // Return = 기간 내 누적PnL / Starting capital * 100 (League of Traders 방식)
      const rate = initCapital > 0
        ? Math.round((cumInPeriod / initCapital) * 10000) / 100
        : null;

      result.push({ date, label: date.slice(5), cumPnl: cumInPeriod, asset, rate, hasTrade: Object.hasOwn(pnlMap, date) });
      return result;
    }, []);
    if (points.length === 1 && points[0].hasTrade) {
      return [
        { ...points[0], label: 'Open', cumPnl: 0, asset: initCapital + cumBeforeStart, rate: initCapital > 0 ? 0 : null, hasTrade: false },
        { ...points[0], label: 'Close' },
      ];
    }
    return points;
  })();

  const last = chartData.at(-1);
  const tradeDaysInPeriod = chartData.filter(point => point.hasTrade).length;
  const lastTradeDate = [...dailyPnl].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const needCapital = (viewMode === 'asset' || viewMode === 'rate') && initCapital === 0;

  const finalPnl   = last?.cumPnl  ?? 0;
  const finalAsset = last?.asset   ?? initCapital;
  const finalRate  = last?.rate    ?? null;

  const displayVal = viewMode === 'pnl' ? finalPnl : viewMode === 'asset' ? finalAsset : finalRate;
  const isPositive  = (displayVal ?? 0) >= 0;
  const lineColor   = viewMode === 'asset'
    ? (finalPnl >= 0 ? '#f87171' : '#60a5fa')
    : (isPositive ? '#f87171' : '#60a5fa');
  const gradId  = 'cumGrad';
  const dataKey = viewMode === 'pnl' ? 'cumPnl' : viewMode === 'asset' ? 'asset' : 'rate';

  if (chartData.length === 0) return <ChartState title="No performance data yet" description="Sync closed positions to build your performance chart." height={compact ? 156 : 200} />;

  const fmtVal = (v) => {
    if (v === null) return '—';
    if (viewMode === 'rate') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const prefix = viewMode === 'pnl' ? (v >= 0 ? '+' : '') : '';
    const abs = Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const sign = v < 0 ? '-' : prefix;
    const suffix = curr.suffix ? ' ' + curr.suffix.trim() : '';
    return `${sign}${abs}${suffix}`;
  };

  return (
    <div className={`stats-chart-card${compact ? ' stats-chart-card-compact' : ''}`}>
      {/* 상단 컨트롤 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: compact ? '8px' : '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIOD_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setPeriod(opt.key)} style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
            border: period === opt.key ? `1px solid ${lineColor}80` : '1px solid rgba(255,255,255,0.1)',
            background: period === opt.key ? `${lineColor}15` : 'transparent',
            color: period === opt.key ? lineColor : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{opt.label}</button>
        ))}

        {/* 뷰 모드 토글 */}
        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginLeft: '2px' }}>
          {[{ k: 'pnl', l: 'Profit' }, { k: 'asset', l: 'Assets' }, { k: 'rate', l: 'Return' }].map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)} style={{
              padding: '3px 10px', fontSize: '12px', border: 'none',
              background: viewMode === v.k ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: viewMode === v.k ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}>{v.l}</button>
          ))}
        </div>

        {/* 우상단 최종 수치 */}
        <span className="mono" style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 700, color: needCapital ? 'var(--text-muted)' : lineColor }}>
          {needCapital ? 'Starting capital 필요' : fmtVal(displayVal)}
        </span>
      </div>

      {/* Starting capital Settings 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: compact ? '10px' : '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Starting capital</span>
        {editingCapital ? (
          <>
            <input
              autoFocus
              className="input"
              style={{ width: '140px', padding: '3px 8px', fontSize: '12px', height: 'auto' }}
              value={capitalInput}
              onChange={e => setCapitalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCapital(); if (e.key === 'Escape') setEditingCapital(false); }}
              placeholder={`예: 10000 (${curr.suffix?.trim() || 'USDT'})`}
            />
            <button className="btn btn-primary btn-xs" onClick={saveCapital}>Save</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setEditingCapital(false)}>Cancel</button>
          </>
        ) : (
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => { setCapitalInput(initCapital > 0 ? String(initCapital) : ''); setEditingCapital(true); }}
            style={{ fontSize: '12px' }}
          >
            {initCapital > 0
              ? `${initCapital.toLocaleString()} ${curr.suffix?.trim() || ''} ✎`
              : '+ Settings'}
          </button>
        )}
        {(viewMode === 'asset' || viewMode === 'rate') && initCapital === 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Assets·Return 표시를 위해 Starting capital을 입력하세요
          </span>
        )}
      </div>

      {tradeDaysInPeriod === 0 ? (
        <ChartState title="No trading activity in this period" description={lastTradeDate ? `Last activity was ${lastTradeDate}. Try a wider range.` : 'Sync closed positions to build this chart.'} actionLabel={period !== 'all' ? 'View all history' : undefined} onAction={() => setPeriod('all')} height={compact ? 156 : 200} />
      ) : needCapital ? (
        <div style={{ height: compact ? 156 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Starting capital을 Settings하면 {viewMode === 'asset' ? 'Assets' : 'Return'} 차트가 표시됩니다</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={compact ? 156 : 200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.22} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <ReferenceLine y={viewMode === 'pnl' ? 0 : viewMode === 'rate' ? 0 : initCapital}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              tickFormatter={v => {
                if (viewMode === 'rate') return `${v}%`;
                if (Math.abs(v) >= 1000000) return `${(v/1000000).toFixed(1)}M`;
                if (Math.abs(v) >= 1000)    return `${(v/1000).toFixed(0)}K`;
                return v;
              }}
              width={54}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="chart-tooltip">
                    <div className="chart-tooltip-month">{d.date}</div>
                    <div style={{ color: lineColor, fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
                      {fmtVal(viewMode === 'pnl' ? d.cumPnl : viewMode === 'asset' ? d.asset : d.rate)}
                    </div>
                    {viewMode === 'asset' && (
                      <div style={{ fontSize: '11px', color: pnlColor(d.cumPnl), fontFamily: 'monospace', marginTop: 2 }}>
                        PnL {d.cumPnl >= 0 ? '+' : ''}{d.cumPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    )}
                    {!d.hasTrade && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>Trade 없음</div>}
                  </div>
                );
              }}
              cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: 'var(--bg)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ── 공통 PnL 바 차트 ──────────────────────────────────────────────
const PnlBarChart = ({ data, curr, labelSuffix = '', compact = false }) => (
  <div className={`stats-chart-card${compact ? ' stats-chart-card-compact' : ''}`}>
    <ResponsiveContainer width="100%" height={compact ? 160 : 220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => `${v}${labelSuffix}`}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => {
            if (Math.abs(v) >= 1000000) return `${(v/1000000).toFixed(1)}M`;
            if (Math.abs(v) >= 1000)    return `${(v/1000).toFixed(0)}K`;
            return v;
          }}
          width={52}
        />
        <Tooltip
          content={<ChartTooltip curr={curr} labelSuffix={labelSuffix} />}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#f87171' : '#60a5fa'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ── PnL 캘린더 히트맵 ───────────────────────────────────────────
// [용도] GitHub 잔디 스타일 일별 PnL 히트맵 / [호출] StatsPage
const CalendarHeatmap = ({ dailyPnl, curr }) => {
  const pnlMap = {};
  dailyPnl.forEach(d => { pnlMap[d.date] = Number(d.pnl); });

  const values = Object.values(pnlMap).filter(v => v !== 0);
  const maxAbs = values.length ? Math.max(...values.map(Math.abs)) : 1;

  // Today 기준 52주(364일) 전부터 Today까지
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // 월요일로 정렬
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks = [];
  let cur = new Date(startDate);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10);
      week.push({ date: dateStr, pnl: cur <= today ? (pnlMap[dateStr] ?? null) : null, future: cur > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // 월 레이블 (각 주의 첫 번째 날 기준)
  const monthLabels = {};
  weeks.forEach((week, wi) => {
    const m = week[0].date.slice(5, 7);
    const prev = wi > 0 ? weeks[wi - 1][0].date.slice(5, 7) : null;
    if (m !== prev) monthLabels[wi] = new Date(2000, Number(m) - 1).toLocaleString('en', { month: 'short' });
  });

  const getCellBg = (pnl, future) => {
    if (future) return 'transparent';
    if (pnl === null) return 'rgba(255,255,255,0.04)';
    if (pnl === 0) return 'rgba(255,255,255,0.07)';
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    const alpha = 0.2 + intensity * 0.7;
    return pnl > 0
      ? `rgba(248, 113, 113, ${alpha})`
      : `rgba(96, 165, 250, ${alpha})`;
  };

  return (
    <div className="stats-chart-card">
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        {/* 월 레이블 */}
        <div style={{ display: 'flex', marginLeft: '22px', marginBottom: '4px', gap: '3px', minWidth: 'max-content' }}>
          {weeks.map((_, wi) => (
            <div key={wi} style={{ width: '11px', fontSize: '9px', color: monthLabels[wi] ? 'var(--text-muted)' : 'transparent', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'visible' }}>
              {monthLabels[wi] ?? ''}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '3px', minWidth: 'max-content' }}>
          {/* 요일 레이블 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '18px', flexShrink: 0 }}>
            {['월', '', '수', '', '금', '', '일'].map((d, i) => (
              <div key={i} style={{ height: '11px', fontSize: '9px', color: 'var(--text-muted)', lineHeight: '11px', textAlign: 'right', paddingRight: '3px' }}>{d}</div>
            ))}
          </div>

          {/* 셀 */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={!cell.future && cell.pnl !== null
                    ? `${cell.date}: ${cell.pnl > 0 ? '+' : ''}${cell.pnl.toLocaleString()} ${curr.suffix?.trim() || ''}`
                    : cell.future ? '' : `${cell.date}: No trades`}
                  style={{
                    width: '11px', height: '11px',
                    borderRadius: '2px',
                    background: getCellBg(cell.pnl, cell.future),
                    flexShrink: 0,
                    cursor: cell.pnl !== null && !cell.future ? 'pointer' : 'default',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => { if (cell.pnl !== null) e.target.style.transform = 'scale(1.4)'; }}
                  onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginRight: '2px' }}>Loss</span>
          {[0.25, 0.45, 0.65, 0.85].map(a => (
            <div key={a} style={{ width: '11px', height: '11px', borderRadius: '2px', background: `rgba(96,165,250,${a})` }} />
          ))}
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', margin: '0 2px' }} />
          {[0.25, 0.45, 0.65, 0.85].map(a => (
            <div key={a} style={{ width: '11px', height: '11px', borderRadius: '2px', background: `rgba(248,113,113,${a})` }} />
          ))}
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>Profit</span>
        </div>
      </div>
    </div>
  );
};

// ── 커스텀 셀렉트 ────────────────────────────────────────────────
const ExchangeSelect = ({ value, onChange }) => (
  <div className="stats-select-wrap">
    <select
      className="stats-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="ALL">All Exchange</option>
      <option value="UPBIT">UPBIT  (₩ KRW)</option>
      <option value="BYBIT">BYBIT  (KRW)</option>
      <option value="BITGET">BITGET  (KRW)</option>
      <option value="OKX">OKX  (KRW)</option>
      <option value="BINANCE">BINANCE  (KRW)</option>
      <option value="BINGX">BINGX  (KRW)</option>
    </select>
    <span className="stats-select-arrow">▾</span>
  </div>
);

// ── 지표 카드 ────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color, glow }) => (
  <div className="kpi-card" style={glow ? { '--glow': glow } : {}}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={color ? { color } : {}}>{value ?? '—'}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ── 바 차트 툴팁 ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, curr, labelSuffix = '' }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-month">{d.label}{labelSuffix}</div>
      <div style={{ color: pnlColor(d.pnl), fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
        {fmtSigned(d.pnl, curr)}
      </div>
      {(d.winCount !== undefined) && (
        <div className="chart-tooltip-meta">
          <span style={{ color: '#f87171' }}>▲ {d.winCount} wins</span>
          <span style={{ color: '#60a5fa' }}>▼ {d.lossCount} losses</span>
        </div>
      )}
    </div>
  );
};

// ── 감정 트렌드 차트 ───────────────────────────────────────────────
// [컴포넌트] 감정 변화 추이 시각화 / [호출] StatsPage.jsx > 감정 통계 섹션
const EmotionTimelineChart = ({ timeline }) => {
  // 감정별 색상 정의
  const emotionColors = {
    CALM:       '#10b981', // 초록
    CONFIDENT:  '#3b82f6', // 파랑
    FOMO:       '#ef4444', // 빨강
    GREEDY:     '#f59e0b', // 주황
    FEARFUL:    '#8b5cf6', // 보라
    ANXIOUS:    '#ec4899', // 핑크
  };

  // 감정별 누적 계산 (stacked area)
  const prepareStackedData = () => {
    const dates = timeline.map(d => d.date);
    const emotions = Object.keys(emotionColors);

    const stackedData = dates.map((date, dateIndex) => {
      const dataPoint = { date: date.slice(5) }; // MM-DD 표시

      let cumulative = 0;
      emotions.forEach(emotion => {
        const emotionCounts = timeline[dateIndex]?.emotionCounts || {};
        const count = emotionCounts[emotion] || 0;
        dataPoint[emotion] = cumulative + count;
        cumulative += count;
      });

      return dataPoint;
    });

    return { stackedData, emotions };
  };

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}>
        No emotion data available
      </div>
    );
  }

  const { stackedData, emotions } = prepareStackedData();

  // PnL 오버레이 라인 data
  const pnlData = timeline.map(d => ({
    date: d.date.slice(5),
    pnl: d.pnl
  }));

  return (
    <div style={{ marginTop: '20px' }}>
      {/* 차트 영역 */}
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={stackedData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            hide
            tickLine={false}
            axisLine={false}
          />

          {/* 스택드 에리어 차트 - 감정 분포 */}
          {emotions.map((emotion) => (
            <Area
              key={emotion}
              type="monotone"
              dataKey={emotion}
              stackId="1"
              stroke={emotionColors[emotion]}
              fill={emotionColors[emotion]}
              fillOpacity={0.3}
              strokeOpacity={0.8}
            />
          ))}

          {/* PnL 라인 차트 */}
          <Line
            data={pnlData}
            dataKey="pnl"
            type="monotone"
            stroke="#ffffff"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            yAxisId="pnl"
          />

          <Tooltip
            contentStyle={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        {emotions.map(emotion => (
          <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: emotionColors[emotion]
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {emotion === 'CALM' ? 'Calm' :
               emotion === 'CONFIDENT' ? 'Confident' :
               emotion === 'FOMO' ? 'FOMO' :
               emotion === 'GREEDY' ? 'Greedy' :
               emotion === 'FEARFUL' ? 'Fearful' : 'Anxious'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
// [컴포넌트] Performance statistics 메인 페이지 / [호출] App.jsx 라우터
const StatsPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [embeddedTab, setEmbeddedTab] = useState('stats');
  const subTab = embedded ? embeddedTab : (searchParams.get('tab') || 'stats');
  const [exchange,        setExchange]    = useState('ALL');
  const [stats,           setStats]       = useState(null);
  const [loading,         setLoading]     = useState(true);

  const curr = CURRENCY[exchange];

  useEffect(() => {
    let active = true;
    getStats(exchange)
      .then(res => { if (active) setStats(res.data); })
      .catch(error => console.error(error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [exchange]);


  const s = stats?.summary;

  const monthlyChartData = (stats?.monthly_pnl ?? []).map(m => ({
    label:     m.month.slice(5),
    pnl:       Number(m.pnl),
    winCount:  m.win_count,
    lossCount: m.loss_count,
  }));

  const dailyChartData = (stats?.daily_pnl ?? []).map(d => ({
    label:     d.date.slice(5),  // MM-DD
    pnl:       Number(d.pnl),
    winCount:  d.win_count,
    lossCount: d.loss_count,
  }));

  const isEmpty = !s || s.total_positions === 0;

  return (
    <div className="page stats-page">

      {/* ── 헤더 ── */}
      <div className="stats-header anim-fade-up">
        <div className="stats-title-row">
          <h1 className="page-title">Analytics</h1>
          {subTab === 'stats' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ExchangeSelect value={exchange} onChange={setExchange} />
            </div>
          )}
        </div>
        {subTab === 'stats' && curr.mixed && !isEmpty && (
          <div className="stats-mixed-notice">
            All exchanges are normalized to KRW for comparison.
          </div>
        )}
      </div>

      {/* 서브탭 */}
      <div className="tabs anim-fade-up" style={{ marginBottom: '20px' }}>
        {[
          { key: 'stats',       label: 'Performance' },
          { key: 'trader-type', label: 'Trader Profile' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`tab${subTab === key ? ' active' : ''}`}
            onClick={() => embedded ? setEmbeddedTab(key) : setSearchParams(key === 'stats' ? {} : { tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 서브탭: You의 유형 */}
      {subTab === 'trader-type' && <TraderTypePage embedded />}

      {/* 서브탭: Performance statistics */}
      {subTab === 'stats' && (loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">Calculating performance...</p>
        </div>
      ) : isEmpty ? (
        <div className="card anim-fade-up stats-empty-guide"><span className="stats-empty-code">DATA REQUIRED</span><h3>Connect and sync trading data to unlock analytics.</h3><p>Once closed positions are available, this page calculates win rate, risk-to-reward, PnL trends and calendar insights.</p><div><button onClick={() => navigate('/settings?tab=connections')}>1. Connect exchange</button><button onClick={() => navigate('/positions?tab=trades')}>2. Sync executions</button><button onClick={() => navigate('/positions')}>3. Review positions</button></div></div>) : (
        <>

        <div className="stats-body stats-body-grid anim-fade-up2">

          {/* ── KPI 카드 그리드 ── */}
          <section className="stats-section stats-section--full">
            <div className="stats-section-label">Key performance metrics</div>
            <div className="kpi-grid">
              <KpiCard
                label="Total positions"
                value={s.total_positions}
                sub={`Wins ${s.win_count} / Losses ${s.loss_count}`}
              />
              <KpiCard
                label="Win rate"
                value={`${s.win_rate}%`}
                color={s.win_rate >= 50 ? '#f87171' : '#60a5fa'}
                glow={s.win_rate >= 50 ? 'rgba(248,113,113,0.15)' : 'rgba(96,165,250,0.12)'}
              />
              <KpiCard
                label={`Total PnL${curr.mixed ? '' : ` (${curr.suffix.trim()})`}`}
                value={fmtSigned(s.total_pnl, curr)}
                color={pnlColor(s.total_pnl)}
                glow={Number(s.total_pnl) >= 0 ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.1)'}
              />
              <KpiCard
                label="Profit Factor"
                value={s.profit_factor === 0 ? '—' : s.profit_factor}
                sub="Gross profit ÷ gross loss"
                color={s.profit_factor >= 1.5 ? '#f87171' : s.profit_factor >= 1 ? '#facc15' : '#60a5fa'}
              />
              <KpiCard
                label="Average win"
                value={fmtSigned(s.avg_win, curr)}
                color="#f87171"
              />
              <KpiCard
                label="Average loss"
                value={fmtSigned(s.avg_loss, curr)}
                color="#60a5fa"
              />
              <KpiCard
                label="Reward-to-risk (R:R)"
                value={rrDisplay(s.rr_ratio)}
                sub="Average win ÷ |average loss|"
              />
              <KpiCard
                label="Maximum drawdown (MDD)"
                value={s.mdd === 0 ? '—' : fmtSigned(-s.mdd, curr)}
                sub="Largest decline from a cumulative peak"
                color="#60a5fa"
              />
              <KpiCard
                label="Largest single loss"
                value={fmtSigned(s.max_single_loss, curr)}
                color="#60a5fa"
              />
              <KpiCard
                label="Longest win streak"
                value={`${s.max_win_streak} in a row`}
                color="#f87171"
              />
              <KpiCard
                label="Longest loss streak"
                value={`${s.max_loss_streak} in a row`}
                color="#60a5fa"
              />
            </div>
          </section>

          {/* ── Cumulative profit 곡선 ── */}
          {(stats?.daily_pnl?.length ?? 0) > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">Cumulative PnL</div>
              <CumulativePnlChart dailyPnl={stats.daily_pnl} curr={curr} exchange={exchange} compact />
            </section>
          )}

          {/* ── PnL 캘린더 히트맵 ── */}
          {(stats?.daily_pnl?.length ?? 0) > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">PnL calendar</div>
              <CalendarHeatmap dailyPnl={stats.daily_pnl} curr={curr} />
            </section>
          )}

          {/* ── 월별 PnL 차트 ── */}
          {monthlyChartData.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">Monthly PnL</div>
              <PnlBarChart data={monthlyChartData} curr={curr} labelSuffix="" compact />
            </section>
          )}

          {/* ── 일별 PnL 차트 ── */}
          {dailyChartData.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">Daily PnL</div>
              <PnlBarChart data={dailyChartData} curr={curr} compact />
            </section>
          )}

          {/* ── 롱 / 숏 비교 ── */}
          <section className="stats-section stats-section--full">
            <div className="stats-section-label">Long / Short comparison</div>
            <div className="side-grid">
              {[stats?.long_stats, stats?.short_stats].map(side => {
                if (!side) return null;
                const isLong  = side.side === 'LONG';
                const accent  = isLong ? '#f87171' : '#60a5fa';
                const lossCount = side.total_count - side.win_count;
                return (
                  <div key={side.side} className="side-card" style={{ '--side-accent': accent }}>
                    <div className="side-card-head">
                      <span className="side-card-badge" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}>
                        {isLong ? '▲ LONG' : '▼ SHORT'}
                      </span>
                      <span className="side-card-count mono">{side.total_count}</span>
                    </div>

                    <div className="side-winrate-bar-wrap">
                      <div className="side-winrate-bar-track">
                        <div
                          className="side-winrate-bar-fill"
                          style={{ width: `${side.win_rate}%`, background: accent }}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent }}>
                        {side.win_rate}%
                      </span>
                    </div>

                    <div className="side-rows">
                      <div className="side-row">
                        <span>Wins / Losses</span>
                        <span className="mono">
                          <span style={{ color: '#f87171' }}>{side.win_count}W</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                          <span style={{ color: '#60a5fa' }}>{lossCount}L</span>
                        </span>
                      </div>
                      <div className="side-row">
                        <span>Total PnL</span>
                        <span className="mono" style={{ color: pnlColor(side.total_pnl) }}>
                          {fmtSigned(side.total_pnl, curr)}
                        </span>
                      </div>
                      <div className="side-row">
                        <span>Average PnL</span>
                        <span className="mono" style={{ color: pnlColor(side.avg_pnl) }}>
                          {fmtSigned(side.avg_pnl, curr)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Symbol별 테이블 ── */}
          {stats?.symbol_stats?.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">Performance by symbol</div>
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Trades</th>
                      <th>Win rate</th>
                      <th>Total PnL</th>
                      <th>Average PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.symbol_stats.map((sym, i) => (
                      <tr key={sym.symbol} style={{ animationDelay: `${i * 30}ms` }}>
                        <td><span className="sym-name mono">{sym.symbol}</span></td>
                        <td className="mono text-center">
                          <span style={{ color: '#f87171' }}>{sym.win_count}W</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                          <span style={{ color: '#60a5fa' }}>{sym.total_count - sym.win_count}L</span>
                        </td>
                        <td>
                          <div className="sym-winrate-wrap">
                            <div className="sym-winrate-bar">
                              <div className="sym-winrate-fill" style={{
                                width: `${sym.win_rate}%`,
                                background: sym.win_rate >= 50 ? '#f87171' : '#60a5fa',
                              }} />
                            </div>
                            <span className="mono" style={{ color: sym.win_rate >= 50 ? '#f87171' : '#60a5fa', minWidth: 42 }}>
                              {sym.win_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="mono text-right" style={{ color: pnlColor(sym.total_pnl) }}>
                          {fmtSigned(sym.total_pnl, curr)}
                        </td>
                        <td className="mono text-right" style={{ color: pnlColor(sym.avg_pnl) }}>
                          {fmtSigned(sym.avg_pnl, curr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── 2단계: 감정별 Win rate ── */}
          {stats?.emotion_stats?.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">Win rate by emotion</div>
              <div className="emotion-grid-stats">
                {stats.emotion_stats.map(em => (
                  <div key={em.emotion} className="emotion-stat-card">
                    <div className="emotion-stat-label">{em.label}</div>
                    <div className="emotion-stat-winrate" style={{
                      color: em.win_rate >= 50 ? '#f87171' : '#60a5fa',
                    }}>
                      {em.win_rate}%
                    </div>
                    <div className="emotion-stat-bar-track">
                      <div className="emotion-stat-bar-fill" style={{
                        width: `${em.win_rate}%`,
                        background: em.win_rate >= 50 ? '#f87171' : '#60a5fa',
                      }} />
                    </div>
                    <div className="emotion-stat-meta">
                      {em.win_count}W / {em.total_count - em.win_count}L
                      <span style={{ marginLeft: 6, color: pnlColor(em.total_pnl) }}>
                        {fmtSigned(em.total_pnl, curr)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 3단계: 시간대별 히트맵 ── */}
          {stats?.hourly_stats?.some(h => h.total_count > 0) && (
            <section className="stats-section">
              <div className="stats-section-label">Performance by hour (exit time)</div>
              <div className="hourly-heatmap">
                {stats.hourly_stats.map(h => {
                  const active = h.total_count > 0;
                  const intensity = active ? h.win_rate / 100 : 0;
                  const bg = active
                    ? h.win_rate >= 50
                      ? `rgba(248,113,113,${0.08 + intensity * 0.4})`
                      : `rgba(96,165,250,${0.08 + (1 - intensity) * 0.4})`
                    : 'rgba(255,255,255,0.03)';
                  return (
                    <div key={h.hour} className="hourly-cell" style={{ background: bg }}
                         title={active ? `${h.hour}:00: ${h.win_rate}% (${h.win_count}W/${h.total_count-h.win_count}L) / ${fmtSigned(h.pnl, curr)}` : `${h.hour}:00: No trades`}>
                      <div className="hourly-cell-hour">{String(h.hour).padStart(2,'0')}</div>
                      {active && (
                        <>
                          <div className="hourly-cell-rate" style={{
                            color: h.win_rate >= 50 ? '#f87171' : '#60a5fa',
                          }}>
                            {h.win_rate}%
                          </div>
                          <div className="hourly-cell-count">{h.total_count}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 3단계: 요일별 analysis ── */}
          {stats?.day_of_week_stats?.some(d => d.total_count > 0) && (
            <section className="stats-section">
              <div className="stats-section-label">Performance by weekday</div>
              <div className="dow-grid">
                {stats.day_of_week_stats.map(d => (
                  <div key={d.day_name} className="dow-card" style={{
                    opacity: d.total_count === 0 ? 0.35 : 1,
                  }}>
                    <div className="dow-name">{d.day_name}</div>
                    {d.total_count > 0 ? (
                      <>
                        <div className="dow-winrate" style={{
                          color: d.win_rate >= 50 ? '#f87171' : '#60a5fa',
                        }}>
                          {d.win_rate}%
                        </div>
                        <div className="dow-bar-track">
                          <div className="dow-bar-fill" style={{
                            width: `${d.win_rate}%`,
                            background: d.win_rate >= 50 ? '#f87171' : '#60a5fa',
                          }} />
                        </div>
                        <div className="dow-meta">{d.total_count}</div>
                        <div className="dow-pnl mono" style={{ color: pnlColor(d.total_pnl) }}>
                          {fmtSigned(d.total_pnl, curr)}
                        </div>
                      </>
                    ) : (
                      <div className="dow-meta" style={{ marginTop: 8 }}>No trades</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
        </>
      ))}
    </div>
  );
};

export default StatsPage;
