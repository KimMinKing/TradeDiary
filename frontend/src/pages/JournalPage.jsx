// [파일 용도] Trading journal 페이지 (캘린더 뷰 + Journal 작성/Trade history 분할 패널)

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getJournals, getJournal, deleteJournal, getStrategyTags,
  createJournal, updateJournal, createStrategyTag, deleteStrategyTag,
  getChecklist,
  getJournalFeedback, getPeriodReview, getPlanFeedback,
} from '../api/journalApi';
import { getTrades, getPlans, togglePlanDone } from '../api/exchangeApi';
import { getNewsSummary, refreshNewsSummary } from '../api/newsApi';
import MarkdownContent from '../components/MarkdownContent';
import TradePlanPage from './TradePlanPage';
import usePreferredLanguage from '../hooks/usePreferredLanguage';

const JOURNAL_TRANSLATIONS = {
  '매수': 'Buy', '매도': 'Sell', '단기투자': 'Short-term', '장기투자': 'Long-term',
  '매매 기법': 'Trading setup', '추세 매매': 'Trend trading', '뉴스 기반': 'News-driven',
  '롱 전략': 'Long strategy', '숏 전략': 'Short strategy', '블록 사이드': 'Block side',
  '매수 기준(조건)이 충족되었는가?': 'Were the entry criteria met?',
  '손절가를 설정했는가?': 'Was a stop-loss set?',
  '포지션 사이즈가 적절한가?': 'Was the position size appropriate?',
  '리스크-리워드 비율이 1:2 이상인가?': 'Was the risk-reward ratio at least 1:2?',
  '매도 기준(조건)에 도달했는가?': 'Were the exit criteria reached?',
  '욕심 때문에 늦게 매도하진 않았는가?': 'Was the exit delayed by greed?',
  '손절가를 지켰는가?': 'Was the stop-loss respected?',
  '계획대로 실행했는가?': 'Was the trade executed as planned?',
  '감정이 판단에 영향을 미쳤는가?': 'Did emotion affect the decision?',
  '다음에 개선할 점은?': 'What should be improved next time?',
};

const journalText = (value, language) => language === 'ko' ? value : (JOURNAL_TRANSLATIONS[value] || value);

// [컴포넌트] Journal 이미지 지연 로드 (has_image 시 detail API 호출) / [호출] JournalPage 뷰
const JournalImageViewer = ({ journal, onZoom }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadImage = async () => {
    if (imgSrc || loading) return;
    setLoading(true);
    try {
      const res = await getJournal(journal.id);
      setImgSrc(res.data.image);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (!journal.has_image && !imgSrc) return null;

  if (imgSrc) {
    return (
      <div style={{ marginTop: '8px' }}>
        <img
          src={imgSrc}
          alt="Journal attachment"
          onClick={() => onZoom(imgSrc)}
          style={{
            maxHeight: '160px', maxWidth: '100%',
            borderRadius: '8px', objectFit: 'cover',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.target.style.opacity = '0.85'}
          onMouseLeave={e => e.target.style.opacity = '1'}
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: '8px' }}>
      <button onClick={loadImage} disabled={loading} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', cursor: 'pointer',
      }}>
        {loading ? 'Loading...' : 'View image'}
      </button>
    </div>
  );
};

// [컴포넌트] 선택된 Trade 참조 태그 표시 / [호출] JournalPage 폼
const TradeRefChip = ({ trade, onClear }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '3px 8px', borderRadius: '999px', fontSize: '11px',
    background: trade.side === 'BUY' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
    border: `1px solid ${trade.side === 'BUY' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
    color: 'var(--text-secondary)',
  }}>
    <span style={{ color: trade.side === 'BUY' ? '#4ade80' : '#f87171', fontWeight: 700 }}>
      {trade.side === 'BUY' ? 'Buy' : 'Sell'}
    </span>
    <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trade.symbol}</span>
    <span className="mono">{Number(trade.price).toLocaleString()}</span>
    <span className="mono" style={{ opacity: 0.6 }}>{trade.traded_at?.slice(11, 16)}</span>
    <button onClick={onClear} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      opacity: 0.5, color: 'inherit', padding: '0', lineHeight: 1,
    }}>✕</button>
  </div>
);

// [컴포넌트] 뷰 모드에서 Save된 Trade 참조 1 표시 (상세 카드) / [호출] JournalPage 뷰
const TradeRefBadge = ({ tradeRef: t }) => {
  const isBuy = t.side === 'BUY';
  const sideColor = isBuy ? '#4ade80' : '#f87171';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
      background: isBuy ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
      border: `1px solid ${isBuy ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
    }}>
      {t.exchange && (
        <span style={{
          fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 600,
        }}>{t.exchange}</span>
      )}
      <span style={{ color: sideColor, fontWeight: 700 }}>{isBuy ? 'Buy' : 'Sell'}</span>
      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</span>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        {Number(t.price).toLocaleString()}
      </span>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        Quantity {parseFloat(Number(t.qty).toFixed(8)).toString()}
      </span>
      {t.traded_at && (
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          {t.traded_at.slice(11, 19)}
        </span>
      )}
    </div>
  );
};

const WEEKDAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_KR = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EMOTIONS = [
  { value: 'CALM', label: 'Calm' }, { value: 'CONFIDENT', label: 'Confident' },
  { value: 'GREEDY', label: 'Greedy' }, { value: 'FEARFUL', label: 'Fearful' },
  { value: 'ANXIOUS', label: 'Anxious' },
];

// Keep FOMO here only so older journals can still render their saved emotion.
const EMOTION_LABEL = {
  CALM: 'Calm', CONFIDENT: 'Confident', FOMO: 'FOMO', GREEDY: 'Greedy', FEARFUL: 'Fearful', ANXIOUS: 'Anxious',
};

// [용도] Date → 'YYYY-MM-DD' 문자열 변환
const fmtDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

