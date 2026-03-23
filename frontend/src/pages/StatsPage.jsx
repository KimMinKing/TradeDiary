// [파일 용도] 성과 통계 페이지 (핵심 지표 + 월별 PnL + 종목별 + 롱/숏 비교)

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area,
} from 'recharts';
import { getStats, generateAiReport } from '../api/exchangeApi';

// ── 통화 설정 ────────────────────────────────────────────────────
const CURRENCY = {
  ALL:   { symbol: '',   suffix: '',     locale: 'ko-KR', mixed: true  },
  UPBIT: { symbol: '₩',  suffix: ' KRW', locale: 'ko-KR', mixed: false },
  BYBIT: { symbol: '$',  suffix: ' USDT',locale: 'en-US', mixed: false },
};

// ── 포맷 헬퍼 ────────────────────────────────────────────────────
const fmt = (val, curr) => {
  const n = Number(val);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n).toLocaleString(curr.locale, { maximumFractionDigits: 2 });
  const prefix = curr.symbol ? (n >= 0 ? curr.symbol : `-${curr.symbol}`) : (n >= 0 ? '+' : '');
  return curr.symbol
    ? (n < 0 ? `-${curr.symbol}${Math.abs(n).toLocaleString(curr.locale, { maximumFractionDigits: 2 })}` : `${curr.symbol}${abs}`)
    : `${n >= 0 ? '+' : ''}${n.toLocaleString(curr.locale, { maximumFractionDigits: 2 })}`;
};

const fmtSigned = (val, curr) => fmt(val, curr);

const pnlColor = (val) =>
  Number(val) >= 0 ? '#4ade80' : '#f87171';

const rrDisplay = (ratio) => {
  if (!ratio || ratio === 0) return '—';
  if (ratio > 99) return '99+';
  return `1 : ${ratio}`;
};

// ── 누적 수익 곡선 차트 ───────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: '1y',  label: '1년' },
  { key: '180', label: '180일' },
  { key: '90',  label: '90일' },
  { key: '30',  label: '30일' },
  { key: '7',   label: '7일' },
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

const CumulativePnlChart = ({ dailyPnl, curr, exchange }) => {
  const capitalKey = `initCapital_${exchange}`;
  const [period,      setPeriod]      = useState('all');
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
      const days = period === '1y' ? 365 : Number(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      startDate = cutoff.toISOString().slice(0, 10);
    }
    const today = new Date().toISOString().slice(0, 10);
    const dates = fillDateRange(startDate, today);

    // 선택 기간 시작 시점의 전체 누적 PnL (자산 기준점으로만 사용)
    const cumBeforeStart = allDates
      .filter(d => d < startDate)
      .reduce((acc, d) => acc + (pnlMap[d] ?? 0), 0);

    // 기간 내 누적 (항상 0부터 시작)
    let cumInPeriod = 0;

    return dates.map(date => {
      const pnl = pnlMap[date] ?? 0;
      cumInPeriod = Math.round((cumInPeriod + pnl) * 100) / 100;

      // 자산 = 초기자본금 + 전체기간 누적손익 (기간 필터와 무관하게 실제 자산)
      const totalCum = Math.round((cumBeforeStart + cumInPeriod) * 100) / 100;
      const asset    = Math.round((initCapital + totalCum) * 100) / 100;

      // 수익률 = 기간 내 누적손익 / 초기자본금 * 100 (League of Traders 방식)
      const rate = initCapital > 0
        ? Math.round((cumInPeriod / initCapital) * 10000) / 100
        : null;

      return { date, label: date.slice(5), cumPnl: cumInPeriod, asset, rate, hasTrade: !!pnlMap[date] };
    });
  })();

  const last = chartData.at(-1);
  const needCapital = (viewMode === 'asset' || viewMode === 'rate') && initCapital === 0;

  const finalPnl   = last?.cumPnl  ?? 0;
  const finalAsset = last?.asset   ?? initCapital;
  const finalRate  = last?.rate    ?? null;

  const displayVal = viewMode === 'pnl' ? finalPnl : viewMode === 'asset' ? finalAsset : finalRate;
  const isPositive  = (displayVal ?? 0) >= 0;
  const lineColor   = viewMode === 'asset'
    ? (finalPnl >= 0 ? '#4ade80' : '#f87171')
    : (isPositive ? '#4ade80' : '#f87171');
  const gradId  = 'cumGrad';
  const dataKey = viewMode === 'pnl' ? 'cumPnl' : viewMode === 'asset' ? 'asset' : 'rate';

  if (chartData.length === 0) return null;

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
    <div className="stats-chart-card">
      {/* 상단 컨트롤 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
          {[{ k: 'pnl', l: '수익금' }, { k: 'asset', l: '자산' }, { k: 'rate', l: '수익률' }].map(v => (
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
          {needCapital ? '초기자본금 필요' : fmtVal(displayVal)}
        </span>
      </div>

      {/* 초기자본금 설정 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>초기자본금</span>
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
            <button className="btn btn-primary btn-xs" onClick={saveCapital}>저장</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setEditingCapital(false)}>취소</button>
          </>
        ) : (
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => { setCapitalInput(initCapital > 0 ? String(initCapital) : ''); setEditingCapital(true); }}
            style={{ fontSize: '12px' }}
          >
            {initCapital > 0
              ? `${initCapital.toLocaleString()} ${curr.suffix?.trim() || ''} ✎`
              : '+ 설정'}
          </button>
        )}
        {(viewMode === 'asset' || viewMode === 'rate') && initCapital === 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            자산·수익률 표시를 위해 초기자본금을 입력하세요
          </span>
        )}
      </div>

      {needCapital ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>초기자본금을 설정하면 {viewMode === 'asset' ? '자산' : '수익률'} 차트가 표시됩니다</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
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
                        손익 {d.cumPnl >= 0 ? '+' : ''}{d.cumPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    )}
                    {!d.hasTrade && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>거래 없음</div>}
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
const PnlBarChart = ({ data, curr, labelSuffix = '' }) => (
  <div className="stats-chart-card">
    <ResponsiveContainer width="100%" height={220}>
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
            <Cell key={i} fill={entry.pnl >= 0 ? '#4ade80' : '#f87171'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ── 커스텀 셀렉트 ────────────────────────────────────────────────
const ExchangeSelect = ({ value, onChange }) => (
  <div className="stats-select-wrap">
    <select
      className="stats-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="ALL">전체 거래소</option>
      <option value="UPBIT">UPBIT  (₩ KRW)</option>
      <option value="BYBIT">BYBIT  ($ USDT)</option>
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
          <span style={{ color: '#4ade80' }}>▲ {d.winCount}승</span>
          <span style={{ color: '#f87171' }}>▼ {d.lossCount}패</span>
        </div>
      )}
    </div>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
// [컴포넌트] 성과 통계 메인 페이지 / [호출] App.jsx 라우터
const StatsPage = () => {
  const [exchange,    setExchange]    = useState('ALL');
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [aiReport,    setAiReport]    = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);

  const curr = CURRENCY[exchange];

  useEffect(() => { fetchStats(); }, [exchange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getStats(exchange);
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // [용도] AI 리포트 생성 요청 / [호출] AI 리포트 버튼 클릭
  const handleAiReport = async () => {
    setAiLoading(true);
    setAiReport('');
    try {
      const res = await generateAiReport(exchange);
      setAiReport(res.data.report);
    } catch (e) {
      setAiReport('AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAiLoading(false);
    }
  };

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

  const hourlyPnlData = (stats?.hourly_stats ?? [])
    .filter(h => h.total_count > 0)
    .map(h => ({
      label:    String(h.hour).padStart(2, '0'),
      pnl:      Number(h.pnl),
      winCount: h.win_count,
      lossCount: h.total_count - h.win_count,
    }));

  const isEmpty = !s || s.total_positions === 0;

  return (
    <div className="page stats-page">

      {/* ── 헤더 ── */}
      <div className="stats-header anim-fade-up">
        <div className="stats-title-row">
          <h1 className="page-title">성과 통계</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ExchangeSelect value={exchange} onChange={setExchange} />
            {!isEmpty && (
              <button
                className="btn btn-sm"
                onClick={handleAiReport}
                disabled={aiLoading}
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  border: 'none', color: '#fff', fontWeight: 600,
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  opacity: aiLoading ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {aiLoading ? '분석 중...' : '✦ AI 리포트'}
              </button>
            )}
          </div>
        </div>
        {curr.mixed && !isEmpty && (
          <div className="stats-mixed-notice">
            ⚠ 전체 보기는 KRW(UPBIT)와 USDT(BYBIT)가 혼합된 수치입니다. 정확한 손익은 거래소별로 확인해주세요.
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">통계 계산 중...</p>
        </div>
      ) : isEmpty ? (
        <div className="empty-state anim-fade-up">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-title">포지션 데이터가 없습니다</p>
          <p className="empty-state-desc">거래를 동기화하고 포지션을 재계산해주세요</p>
        </div>
      ) : (
        <>
        {/* ── AI 리포트 결과 ── */}
        {(aiReport || aiLoading) && (
          <div className="stats-section anim-fade-up" style={{ marginBottom: '8px' }}>
            <div className="stats-section-label" style={{ color: '#a78bfa' }}>✦ AI 트레이딩 리포트</div>
            <div style={{
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: '12px',
              padding: '20px',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-secondary)',
              fontSize: '14px',
            }}>
              {aiLoading ? (
                <span style={{ color: 'var(--text-muted)' }}>AI가 분석 중입니다...</span>
              ) : aiReport}
            </div>
          </div>
        )}

        <div className="stats-body anim-fade-up2">

          {/* ── KPI 카드 그리드 ── */}
          <section className="stats-section">
            <div className="stats-section-label">핵심 성과 지표</div>
            <div className="kpi-grid">
              <KpiCard
                label="총 포지션"
                value={s.total_positions}
                sub={`수익 ${s.win_count}  /  손실 ${s.loss_count}`}
              />
              <KpiCard
                label="승  률"
                value={`${s.win_rate}%`}
                color={s.win_rate >= 50 ? '#4ade80' : '#f87171'}
                glow={s.win_rate >= 50 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.12)'}
              />
              <KpiCard
                label={`총 손익${curr.mixed ? '' : `  (${curr.suffix.trim()})`}`}
                value={fmtSigned(s.total_pnl, curr)}
                color={pnlColor(s.total_pnl)}
                glow={Number(s.total_pnl) >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.1)'}
              />
              <KpiCard
                label="Profit Factor"
                value={s.profit_factor === 0 ? '—' : s.profit_factor}
                sub="총수익 ÷ 총손실"
                color={s.profit_factor >= 1.5 ? '#4ade80' : s.profit_factor >= 1 ? '#facc15' : '#f87171'}
              />
              <KpiCard
                label="평균 수익"
                value={fmtSigned(s.avg_win, curr)}
                color="#4ade80"
              />
              <KpiCard
                label="평균 손실"
                value={fmtSigned(s.avg_loss, curr)}
                color="#f87171"
              />
              <KpiCard
                label="손익비 (R:R)"
                value={rrDisplay(s.rr_ratio)}
                sub="평균수익 ÷ |평균손실|"
              />
              <KpiCard
                label="최대 단일 손실"
                value={fmtSigned(s.max_single_loss, curr)}
                color="#f87171"
              />
              <KpiCard
                label="최대 연속 수익"
                value={`${s.max_win_streak}연속`}
                color="#4ade80"
              />
              <KpiCard
                label="최대 연속 손실"
                value={`${s.max_loss_streak}연속`}
                color="#f87171"
              />
            </div>
          </section>

          {/* ── 누적 수익 곡선 ── */}
          {(stats?.daily_pnl?.length ?? 0) > 1 && (
            <section className="stats-section">
              <div className="stats-section-label">누적 손익 추이</div>
              <CumulativePnlChart dailyPnl={stats.daily_pnl} curr={curr} exchange={exchange} />
            </section>
          )}

          {/* ── 월별 PnL 차트 ── */}
          {monthlyChartData.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">월별 손익 추이</div>
              <PnlBarChart data={monthlyChartData} curr={curr} labelSuffix="월" />
            </section>
          )}

          {/* ── 일별 PnL 차트 ── */}
          {dailyChartData.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">일별 손익 추이</div>
              <PnlBarChart data={dailyChartData} curr={curr} />
            </section>
          )}

          {/* ── 시간별 PnL 차트 ── */}
          {hourlyPnlData.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">시간별 손익 추이 (청산 기준)</div>
              <PnlBarChart data={hourlyPnlData} curr={curr} labelSuffix="시" />
            </section>
          )}

          {/* ── 롱 / 숏 비교 ── */}
          <section className="stats-section">
            <div className="stats-section-label">롱 / 숏 비교</div>
            <div className="side-grid">
              {[stats?.long_stats, stats?.short_stats].map(side => {
                if (!side) return null;
                const isLong  = side.side === 'LONG';
                const accent  = isLong ? '#4ade80' : '#f87171';
                const lossCount = side.total_count - side.win_count;
                return (
                  <div key={side.side} className="side-card" style={{ '--side-accent': accent }}>
                    <div className="side-card-head">
                      <span className="side-card-badge" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}>
                        {isLong ? '▲ LONG' : '▼ SHORT'}
                      </span>
                      <span className="side-card-count mono">{side.total_count}건</span>
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
                        <span>수익 / 손실</span>
                        <span className="mono">
                          <span style={{ color: '#4ade80' }}>{side.win_count}W</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                          <span style={{ color: '#f87171' }}>{lossCount}L</span>
                        </span>
                      </div>
                      <div className="side-row">
                        <span>총 손익</span>
                        <span className="mono" style={{ color: pnlColor(side.total_pnl) }}>
                          {fmtSigned(side.total_pnl, curr)}
                        </span>
                      </div>
                      <div className="side-row">
                        <span>평균 손익</span>
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

          {/* ── 종목별 테이블 ── */}
          {stats?.symbol_stats?.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">종목별 성과</div>
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>종목</th>
                      <th>거래 수</th>
                      <th>승률</th>
                      <th>총 손익</th>
                      <th>평균 손익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.symbol_stats.map((sym, i) => (
                      <tr key={sym.symbol} style={{ animationDelay: `${i * 30}ms` }}>
                        <td><span className="sym-name mono">{sym.symbol}</span></td>
                        <td className="mono text-center">
                          <span style={{ color: '#4ade80' }}>{sym.win_count}W</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                          <span style={{ color: '#f87171' }}>{sym.total_count - sym.win_count}L</span>
                        </td>
                        <td>
                          <div className="sym-winrate-wrap">
                            <div className="sym-winrate-bar">
                              <div className="sym-winrate-fill" style={{
                                width: `${sym.win_rate}%`,
                                background: sym.win_rate >= 50 ? '#4ade80' : '#f87171',
                              }} />
                            </div>
                            <span className="mono" style={{ color: sym.win_rate >= 50 ? '#4ade80' : '#f87171', minWidth: 42 }}>
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

          {/* ── 2단계: 감정별 승률 ── */}
          {stats?.emotion_stats?.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">감정별 승률</div>
              <div className="emotion-grid-stats">
                {stats.emotion_stats.map(em => (
                  <div key={em.emotion} className="emotion-stat-card">
                    <div className="emotion-stat-label">{em.label}</div>
                    <div className="emotion-stat-winrate" style={{
                      color: em.win_rate >= 50 ? '#4ade80' : '#f87171',
                    }}>
                      {em.win_rate}%
                    </div>
                    <div className="emotion-stat-bar-track">
                      <div className="emotion-stat-bar-fill" style={{
                        width: `${em.win_rate}%`,
                        background: em.win_rate >= 50 ? '#4ade80' : '#f87171',
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

          {/* ── 2단계: 전략 태그별 성과 ── */}
          {stats?.tag_stats?.length > 0 && (
            <section className="stats-section">
              <div className="stats-section-label">전략 태그별 성과</div>
              <div className="tag-stats-list">
                {stats.tag_stats.map(tag => (
                  <div key={tag.tag_name} className="tag-stat-row">
                    <span className="tag-stat-chip" style={{
                      background: `${tag.tag_color}18`,
                      border: `1px solid ${tag.tag_color}50`,
                      color: tag.tag_color,
                    }}>
                      {tag.tag_name}
                    </span>
                    <div className="tag-stat-bar-wrap">
                      <div className="tag-stat-bar-track">
                        <div className="tag-stat-bar-fill" style={{
                          width: `${tag.win_rate}%`,
                          background: tag.win_rate >= 50 ? '#4ade80' : '#f87171',
                        }} />
                      </div>
                    </div>
                    <span className="mono tag-stat-rate" style={{
                      color: tag.win_rate >= 50 ? '#4ade80' : '#f87171',
                    }}>
                      {tag.win_rate}%
                    </span>
                    <span className="mono tag-stat-count">{tag.win_count}W/{tag.total_count - tag.win_count}L</span>
                    <span className="mono tag-stat-pnl" style={{ color: pnlColor(tag.total_pnl) }}>
                      {fmtSigned(tag.total_pnl, curr)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 3단계: 시간대별 히트맵 ── */}
          {stats?.hourly_stats?.some(h => h.total_count > 0) && (
            <section className="stats-section">
              <div className="stats-section-label">시간대별 성과 (청산 기준)</div>
              <div className="hourly-heatmap">
                {stats.hourly_stats.map(h => {
                  const active = h.total_count > 0;
                  const intensity = active ? h.win_rate / 100 : 0;
                  const bg = active
                    ? h.win_rate >= 50
                      ? `rgba(74,222,128,${0.08 + intensity * 0.4})`
                      : `rgba(248,113,113,${0.08 + (1 - intensity) * 0.4})`
                    : 'rgba(255,255,255,0.03)';
                  return (
                    <div key={h.hour} className="hourly-cell" style={{ background: bg }}
                         title={active ? `${h.hour}시: ${h.win_rate}% (${h.win_count}W/${h.total_count-h.win_count}L) / ${fmtSigned(h.pnl, curr)}` : `${h.hour}시: 거래 없음`}>
                      <div className="hourly-cell-hour">{String(h.hour).padStart(2,'0')}</div>
                      {active && (
                        <>
                          <div className="hourly-cell-rate" style={{
                            color: h.win_rate >= 50 ? '#4ade80' : '#f87171',
                          }}>
                            {h.win_rate}%
                          </div>
                          <div className="hourly-cell-count">{h.total_count}건</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 3단계: 요일별 분석 ── */}
          {stats?.day_of_week_stats?.some(d => d.total_count > 0) && (
            <section className="stats-section">
              <div className="stats-section-label">요일별 성과</div>
              <div className="dow-grid">
                {stats.day_of_week_stats.map(d => (
                  <div key={d.day_name} className="dow-card" style={{
                    opacity: d.total_count === 0 ? 0.35 : 1,
                  }}>
                    <div className="dow-name">{d.day_name}</div>
                    {d.total_count > 0 ? (
                      <>
                        <div className="dow-winrate" style={{
                          color: d.win_rate >= 50 ? '#4ade80' : '#f87171',
                        }}>
                          {d.win_rate}%
                        </div>
                        <div className="dow-bar-track">
                          <div className="dow-bar-fill" style={{
                            width: `${d.win_rate}%`,
                            background: d.win_rate >= 50 ? '#4ade80' : '#f87171',
                          }} />
                        </div>
                        <div className="dow-meta">{d.total_count}건</div>
                        <div className="dow-pnl mono" style={{ color: pnlColor(d.total_pnl) }}>
                          {fmtSigned(d.total_pnl, curr)}
                        </div>
                      </>
                    ) : (
                      <div className="dow-meta" style={{ marginTop: 8 }}>거래 없음</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
        </>
      )}
    </div>
  );
};

export default StatsPage;