// [용도] 이미지 파일을 base64 JPEG로 압축 변환 / [호출] 이미지 업로드 핸들러
const compressImage = (file, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// [컴포넌트] Trading journal 메인 페이지 / [호출] App.jsx 라우터
const JournalPage = () => {
  const language = usePreferredLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('tab') || 'journal'; // 'journal' | 'plans'
  const [currentMonth, setCurrentMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [journals,     setJournals]     = useState([]);
  const [trades,       setTrades]       = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [tags,         setTags]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [mode,         setMode]         = useState('view'); // 'view' | 'form'
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 폼 상태
  const [form, setForm] = useState({
    symbol: '', exchange: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [], image: null, visibility: 'PRIVATE',
    checklist: {},
  });
  const [, setChecklistItems] = useState([]);
  const [checklistByCategory, setChecklistByCategory] = useState({});
  const [saving,         setSaving]         = useState(false);
  const [formError,      setFormError]      = useState('');
  const [aiFeedback,     setAiFeedback]     = useState(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [planFeedback, setPlanFeedback] = useState(null);
  const [planFeedbackLoading, setPlanFeedbackLoading] = useState(false);
  const [showWeeklyReviewModal, setShowWeeklyReviewModal] = useState(false);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [weeklyReviewLoading, setWeeklyReviewLoading] = useState(false);
  const [periodReviewType, setPeriodReviewType] = useState('weekly'); // 'weekly' | 'monthly'
  const [newTagName,     setNewTagName]     = useState('');
  const [newTagColor,    setNewTagColor]    = useState('#00d4aa');
  const [addingTag,      setAddingTag]      = useState(false);
  const [showTagInput,   setShowTagInput]   = useState(false); // 태그 입력창 노출 여부
  const [selectedTrades, setSelectedTrades] = useState([]);    // 선택된 Trade 목록 (다중)
  const [calOpen,        setCalOpen]        = useState(true);  // 캘린더 펼침/접힘
  const [zoomImage,      setZoomImage]      = useState(null);  // 이미지 확대 모달
  const [yearMonthPicker, setYearMonthPicker] = useState(false); // 년/월 빠른 선택 팝업
  const [pickerYear,     setPickerYear]     = useState(todayDate.getFullYear()); // 팝업에서 선택 중인 년도

  // 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchTagIds,  setSearchTagIds]  = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const isSearchActive = searchKeyword.trim() !== '' || searchTagIds.length > 0;

  // AI 시장 요약 상태
  const [aiSummary,     setAiSummary]     = useState(null);
  const [aiRefreshing,  setAiRefreshing]  = useState(false);


  // [용도] AI 시장 요약 조회 / [호출] 마운트
  const fetchAiSummary = useCallback(async () => {
    try {
      const res = await getNewsSummary();
      if (res.data?.summary_ko) setAiSummary(res.data);
    } catch { /* Optional summary is allowed to be unavailable. */ }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchAiSummary();
    // 자동 Sync complete 시 data 재조회 (로딩 스피너 없이)
    const onAutoSync = () => fetchAll(true);
    window.addEventListener('autoSyncComplete', onAutoSync);
    return () => window.removeEventListener('autoSyncComplete', onAutoSync);
  }, [fetchAiSummary]);

  // [용도] AI 요약 수동 재생성 / [호출] 새로고침 버튼
  const handleRefreshAiSummary = async () => {
    setAiRefreshing(true);
    try {
      const res = await refreshNewsSummary();
      if (res.data?.summary_ko) setAiSummary(res.data);
    } catch { /* Keep the previous summary on refresh failure. */ }
    setAiRefreshing(false);
  };

  // [용도] 주간/월간 AI 리뷰 생성 / [호출] AI 리뷰 버튼
  const handleGetWeeklyReview = async () => {
    setShowWeeklyReviewModal(true);
    setWeeklyReview(null);
    setWeeklyReviewLoading(true);
    try {
      // 현재 날짜 기준으로 일주일 전 (고정)
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);

      const from = fmtDate(oneWeekAgo);
      const to = fmtDate(today);


      const res = await getPeriodReview(periodReviewType, from, to);
      setWeeklyReview({ type: periodReviewType, review: res.data });
    } catch (e) {
      console.error(e);
      alert('Could not generate the AI review.');
    } finally {
      setWeeklyReviewLoading(false);
    }
  };

  // [용도] 년/월 팝업 외부 클릭 시 Close / [호출] yearMonthPicker 상태 변경 시
  useEffect(() => {
    if (!yearMonthPicker) return;
    const handleOutside = (e) => {
      if (!e.target.closest('.cal-ym-picker') && !e.target.closest('.cal-month-title-btn')) {
        setYearMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [yearMonthPicker]);

  // [용도] Journal/태그/Trade All 조회 / [호출] useEffect, Save/Delete 후
  // silent=true 이면 로딩 스피너 없이 data만 갱신 (자동 Sync 후 호출 시)
  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jRes, tgRes, trRes, plRes, clRes] = await Promise.all([
        getJournals(), getStrategyTags(), getTrades(), getPlans(), getChecklist(),
      ]);
      setJournals(jRes.data);
      setTags(tgRes.data);
      setTrades(trRes.data);
      setPlans(plRes.data);
      setChecklistItems(clRes.data);

      // 카테고리별로 정리
      const byCategory = {};
      clRes.data.forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      });
      setChecklistByCategory(byCategory);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── 파생 data ────────────────────────────────
  const selectedDateStr   = fmtDate(selectedDate);
  const journalDateSet    = new Set(journals.map(j => j.trade_date?.slice(0, 10)));
  const journalsForDay    = isSearchActive ? searchResults : journals.filter(j => j.trade_date?.slice(0, 10) === selectedDateStr);
  const tradesForDay      = trades.filter(t => t.traded_at?.slice(0, 10) === selectedDateStr);
  const plansForDay       = plans.filter(p => p.plan_date === selectedDateStr);

  const requestPlanFeedback = useCallback(async (draft = {}) => {
    if (!selectedDateStr || plansForDay.length === 0) {
      setPlanFeedback(null);
      return null;
    }

    setPlanFeedbackLoading(true);
    try {
      const res = await getPlanFeedback({
        trade_date: selectedDateStr,
        symbol: draft.symbol ?? null,
        entry_reason: draft.entry_reason ?? null,
        exit_reason: draft.exit_reason ?? null,
        emotion: draft.emotion ?? null,
        memo: draft.memo ?? null,
      });
      const feedback = typeof res.data === 'string' ? res.data : (res.data?.feedback ?? '');
      setPlanFeedback(feedback);
      return feedback;
    } catch {
      setPlanFeedback('Could not generate the AI trade-plan review.');
      return null;
    } finally {
      setPlanFeedbackLoading(false);
    }
  }, [selectedDateStr, plansForDay.length]);
  const getLatestJournalForDay = useCallback(() => {
    if (journalsForDay.length === 0) return null;
    return [...journalsForDay].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || a.trade_date || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || b.trade_date || 0).getTime();
      return bTime - aTime;
    })[0];
  }, [journalsForDay]);

  const handleRunPlanReview = useCallback(async () => {
    const journal = getLatestJournalForDay();
    if (!journal) {
      setPlanFeedback('Save a journal entry for this date before requesting a review.');
      return;
    }

    await requestPlanFeedback({
      symbol: journal.symbol || null,
      entry_reason: journal.entry_reason || null,
      exit_reason: journal.exit_reason || null,
      emotion: journal.emotion || null,
      memo: journal.memo || null,
    });
  }, [getLatestJournalForDay, requestPlanFeedback]);

  // [용도] Trading journal 화면에서 당일 계획 complete 여부 토글 / [호출] 계획 체크박스
  const handleTogglePlanDone = async (planId) => {
    try {
      const res = await togglePlanDone(planId);
      setPlans(prev => prev.map(p => p.id === planId ? res.data : p));
      setPlanFeedback(null);
    } catch (e) {
      console.error(e);
      setFormError('Could not update the trade plan status.');
    }
  };


  // [용도] 검색 실행 (키워드 + 태그) / [호출] 검색바 Enter, 태그 토글
  const doSearch = useCallback(async (keyword, tagIds) => {
    if (!keyword.trim() && tagIds.length === 0) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (tagIds.length > 0) params.tagId = tagIds;
      const res = await getJournals(params);
      setSearchResults(res.data);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  // [용도] 검색어 변경 시 디바운스 검색 / [호출] searchKeyword 변경
  useEffect(() => {
    if (!searchKeyword.trim() && searchTagIds.length === 0) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => doSearch(searchKeyword, searchTagIds), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchTagIds, doSearch]);

  // [용도] 검색 태그 토글 / [호출] 태그 칩 클릭
  const toggleSearchTag = (tagId) => {
    setSearchTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // [용도] 검색 Reset / [호출] 검색 Reset 버튼
  const clearSearch = () => {
    setSearchKeyword('');
    setSearchTagIds([]);
    setSearchResults([]);
  };

  // ── 캘린더 계산 ────────────────────────────────
  const year         = currentMonth.getFullYear();
  const month        = currentMonth.getMonth();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=일

  const calDays = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  // ── 핸들러 ─────────────────────────────────────


  // [용도] 캘린더 날짜 클릭 / [호출] cal-cell onClick
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setMode('view');
    setEditTarget(null);
  };

  // [용도] 새 Journal 작성 폼 열기 / [호출] 새 Journal 버튼
  const openCreate = () => {
    setEditTarget(null);
    setForm({ symbol: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [], image: null, visibility: 'PRIVATE', checklist: {} });
    setFormError('');
    setPlanFeedback(null);
    setPlanFeedbackLoading(false);
    setSelectedTrades([]);
    setShowTagInput(false);
    if (window.innerWidth < 768) setCalOpen(false);
    setMode('form');
  };

  // [용도] Edit 폼 열기 (detail API로 이미지 로드) / [호출] Edit 버튼
  const openEdit = async (journal) => {
    setEditTarget(journal);
    const journalDate = journal.trade_date
      ? new Date(`${journal.trade_date.slice(0, 10)}T00:00:00`)
      : new Date();
    journalDate.setHours(0, 0, 0, 0);
    setSelectedDate(journalDate);
    setCurrentMonth(new Date(journalDate.getFullYear(), journalDate.getMonth(), 1));
    setForm({
      symbol:      journal.symbol       ?? '',
      entryReason: journal.entry_reason ?? '',
      exitReason:  journal.exit_reason  ?? '',
      emotion:     journal.emotion      ?? '',
      memo:        journal.memo         ?? '',
      tagIds:      journal.tags?.map(t => t.id) ?? [],
      image:       null,
      visibility:  journal.visibility ?? 'PRIVATE',
      checklist:   {},
    });
    setFormError('');
    setPlanFeedback(null);
    setPlanFeedbackLoading(false);
    // Edit 시 기존 선택 Trade 복 KRW
    try {
      setSelectedTrades(journal.trade_refs_json ? JSON.parse(journal.trade_refs_json) : []);
    } catch {
      setSelectedTrades([]);
    }
    setShowTagInput(false);
    if (window.innerWidth < 768) setCalOpen(false);
    setMode('form');

    // 이미지가 있으면 detail API로 실제 이미지 data 로드
    if (journal.has_image) {
      try {
        const res = await getJournal(journal.id);
        setForm(p => ({ ...p, image: res.data.image ?? null, checklist: {} }));
      } catch { /* ignore */ }
    }
  };

  // [용도] Trade 카드 클릭으로 다중선택 토글 / [호출] trade-ref-card onClick
  // 재클릭 시 해제, 선택된 Trade의 고유 Symbol들을 symbol 필드에 자동 Apply
  const toggleTrade = (trade) => {
    setSelectedTrades(prev => {
      const isSelected = prev.some(t => t.id === trade.id);
      const next = isSelected
        ? prev.filter(t => t.id !== trade.id)
        : [...prev, trade];
      // 선택된 Trade들의 고유 Symbol을 쉼표로 join해서 symbol 자동 입력
      const symbols = [...new Set(next.map(t => t.symbol))].join(', ');
      setForm(p => ({ ...p, symbol: symbols }));
      return next;
    });
  };

  // [용도] Journal Save (작성/Edit) / [호출] Save 버튼
  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      // 선택된 Trade 스냅샷 Save (id, symbol, side, price, qty, traded_at, exchange)
      const tradeRefs = selectedTrades.map(t => ({
        id: t.id, symbol: t.symbol, side: t.side,
        price: t.price, qty: t.qty, traded_at: t.traded_at, exchange: t.exchange,
      }));
      const payload = {
        trade_date:      selectedDateStr,
        symbol:          form.symbol.trim() || null,
        exchange:        form.exchange || selectedTrades[0]?.exchange || (form.symbol.includes('USDT') ? 'BINANCE' : form.symbol.startsWith('KRW-') ? 'UPBIT' : null),
        trade_refs_json: tradeRefs.length > 0 ? JSON.stringify(tradeRefs) : null,
        entry_reason:    form.entryReason.trim() || null,
        exit_reason:     form.exitReason.trim()  || null,
        emotion:         form.emotion            || null,
        memo:            form.memo.trim()        || null,
        image:           form.image              || null,
        visibility:      form.visibility,
        tag_ids:         form.tagIds,
        checklist:       form.checklist,
      };
      if (editTarget) {
        await updateJournal(editTarget.id, payload);
      } else {
        await createJournal(payload);
      }
      await fetchAll();
      setMode('view');
      await requestPlanFeedback({
        symbol: payload.symbol,
        entry_reason: payload.entry_reason,
        exit_reason: payload.exit_reason,
        emotion: payload.emotion,
        memo: payload.memo,
      });
    } catch {
      setFormError('Save failed. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // [용도] Journal Delete / [호출] Delete Confirm 버튼
  const handleDelete = async (id) => {
    try {
      await deleteJournal(id);
      setDeleteConfirm(null);
      await fetchAll();
    } catch {
      alert('Delete failed');
    }
  };

  // [용도] 태그 선택 토글 / [호출] 태그 버튼
  const toggleTag = (id) =>
    setForm(p => ({
      ...p,
      tagIds: p.tagIds.includes(id) ? p.tagIds.filter(t => t !== id) : [...p.tagIds, id],
    }));

  // [용도] 새 커스텀 태그 생성 / [호출] 태그 추가 버튼
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const res = await createStrategyTag(newTagName.trim(), newTagColor);
      const created = res.data;
      setTags(p => [...p, created]);
      setForm(p => ({ ...p, tagIds: [...p.tagIds, created.id] }));
      setNewTagName('');
      setShowTagInput(false);
    } catch {
      setFormError('태그 생성 failed');
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteTag = async (event, tagId) => {
    event.stopPropagation();
    try {
      await deleteStrategyTag(tagId);
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      setForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((id) => id !== tagId),
      }));
    } catch {
      setFormError('태그 Delete failed');
    }
  };

  const isToday    = (date) => fmtDate(date) === fmtDate(todayDate);
  const isSelected = (date) => fmtDate(date) === selectedDateStr;

  // [용도] AI 피드백 생성 / [호출] Journal 카드의 AI 피드백 버튼
  const handleGetJournalFeedback = async (journal) => {
    setAiFeedbackLoading(true);
    try {
      const res = await getJournalFeedback(journal.id, false);
      setAiFeedback({
        journalId: journal.id,
        feedback: res.data,
      });
    } catch (e) {
      console.error(e);
      alert('AI 피드백 생성에 failed했습니다.');
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  const handleRefreshJournalFeedback = async () => {
    if (!aiFeedback?.journalId) return;
    setAiFeedbackLoading(true);
    try {
      const res = await getJournalFeedback(aiFeedback.journalId, true);
      setAiFeedback((prev) => prev ? { ...prev, feedback: res.data } : prev);
    } catch (e) {
      console.error(e);
      alert('AI 피드백 생성에 failed했습니다.');
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  // ── 렌더 ───────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header anim-fade-up">
        {subTab === 'journal' && (
          <button className="compact-primary-action" onClick={openCreate}>
            <span>+</span> New entry
          </button>
        )}
      </div>

      {/* 서브탭 */}
      <div className="section-nav anim-fade-up">
        {[
          { key: 'journal', label: 'Journal' },
          { key: 'plans',   label: 'Trade Plans' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`section-nav-item${subTab === key ? ' active' : ''}`}
            onClick={() => setSearchParams(key === 'journal' ? {} : { tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 서브탭: Trade plans */}
      {subTab === 'plans' && (
        <TradePlanPage
          embedded
          onSaved={async () => {
            setSearchParams({});
            window.location.reload();
          }}
        />
      )}

      {/* 서브탭: Trading journal (기본) */}
      {subTab === 'journal' && (loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">Loading...</p>
        </div>
      ) : (
        <>
        {/* ── 검색 바 ──────────────────────────────── */}
        <div className="anim-fade-up2" style={{
          marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: '14px', pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                className="input"
                placeholder="Search journal entries, decisions and notes..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
            {isSearchActive && (
              <button className="btn btn-ghost btn-xs" onClick={clearSearch} style={{ flexShrink: 0 }}>
                ✕ Reset
              </button>
            )}
          </div>
          {/* 태그 필터 칩 */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleSearchTag(tag.id)}
                  style={{
                    padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                    border: `1px solid ${searchTagIds.includes(tag.id) ? tag.color : 'var(--border)'}`,
                    background: searchTagIds.includes(tag.id) ? `${tag.color}20` : 'transparent',
                    color: searchTagIds.includes(tag.id) ? tag.color : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {isSearchActive && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {searching ? 'Searching...' : `${searchResults.length} results`}
            </div>
          )}
        </div>

        <div className="journal-page-layout anim-fade-up2">

          {/* ── 캘린더 패널 ─────────────────────────── */}
          <div className="cal-panel">
            {/* 캘린더 접기 버튼 */}
            <button
              className="btn btn-ghost btn-xs cal-toggle-btn"
              onClick={() => setCalOpen(v => !v)}
              style={{ width: '100%', marginBottom: calOpen ? '8px' : 0, justifyContent: 'space-between' }}
            >
              <span>Calendar</span>
              <span>{calOpen ? 'Collapse' : 'Expand'}</span>
            </button>
            {calOpen && <>
            {/* 월 네비 */}
            <div className="cal-header" style={{ position: 'relative' }}>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>‹</button>
              <button
                className="cal-month-title-btn"
                onClick={() => { setPickerYear(year); setYearMonthPicker((v) => !v); }}
                title="Choose month and year"
              >
                {MONTHS_KR[month]} {year} ▾
              </button>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>›</button>

              {/* 년/월 빠른 선택 팝업 */}
              {yearMonthPicker && (
                <div className="cal-ym-picker" onClick={(e) => e.stopPropagation()}>
                  {/* 년도 선택 */}
                  <div className="cal-ym-year-row">
                    <button className="cal-nav-btn" onClick={() => setPickerYear((y) => y - 1)}>‹</button>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{pickerYear}</span>
                    <button className="cal-nav-btn" onClick={() => setPickerYear((y) => y + 1)}>›</button>
                  </div>
                  {/* 월 그리드 */}
                  <div className="cal-ym-month-grid">
                    {MONTHS_KR.map((label, i) => (
                      <button
                        key={i}
                        className={`cal-ym-month-btn${pickerYear === year && i === month ? ' active' : ''}`}
                        onClick={() => {
                          setCurrentMonth(new Date(pickerYear, i, 1));
                          setYearMonthPicker(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 요일 헤더 */}
            <div className="cal-grid">
              {WEEKDAYS.map(d => (
                <div key={d} className={`cal-weekday${d === 'Sun' ? ' sun' : d === 'Sat' ? ' sat' : ''}`}>{d}</div>
              ))}

              {/* 날짜 셀 */}
              {calDays.map((date, i) => {
                if (!date) return <div key={`e${i}`} className="cal-cell empty" />;
                const ds         = fmtDate(date);
                const hasDot     = journalDateSet.has(ds);
                const isSun      = date.getDay() === 0;
                const isSat      = date.getDay() === 6;
                const dotCount   = journals.filter(j => j.trade_date?.slice(0, 10) === ds).length;

                return (
                  <div
                    key={ds}
                    className={[
                      'cal-cell',
                      isToday(date)    ? 'today'    : '',
                      isSelected(date) ? 'selected' : '',
                      isSun ? 'sun' : isSat ? 'sat' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleDayClick(date)}
                  >
                    <span className="cal-num">{date.getDate()}</span>
                    {hasDot && (
                      <div className="cal-dots">
                        {Array.from({ length: Math.min(dotCount, 3) }).map((_, k) => (
                          <span key={k} className="cal-dot" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="cal-footer">
              <span className="cal-legend"><span className="cal-dot" /> Entry recorded</span>
              <span className="cal-legend today-legend">● Today</span>
            </div>

            {/* 이번 달 요약 */}
            <div className="cal-summary">
              <div className="cal-summary-item">
                <span className="cal-summary-num">
                  {journals.filter(j => j.trade_date?.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`).length}
                </span>
                <span className="cal-summary-label">Entries this month</span>
              </div>
              <div className="cal-summary-item">
                <span className="cal-summary-num">{journals.length}</span>
                <span className="cal-summary-label">All Journal</span>
              </div>
            </div>
            </>}

          {/* ── AI 요약 패널들 ────────────────────── */}
          <div className="ai-summary-panels">
            {/* AI 시장 요약 패널 */}
            <div className="ai-summary-panel">
              <div className="ai-summary-header">
                <span className="ai-summary-label">{language === 'ko' ? '✦ 오늘의 시장 동향' : "✦ Today's market brief"}</span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleRefreshAiSummary}
                  disabled={aiRefreshing}
                  style={{ opacity: 0.6, fontSize: '11px', padding: '2px 6px' }}
                >
                  {aiRefreshing ? '생성 중...' : '↺'}
                </button>
              </div>
              {aiSummary?.summary_ko ? (
                <>
                  <p className="ai-summary-text">{aiSummary.summary_ko}</p>
                  {aiSummary.updated_at && (
                    <span className="ai-summary-time">
                      {new Date(aiSummary.updated_at).toLocaleString('ko-KR', {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })} 기준
                    </span>
                  )}
                </>
              ) : (
                <p className="ai-summary-empty">
                  {aiRefreshing
                    ? (language === 'ko' ? 'AI가 요약하고 있습니다...' : 'AI is preparing the summary...')
                    : (language === 'ko' ? '오늘의 요약이 없습니다. ↺ 버튼으로 생성하세요.' : 'No summary is available for today. Select ↺ to generate one.')}
                </p>
              )}
            </div>
          </div>
          </div>

          {/* ── 콘텐츠 패널 ──────────────────────────── */}
          <div className="journal-content">
            {/* 헤더: 검색 모드 or 날짜 모드 */}
            {isSearchActive ? (
              <div className="journal-day-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    Search results
                    <span className="count-badge" style={{ marginLeft: '6px' }}>
                      {searchResults.length}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
            <div className="journal-day-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 1);
                    setSelectedDate(prev);
                    setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
                    setMode('view');
                  }}
                >‹</button>
                <div className="journal-day-label">
                  {new Intl.DateTimeFormat('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).format(selectedDate)}
                  {isToday(selectedDate) && <span className="today-badge">Today</span>}
                  {journalsForDay.length > 0 && (
                    <span className="count-badge">{journalsForDay.length}</span>
                  )}
                </div>
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setDate(next.getDate() + 1);
                    setSelectedDate(next);
                    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
                    setMode('view');
                  }}
                >›</button>
              </div>
              {mode === 'view' ? (
                <>
                  <button className="btn btn-primary btn-xs" onClick={openCreate}>
                    + New entry
                  </button>
                  <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select
                      value={periodReviewType}
                      onChange={e => setPeriodReviewType(e.target.value)}
                      style={{
                        fontSize: '11px', padding: '4px 8px',
                        borderRadius: '4px', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)', color: 'var(--text-primary)',
                      }}
                    >
                      <option value="weekly">Weekly review</option>
                      <option value="monthly">Monthly review</option>
                    </select>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={handleGetWeeklyReview}
                      disabled={weeklyReviewLoading}
                    >
                      {weeklyReviewLoading ? 'Generating...' : 'AI review'}
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn btn-ghost btn-xs" onClick={() => setMode('view')}>
                  ✕ Cancel
                </button>
              )}
            </div>
            )}

            {/* ── 뷰 모드 ── */}
            {mode === 'view' && !isSearchActive && (
              <div className="form-split">
                {/* 왼쪽: Journal 목록 */}
                <div className="form-split-left">
                  {plansForDay.length > 0 && (
                    <div style={{
                      marginBottom: '12px',
                      padding: '10px 12px',
                      background: 'rgba(16,185,129,0.06)',
                      borderRadius: '10px',
                      border: '1px solid rgba(16,185,129,0.16)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>
                          🤖 이 날의 Trade plans AI 한줄평
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={handleRunPlanReview}
                          disabled={planFeedbackLoading || journalsForDay.length === 0}
                        >
                          {planFeedbackLoading ? 'Confirm 중...' : 'Confirm'}
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {planFeedbackLoading
                          ? 'AI가 Save된 Journal와 계획을 보고 있습니다...'
                          : (planFeedback || (journalsForDay.length > 0
                            ? '기존 Journal가 있으면 Confirm 버튼으로 AI 점검을 다시 돌릴 수 있습니다.'
                            : '이 날짜에 Save된 Journal가 없어서 바로 Confirm할 수 없습니다.'))}
                      </div>
                    </div>
                  )}
                {/* Today의 Trade plans (뷰 모드) */}
                {plansForDay.length > 0 && (
                  <div style={{
                    marginBottom: '12px', padding: '10px 12px',
                    background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📋 이 날의 Trade plans
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plansForDay.map(p => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '8px',
                          fontSize: '12px', lineHeight: 1.5,
                          opacity: p.done ? 0.5 : 1,
                        }}>
                          <input
                            type="checkbox"
                            checked={!!p.done}
                            onChange={() => handleTogglePlanDone(p.id)}
                            title="계획 실행 여부"
                            style={{
                              width: '16px', height: '16px',
                              margin: '2px 0 0',
                              flexShrink: 0,
                              cursor: 'pointer',
                              accentColor: '#60a5fa',
                            }}
                          />
                          <span style={{
                            flexShrink: 0, fontSize: '10px', padding: '1px 5px',
                            borderRadius: '4px', fontWeight: 600, marginTop: '1px',
                            background: p.direction === 'LONG' ? 'rgba(248,113,113,0.12)' :
                                        p.direction === 'SHORT' ? 'rgba(96,165,250,0.12)' :
                                        'rgba(255,255,255,0.06)',
                            color: p.direction === 'LONG' ? '#f87171' :
                                   p.direction === 'SHORT' ? '#60a5fa' : 'var(--text-muted)',
                            border: `1px solid ${p.direction === 'LONG' ? 'rgba(248,113,113,0.25)' :
                                              p.direction === 'SHORT' ? 'rgba(96,165,250,0.25)' :
                                              'var(--border)'}`,
                          }}>
                            {p.direction === 'LONG' ? '▲ LONG' : p.direction === 'SHORT' ? '▼ SHORT' : '미정'}
                          </span>
                          {p.symbol && (
                            <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                              {p.symbol}
                            </span>
                          )}
                          <span style={{
                            color: 'var(--text-secondary)',
                            textDecoration: p.done ? 'line-through' : 'none',
                          }}>
                            {p.content}
                          </span>
                          {p.done && <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="day-journal-list">
                {journalsForDay.length === 0 ? (
                  <div className="day-empty">
                    <span style={{ fontSize: '32px' }}>📓</span>
                    <p className="text-muted" style={{ fontSize: '14px', marginTop: '8px' }}>
                      No journal entries for this day
                    </p>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={openCreate}>
                      + Write the first entry
                    </button>
                  </div>
                ) : (
                  journalsForDay.map(journal => (
                    <div key={journal.id} className="journal-card">
                      {/* 상단 메타 (Trade 참조, 감정, 시각) */}
                      <div className="journal-card-meta" style={{ flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {(() => {
                          try {
                            const refs = journal.trade_refs_json ? JSON.parse(journal.trade_refs_json) : [];
                            if (refs.length > 0) {
                              return refs.map((t, i) => <TradeRefBadge key={i} tradeRef={t} />);
                            }
                          } catch { /* Fall back to the journal symbol below. */ }
                          return journal.symbol ? <span className="journal-symbol">{journal.symbol}</span> : null;
                        })()}
                        {journal.emotion && (
                          <span className="journal-emotion">{EMOTION_LABEL[journal.emotion]}</span>
                        )}
                        <span className="mono text-muted" style={{ fontSize: '11px' }}>
                          {journal.created_at?.slice(11, 16)}
                        </span>
                      </div>

                      {journal.tags?.length > 0 && (
                        <div className="journal-tags">
                          {journal.tags.map(tag => (
                            <span key={tag.id} className="tag-chip" style={{ '--tag-color': tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {journal.entry_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">Entry rationale</div>
                          <p className="journal-section-content">{journal.entry_reason}</p>
                        </div>
                      )}
                      {journal.exit_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">Exit rationale</div>
                          <p className="journal-section-content">{journal.exit_reason}</p>
                        </div>
                      )}
                      {journal.memo && (
                        <div className="journal-section">
                          <div className="journal-section-label">Notes</div>
                          <p className="journal-section-content">{journal.memo}</p>
                        </div>
                      )}

                      {/* 첨부 이미지 (hasImage=true면 detail API로 로드) */}
                      <JournalImageViewer journal={journal} onZoom={setZoomImage} />

                      {/* Edit/Delete 버튼 — 카드 맨 아래 오른쪽 */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(journal)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(journal.id)}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
                </div>
                </div>

                {/* 오른쪽: 당일 Trade history (read-only) */}
                <div className="form-split-right">
                  <div className="trades-ref-header">
                    <span className="trades-ref-title">Executions for this day</span>
                    <span className="mono text-muted" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {tradesForDay.length}
                    </span>
                  </div>
                  <div className="trades-ref-scroll">
                    {tradesForDay.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p className="text-muted" style={{ fontSize: '13px' }}>No executions for this day</p>
                      </div>
                    ) : (
                      tradesForDay.map(trade => (
                        <div key={trade.id} className="trade-ref-card">
                          <div className="trade-ref-top">
                            <span className={`badge ${trade.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`}
                              style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {trade.side === 'BUY' ? 'Buy' : 'Sell'}
                            </span>
                            <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                              {trade.symbol}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {trade.exchange.charAt(0) + trade.exchange.slice(1).toLowerCase()}
                            </span>
                          </div>
                          <div className="trade-ref-rows">
                            <div className="trade-ref-row">
                              <span className="trade-ref-label">Price</span>
                              <span className="mono trade-ref-val">{Number(trade.price).toLocaleString()}</span>
                            </div>
                            <div className="trade-ref-row">
                              <span className="trade-ref-label">Quantity</span>
                              <span className="mono trade-ref-val">{parseFloat(Number(trade.qty).toFixed(8)).toString()}</span>
                            </div>
                            <div className="trade-ref-row">
                              <span className="trade-ref-label">Time</span>
                              <span className="mono trade-ref-val" style={{ color: 'var(--text-secondary)' }}>
                                {trade.traded_at?.slice(11, 16)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── 검색 모드: 검색 결과 목록 ── */}
            {mode === 'view' && isSearchActive && (
              <div className="day-journal-list">
                {searching ? (
                  <div className="empty-state">
                    <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
                    <p className="empty-state-title">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="empty-state">
                    <span style={{ fontSize: '32px' }}>🔍</span>
                    <p className="text-muted" style={{ fontSize: '14px', marginTop: '8px' }}>
                      No matching entries
                    </p>
                  </div>
                ) : (
                  searchResults.map(journal => (
                    <div key={journal.id} className="journal-card">
                      <div className="journal-card-meta" style={{ flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {journal.trade_date?.slice(0, 10)}
                        </span>
                        {(() => {
                          try {
                            const refs = journal.trade_refs_json ? JSON.parse(journal.trade_refs_json) : [];
                            if (refs.length > 0) {
                              return refs.map((t, i) => <TradeRefBadge key={i} tradeRef={t} />);
                            }
                          } catch { /* Fall back to the journal symbol below. */ }
                          return journal.symbol ? <span className="journal-symbol">{journal.symbol}</span> : null;
                        })()}
                        {journal.emotion && (
                          <span className="journal-emotion">{EMOTION_LABEL[journal.emotion]}</span>
                        )}
                      </div>
                      {journal.tags?.length > 0 && (
                        <div className="journal-tags">
                          {journal.tags.map(tag => (
                            <span key={tag.id} className="tag-chip" style={{ '--tag-color': tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {journal.entry_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">Entry 이유</div>
                          <p className="journal-section-content">{journal.entry_reason}</p>
                        </div>
                      )}
                      {journal.exit_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">Exit 이유</div>
                          <p className="journal-section-content">{journal.exit_reason}</p>
                        </div>
                      )}
                      {journal.memo && (
                        <div className="journal-section">
                          <div className="journal-section-label">메모</div>
                          <p className="journal-section-content">{journal.memo}</p>
                        </div>
                      )}
                      {journal.checklist && journal.checklist.length > 0 && (
                        <div className="journal-section">
                          <div className="journal-section-label">체크리스트</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {(() => {
                              // 카테고리별로 정리
                              const byCategory = {};
                              journal.checklist.forEach(item => {
                                if (!byCategory[item.category]) byCategory[item.category] = [];
                                byCategory[item.category].push(item);
                              });

                              return Object.entries(byCategory).map(([category, items]) => (
                                <div key={category} style={{ marginBottom: '8px' }}>
                                  <div style={{
                                    fontSize: '11px', fontWeight: 600,
                                    color: 'var(--text-muted)', marginBottom: '4px',
                                  }}>
                                    {category === 'ENTRY' ? '🛒 매수 전' : category === 'EXIT' ? '📤 매도 전' : '📝 복기'}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {items.map(item => (
                                      <span
                                        key={item.id}
                                        className={`tag-chip ${item.checked ? 'checked' : ''}`}
                                        style={{
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          borderRadius: '999px',
                                          background: item.checked ? 'rgba(74,222,128,0.1)' : 'var(--bg-secondary)',
                                          border: `1px solid ${item.checked ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                                          color: item.checked ? '#4ade80' : 'var(--text-secondary)',
                                        }}
                                      >
                                        {item.content}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(journal)}>Edit</button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleGetJournalFeedback(journal)}
                          disabled={aiFeedbackLoading && aiFeedback?.journalId === journal.id}
                        >
                          {aiFeedbackLoading && aiFeedback?.journalId === journal.id ? '생성 중...' : 'Journal 요약'}
                        </button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(journal.id)}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── 폼 모드: Journal 작성 + Trade history ── */}
            {mode === 'form' && (
              <div className="form-split">
                {/* 왼쪽: 작성 폼 */}
                <div className="form-split-left">
                  {/* Today의 Trade plans (해당 날짜) */}
                  {plansForDay.length > 0 && (
                    <div style={{
                      marginBottom: '14px', padding: '10px 12px',
                      background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📋 이 날의 Trade plans
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {plansForDay.map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            fontSize: '12px', lineHeight: 1.5,
                            opacity: p.done ? 0.5 : 1,
                          }}>
                            <input
                              type="checkbox"
                              checked={!!p.done}
                              onChange={() => handleTogglePlanDone(p.id)}
                              title="계획 실행 여부"
                              style={{
                                width: '16px', height: '16px',
                                margin: '2px 0 0',
                                flexShrink: 0,
                                cursor: 'pointer',
                                accentColor: '#60a5fa',
                              }}
                            />
                            <span style={{
                              flexShrink: 0, fontSize: '10px', padding: '1px 5px',
                              borderRadius: '4px', fontWeight: 600, marginTop: '1px',
                              background: p.direction === 'LONG' ? 'rgba(248,113,113,0.12)' :
                                          p.direction === 'SHORT' ? 'rgba(96,165,250,0.12)' :
                                          'rgba(255,255,255,0.06)',
                              color: p.direction === 'LONG' ? '#f87171' :
                                     p.direction === 'SHORT' ? '#60a5fa' : 'var(--text-muted)',
                              border: `1px solid ${p.direction === 'LONG' ? 'rgba(248,113,113,0.25)' :
                                                p.direction === 'SHORT' ? 'rgba(96,165,250,0.25)' :
                                                'var(--border)'}`,
                            }}>
                              {p.direction === 'LONG' ? '▲ LONG' : p.direction === 'SHORT' ? '▼ SHORT' : (language === 'ko' ? '미정' : 'Unspecified')}
                            </span>
                            {p.symbol && (
                              <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                                {p.symbol}
                              </span>
                            )}
                            <span style={{
                              color: 'var(--text-secondary)',
                              textDecoration: p.done ? 'line-through' : 'none',
                            }}>
                              {p.content}
                            </span>
                            {p.done && <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="input-label">Symbol</label>
                    {/* 선택된 Trade 칩 목록 */}
                    {selectedTrades.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                        {selectedTrades.map(t => (
                          <TradeRefChip
                            key={t.id}
                            trade={t}
                            onClear={() => toggleTrade(t)}
                          />
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      className="input"
                      placeholder={language === 'ko' ? '예: KRW-BTC, BTCUSDT (오른쪽 거래 클릭 시 자동 입력)' : 'e.g. KRW-BTC, BTCUSDT (select a trade on the right to autofill)'}
                      value={form.symbol}
                      onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '매매 감정' : 'Trading emotion'}</label>
                    <div className="emotion-grid">
                      {EMOTIONS.map(em => (
                        <button
                          key={em.value}
                          type="button"
                          className={`emotion-btn${form.emotion === em.value ? ' selected' : ''}`}
                          onClick={() => setForm(p => ({
                            ...p, emotion: p.emotion === em.value ? '' : em.value,
                          }))}
                        >
                          {em.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '진입 이유' : 'Entry reason'}</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder={language === 'ko' ? '왜 진입했나요? (오른쪽에서 거래 선택)' : 'Why did you enter? (select a trade on the right)'}
                      value={form.entryReason}
                      onChange={e => setForm(p => ({ ...p, entryReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '청산 이유' : 'Exit reason'}</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder={language === 'ko' ? '왜 청산했나요? (오른쪽에서 거래 선택)' : 'Why did you exit? (select a trade on the right)'}
                      value={form.exitReason}
                      onChange={e => setForm(p => ({ ...p, exitReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="input-label" style={{ margin: 0 }}>{language === 'ko' ? '전략 태그' : 'Strategy tags'}</label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => { setShowTagInput(v => !v); setNewTagName(''); }}
                      >
                        {showTagInput ? (language === 'ko' ? '✕ 닫기' : '✕ Close') : (language === 'ko' ? '+ 새 태그' : '+ New tag')}
                      </button>
                    </div>
                    <div className="tag-grid">
                      {tags.map(tag => (
                        <div
                          key={tag.id}
                          className={`tag-btn${form.tagIds.includes(tag.id) ? ' selected' : ''}`}
                          style={{
                            '--tag-color': tag.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <button
                            type="button"
                            style={{ all: 'unset', cursor: 'pointer', flex: 1 }}
                            onClick={() => toggleTag(tag.id)}
                          >
                            {journalText(tag.name, language)}
                          </button>
                          {!(tag.is_default ?? tag.isDefault) && (
                            <button
                              type="button"
                              onClick={(event) => handleDeleteTag(event, tag.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: 0,
                                lineHeight: 1,
                                opacity: 0.7,
                              }}
                              aria-label={`${journalText(tag.name, language)} ${language === 'ko' ? '삭제' : 'Delete'}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* 태그 추가 버튼 클릭 시에만 노출 */}
                    {showTagInput && (
                      <div className="tag-add-row" style={{ marginTop: '8px' }}>
                        <input
                          type="color"
                          className="color-picker"
                          value={newTagColor}
                          onChange={e => setNewTagColor(e.target.value)}
                          title={language === 'ko' ? '태그 색상' : 'Tag color'}
                        />
                        <input
                          type="text"
                          className="input input-sm"
                          placeholder={language === 'ko' ? '태그 이름 입력 후 Enter' : 'Enter a tag name and press Enter'}
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleAddTag}
                          disabled={addingTag || !newTagName.trim()}
                        >
                          {language === 'ko' ? '추가' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '메모' : 'Notes'}</label>
                    <textarea
                      className="textarea"
                      rows={4}
                      placeholder={language === 'ko' ? '반성, 개선할 점, 기타 메모...' : 'Reflections, improvements, and other notes...'}
                      value={form.memo}
                      onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                    />
                  </div>

                  {/* 체크리스트 */}
                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '복기 체크리스트' : 'Review checklist'}</label>
                    {Object.entries(checklistByCategory).map(([category, items]) => (
                      <div key={category} style={{ marginBottom: '16px' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginBottom: '8px', fontSize: '13px', fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}>
                          <span>{category === 'ENTRY' ? (language === 'ko' ? '🛒 매수 전' : '🛒 Before entry') : category === 'EXIT' ? (language === 'ko' ? '📤 매도 전' : '📤 Before exit') : (language === 'ko' ? '📝 복기' : '📝 Review')}</span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {items.length} {language === 'ko' ? '항목' : items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {items.map(item => (
                            <label key={item.id} style={{
                              display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px',
                              borderRadius: '6px', fontSize: '12px',
                              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}>
                              <input
                                type="checkbox"
                                checked={!!form.checklist[item.id]}
                                onChange={e => {
                                  setForm(p => ({
                                    ...p,
                                    checklist: {
                                      ...p.checklist,
                                      [item.id]: e.target.checked
                                    }
                                  }));
                                }}
                                style={{
                                  width: '16px', height: '16px', margin: '2px 0',
                                  flexShrink: 0, cursor: 'pointer',
                                }}
                              />
                              <span style={{
                                flex: 1,
                                lineHeight: 1.4,
                                color: form.checklist[item.id] ? 'var(--text-primary)' : 'var(--text-secondary)',
                              }}>{journalText(item.content, language)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-muted" style={{ fontSize: '11px', marginTop: '8px' }}>
                      {language === 'ko' ? '체크리스트를 완료하여 체계적으로 복기하세요.' : 'Complete the checklist for a structured trade review.'}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '공개 범위' : 'Visibility'}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { value: 'PRIVATE', title: language === 'ko' ? '비공개' : 'Private', description: language === 'ko' ? '나만 볼 수 있습니다' : 'Only you can see this' },
                        { value: 'PUBLIC', title: language === 'ko' ? '공개' : 'Public', description: language === 'ko' ? '공개 프로필에 표시됩니다' : 'Shown on your public profile' },
                      ].map(option => (
                        <button key={option.value} type="button"
                          onClick={() => setForm(p => ({ ...p, visibility: option.value }))}
                          style={{ textAlign: 'left', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                            border: form.visibility === option.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: form.visibility === option.value ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                            color: 'var(--text-primary)' }}>
                          <strong style={{ display: 'block', fontSize: '13px' }}>{option.title}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{option.description}</span>
                        </button>
                      ))}
                    </div>
                    {form.visibility === 'PUBLIC' && <p className="text-muted" style={{ fontSize: '11px', marginTop: '7px' }}>
                      {language === 'ko' ? '계정의 공개 일기 설정이 켜져 있을 때만 다른 사용자에게 보입니다.' : 'Other traders can see this only when public journals are enabled in your profile settings.'}
                    </p>}
                  </div>

                  {/* 이미지 첨부 */}
                  <div className="form-group">
                    <label className="input-label">{language === 'ko' ? '사진 첨부' : 'Photo attachment'}</label>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', flexShrink: 0 }}>
                        {language === 'ko' ? '📷 사진 선택' : '📷 Choose photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                              setFormError(language === 'ko' ? 'JPG, PNG, WebP 이미지만 첨부할 수 있습니다.' : 'Only JPG, PNG, and WebP images are supported.');
                              e.target.value = '';
                              return;
                            }
                            if (file.size > 8 * 1024 * 1024) {
                              setFormError(language === 'ko' ? '원본 사진은 8MB 이하만 첨부할 수 있습니다.' : 'The original image must be 8 MB or smaller.');
                              e.target.value = '';
                              return;
                            }
                            try {
                              const compressed = await compressImage(file);
                              const estimatedBytes = Math.ceil((compressed.split(',')[1]?.length || 0) * 0.75);
                              if (estimatedBytes > 1.5 * 1024 * 1024) {
                                setFormError(language === 'ko' ? '압축된 사진이 1.5MB를 넘습니다. 더 작은 사진을 선택해주세요.' : 'The compressed image exceeds 1.5 MB. Choose a smaller image.');
                                return;
                              }
                              setFormError('');
                              setForm(p => ({ ...p, image: compressed }));
                            } catch {
                              setFormError(language === 'ko' ? '이미지 처리에 실패했습니다.' : 'Could not process the image.');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {form.image && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={form.image}
                            alt={language === 'ko' ? '첨부 이미지' : 'Attached image'}
                            style={{
                              maxHeight: '80px', maxWidth: '120px',
                              borderRadius: '6px', objectFit: 'cover',
                              border: '1px solid var(--border)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, image: null }))}
                            style={{
                              position: 'absolute', top: '-6px', right: '-6px',
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              lineHeight: 1,
                            }}
                          >✕</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {formError && <p className="msg-error">{formError}</p>}

                  <div className="form-actions">
                    <button className="btn btn-ghost" onClick={() => setMode('view')}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : editTarget ? 'Edit complete' : 'Journal Save'}
                    </button>
                  </div>
                </div>

                {/* 오른쪽: 당일 Trade history */}
                <div className="form-split-right">
                  <div className="trades-ref-header">
                    <span className="trades-ref-title">당일 Trade history</span>
                    <span className="mono text-muted" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {tradesForDay.length} · 클릭해서 선택 (다중선택 가능)
                    </span>
                  </div>
                  <div className="trades-ref-scroll">
                    {tradesForDay.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p className="text-muted" style={{ fontSize: '13px' }}>이 날 Trade history이 없습니다</p>
                      </div>
                    ) : (
                      tradesForDay.map(trade => {
                        const isSel = selectedTrades.some(t => t.id === trade.id);
                        const selColor = trade.side === 'BUY' ? '#4ade80' : '#f87171';
                        return (
                          <div
                            key={trade.id}
                            className="trade-ref-card"
                            onClick={() => toggleTrade(trade)}
                            style={{
                              cursor: 'pointer',
                              position: 'relative',
                              outline: isSel ? `2px solid ${selColor}60` : '2px solid transparent',
                              background: isSel ? `${selColor}18` : `${selColor}06`,
                              transition: 'outline 0.15s, background 0.15s',
                            }}
                          >
                            {isSel && (
                              <span style={{
                                position: 'absolute', top: '6px', right: '8px',
                                fontSize: '10px', color: selColor, opacity: 0.8,
                              }}>✓</span>
                            )}
                            <div className="trade-ref-top">
                              <span className={`badge badge-${trade.exchange.toLowerCase()}`}
                                style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.7 }}>
                                {trade.exchange}
                              </span>
                              <span className={`badge ${trade.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`}
                                style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.7 }}>
                                {trade.side === 'BUY' ? '매수' : '매도'}
                              </span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                                {trade.symbol}
                              </span>
                            </div>
                            <div className="trade-ref-rows">
                              <div className="trade-ref-row">
                                <span className="trade-ref-label">Price</span>
                                <span className="mono trade-ref-val">
                                  {Number(trade.price).toLocaleString()}
                                </span>
                              </div>
                              <div className="trade-ref-row">
                                <span className="trade-ref-label">Quantity</span>
                                <span className="mono trade-ref-val">
                                  {parseFloat(Number(trade.qty).toFixed(8)).toString()}
                                </span>
                              </div>
                              <div className="trade-ref-row">
                                <span className="trade-ref-label">시각</span>
                                <span className="mono trade-ref-val" style={{ color: 'var(--text-secondary)' }}>
                                  {trade.traded_at?.slice(11, 16)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      ))}

      {/* Delete Confirm 다이얼로그 */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Journal Delete</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)' }}>이 Journal를 Delete하시겠습니까? 되돌릴 수 없습니다.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {zoomImage && (
        <div
          className="modal-overlay"
          onClick={() => setZoomImage(null)}
          style={{ cursor: 'zoom-out', padding: '20px' }}
        >
          <img
            src={zoomImage}
            alt="확대"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh',
              borderRadius: '8px', objectFit: 'contain',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          />
          <button
            onClick={() => setZoomImage(null)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      )}

      {/* AI 피드백 모달 */}
      {aiFeedback && (
        <div className="modal-overlay" onClick={() => setAiFeedback(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🤖 AI 피드백</h2>
              <button
                className="modal-close"
                onClick={() => setAiFeedback(null)}
              >✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: 1.6,
              }}>
                {aiFeedback.feedback}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleRefreshJournalFeedback} disabled={aiFeedbackLoading}>
                {aiFeedbackLoading ? '생성 중...' : '새로 생성'}
              </button>
              <button className="btn btn-primary" onClick={() => setAiFeedback(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    {/* 주간 AI 리뷰 모달 */}
    {showWeeklyReviewModal && (
      <div className="modal-overlay" onClick={() => setShowWeeklyReviewModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">📊 {weeklyReview?.type === 'weekly' ? '주간' : '월간'} AI 리뷰</h2>
            <button
              className="modal-close"
              onClick={() => setShowWeeklyReviewModal(false)}
            >✕</button>
          </div>
          <div className="modal-body">
            <div style={{
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '14px',
              lineHeight: 1.6,
            }}>
              {weeklyReview?.review ? (
                <MarkdownContent>{weeklyReview.review}</MarkdownContent>
              ) : (
                weeklyReviewLoading ? '리뷰 생성 중...' : '리뷰를 불러오는 중입니다...'
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={() => setShowWeeklyReviewModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );


}

export default JournalPage;
