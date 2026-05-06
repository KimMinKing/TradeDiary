// [파일 용도] 매매 일기 페이지 (캘린더 뷰 + 일기 작성/거래 내역 분할 패널)

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getJournals, getJournal, deleteJournal, getStrategyTags,
  createJournal, updateJournal, createStrategyTag,
} from '../api/journalApi';
import { getTrades, getPlans } from '../api/exchangeApi';
import { getNewsSummary, refreshNewsSummary } from '../api/newsApi';
import TradePlanPage from './TradePlanPage';

// [컴포넌트] 일기 이미지 지연 로드 (has_image 시 detail API 호출) / [호출] JournalPage 뷰
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
          alt="첨부 이미지"
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
        {loading ? '로딩...' : '📷 사진 보기'}
      </button>
    </div>
  );
};

// [컴포넌트] 선택된 거래 참조 태그 표시 / [호출] JournalPage 폼
const TradeRefChip = ({ trade, onClear }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '3px 8px', borderRadius: '999px', fontSize: '11px',
    background: trade.side === 'BUY' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
    border: `1px solid ${trade.side === 'BUY' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
    color: 'var(--text-secondary)',
  }}>
    <span style={{ color: trade.side === 'BUY' ? '#4ade80' : '#f87171', fontWeight: 700 }}>
      {trade.side === 'BUY' ? '매수' : '매도'}
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

// [컴포넌트] 뷰 모드에서 저장된 거래 참조 1건 표시 (상세 카드) / [호출] JournalPage 뷰
const TradeRefBadge = ({ ref: t }) => {
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
      <span style={{ color: sideColor, fontWeight: 700 }}>{isBuy ? '매수' : '매도'}</span>
      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</span>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        {Number(t.price).toLocaleString()}
      </span>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        수량 {parseFloat(Number(t.qty).toFixed(8)).toString()}
      </span>
      {t.traded_at && (
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          {t.traded_at.slice(11, 19)}
        </span>
      )}
    </div>
  );
};

const WEEKDAYS  = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const EMOTIONS = [
  { value: 'CALM',      label: '😌 냉정' },
  { value: 'CONFIDENT', label: '💪 확신' },
  { value: 'FOMO',      label: '😰 FOMO' },
  { value: 'GREEDY',    label: '🤑 욕심' },
  { value: 'FEARFUL',   label: '😨 공포' },
  { value: 'ANXIOUS',   label: '😟 불안' },
];

const EMOTION_LABEL = {
  CALM: '😌 냉정', CONFIDENT: '💪 확신', FOMO: '😰 FOMO',
  GREEDY: '🤑 욕심', FEARFUL: '😨 공포', ANXIOUS: '😟 불안',
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

// [컴포넌트] 매매 일기 메인 페이지 / [호출] App.jsx 라우터
const JournalPage = () => {
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
    symbol: '', exchange: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [], image: null,
  });
  const [saving,         setSaving]         = useState(false);
  const [formError,      setFormError]      = useState('');
  const [newTagName,     setNewTagName]     = useState('');
  const [newTagColor,    setNewTagColor]    = useState('#00d4aa');
  const [addingTag,      setAddingTag]      = useState(false);
  const [showTagInput,   setShowTagInput]   = useState(false); // 태그 입력창 노출 여부
  const [selectedTrades, setSelectedTrades] = useState([]);    // 선택된 거래 목록 (다중)
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
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    fetchAiSummary();
    // 자동 동기화 완료 시 데이터 재조회 (로딩 스피너 없이)
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
    } catch {}
    setAiRefreshing(false);
  };

  // [용도] 년/월 팝업 외부 클릭 시 닫기 / [호출] yearMonthPicker 상태 변경 시
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

  // [용도] 일기/태그/거래 전체 조회 / [호출] useEffect, 저장/삭제 후
  // silent=true 이면 로딩 스피너 없이 데이터만 갱신 (자동 동기화 후 호출 시)
  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jRes, tgRes, trRes, plRes] = await Promise.all([
        getJournals(), getStrategyTags(), getTrades(), getPlans(),
      ]);
      setJournals(jRes.data);
      setTags(tgRes.data);
      setTrades(trRes.data);
      setPlans(plRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── 파생 데이터 ────────────────────────────────
  const selectedDateStr   = fmtDate(selectedDate);
  const journalDateSet    = new Set(journals.map(j => j.trade_date?.slice(0, 10)));
  const journalsForDay    = isSearchActive ? searchResults : journals.filter(j => j.trade_date?.slice(0, 10) === selectedDateStr);
  const tradesForDay      = trades.filter(t => t.traded_at?.slice(0, 10) === selectedDateStr);
  const plansForDay       = plans.filter(p => p.plan_date === selectedDateStr);

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

  // [용도] 검색 초기화 / [호출] 검색 초기화 버튼
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

  // [용도] 새 일기 작성 폼 열기 / [호출] 새 일기 버튼
  const openCreate = () => {
    setEditTarget(null);
    setForm({ symbol: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [], image: null });
    setFormError('');
    setSelectedTrades([]);
    setShowTagInput(false);
    if (window.innerWidth < 768) setCalOpen(false);
    setMode('form');
  };

  // [용도] 수정 폼 열기 (detail API로 이미지 로드) / [호출] 수정 버튼
  const openEdit = async (journal) => {
    setEditTarget(journal);
    setForm({
      symbol:      journal.symbol       ?? '',
      entryReason: journal.entry_reason ?? '',
      exitReason:  journal.exit_reason  ?? '',
      emotion:     journal.emotion      ?? '',
      memo:        journal.memo         ?? '',
      tagIds:      journal.tags?.map(t => t.id) ?? [],
      image:       null,
    });
    setFormError('');
    // 수정 시 기존 선택 거래 복원
    try {
      setSelectedTrades(journal.trade_refs_json ? JSON.parse(journal.trade_refs_json) : []);
    } catch {
      setSelectedTrades([]);
    }
    setShowTagInput(false);
    if (window.innerWidth < 768) setCalOpen(false);
    setMode('form');

    // 이미지가 있으면 detail API로 실제 이미지 데이터 로드
    if (journal.has_image) {
      try {
        const res = await getJournal(journal.id);
        setForm(p => ({ ...p, image: res.data.image ?? null }));
      } catch { /* ignore */ }
    }
  };

  // [용도] 거래 카드 클릭으로 다중선택 토글 / [호출] trade-ref-card onClick
  // 재클릭 시 해제, 선택된 거래의 고유 종목들을 symbol 필드에 자동 적용
  const toggleTrade = (trade) => {
    setSelectedTrades(prev => {
      const isSelected = prev.some(t => t.id === trade.id);
      const next = isSelected
        ? prev.filter(t => t.id !== trade.id)
        : [...prev, trade];
      // 선택된 거래들의 고유 종목을 쉼표로 join해서 symbol 자동 입력
      const symbols = [...new Set(next.map(t => t.symbol))].join(', ');
      setForm(p => ({ ...p, symbol: symbols }));
      return next;
    });
  };

  // [용도] 일기 저장 (작성/수정) / [호출] 저장 버튼
  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      // 선택된 거래 스냅샷 저장 (id, symbol, side, price, qty, traded_at, exchange)
      const tradeRefs = selectedTrades.map(t => ({
        id: t.id, symbol: t.symbol, side: t.side,
        price: t.price, qty: t.qty, traded_at: t.traded_at, exchange: t.exchange,
      }));
      const payload = {
        trade_date:      selectedDateStr,
        symbol:          form.symbol.trim() || null,
        trade_refs_json: tradeRefs.length > 0 ? JSON.stringify(tradeRefs) : null,
        entry_reason:    form.entryReason.trim() || null,
        exit_reason:     form.exitReason.trim()  || null,
        emotion:         form.emotion            || null,
        memo:            form.memo.trim()        || null,
        image:           form.image              || null,
        tag_ids:         form.tagIds,
      };
      if (editTarget) {
        await updateJournal(editTarget.id, payload);
      } else {
        await createJournal(payload);
      }
      await fetchAll();
      setMode('view');
    } catch {
      setFormError('저장 실패. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // [용도] 일기 삭제 / [호출] 삭제 확인 버튼
  const handleDelete = async (id) => {
    try {
      await deleteJournal(id);
      setDeleteConfirm(null);
      await fetchAll();
    } catch {
      alert('삭제 실패');
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
      setFormError('태그 생성 실패');
    } finally {
      setAddingTag(false);
    }
  };

  const isToday    = (date) => fmtDate(date) === fmtDate(todayDate);
  const isSelected = (date) => fmtDate(date) === selectedDateStr;

  // ── 렌더 ───────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header anim-fade-up">
        <h1 className="page-title">매매 일기</h1>
        {subTab === 'journal' && (
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + 새 일기
          </button>
        )}
      </div>

      {/* 서브탭 */}
      <div className="tabs anim-fade-up" style={{ marginBottom: '20px' }}>
        {[
          { key: 'journal', label: '매매 일기' },
          { key: 'plans',   label: '매매 계획' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`tab${subTab === key ? ' active' : ''}`}
            onClick={() => setSearchParams(key === 'journal' ? {} : { tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 서브탭: 매매 계획 */}
      {subTab === 'plans' && <TradePlanPage embedded />}

      {/* 서브탭: 매매 일기 (기본) */}
      {subTab === 'journal' && (loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">불러오는 중...</p>
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
                placeholder="일기 내용 검색 (진입이유, 청산이유, 메모)..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
            {isSearchActive && (
              <button className="btn btn-ghost btn-xs" onClick={clearSearch} style={{ flexShrink: 0 }}>
                ✕ 초기화
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
              {searching ? '검색 중...' : `검색 결과: ${searchResults.length}건`}
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
              <span>캘린더</span>
              <span>{calOpen ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {calOpen && <>
            {/* 월 네비 */}
            <div className="cal-header" style={{ position: 'relative' }}>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>‹</button>
              <button
                className="cal-month-title-btn"
                onClick={() => { setPickerYear(year); setYearMonthPicker((v) => !v); }}
                title="년/월 빠른 이동"
              >
                {year}년 {MONTHS_KR[month]} ▾
              </button>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>›</button>

              {/* 년/월 빠른 선택 팝업 */}
              {yearMonthPicker && (
                <div className="cal-ym-picker" onClick={(e) => e.stopPropagation()}>
                  {/* 년도 선택 */}
                  <div className="cal-ym-year-row">
                    <button className="cal-nav-btn" onClick={() => setPickerYear((y) => y - 1)}>‹</button>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{pickerYear}년</span>
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
                <div key={d} className={`cal-weekday${d === '일' ? ' sun' : d === '토' ? ' sat' : ''}`}>{d}</div>
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
              <span className="cal-legend"><span className="cal-dot" /> 일기 있음</span>
              <span className="cal-legend today-legend">● 오늘</span>
            </div>

            {/* 이번 달 요약 */}
            <div className="cal-summary">
              <div className="cal-summary-item">
                <span className="cal-summary-num">
                  {journals.filter(j => j.trade_date?.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`).length}
                </span>
                <span className="cal-summary-label">이번달 일기</span>
              </div>
              <div className="cal-summary-item">
                <span className="cal-summary-num">{journals.length}</span>
                <span className="cal-summary-label">전체 일기</span>
              </div>
            </div>
            </>}

          {/* ── AI 시장 요약 패널 ─────────────────── */}
          <div className="ai-summary-panel">
            <div className="ai-summary-header">
              <span className="ai-summary-label">✦ 오늘의 시장 동향</span>
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
                {aiRefreshing ? 'AI가 요약 중입니다...' : '오늘의 요약이 없습니다. ↺ 버튼으로 생성하세요.'}
              </p>
            )}
          </div>
          </div>

          {/* ── 콘텐츠 패널 ──────────────────────────── */}
          <div className="journal-content">
            {/* 헤더: 검색 모드 or 날짜 모드 */}
            {isSearchActive ? (
              <div className="journal-day-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    🔍 검색 결과
                    <span className="count-badge" style={{ marginLeft: '6px' }}>
                      {searchResults.length}건
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
                  {selectedDate.getFullYear()}년&nbsp;
                  {selectedDate.getMonth() + 1}월&nbsp;
                  {selectedDate.getDate()}일
                  {isToday(selectedDate) && <span className="today-badge">오늘</span>}
                  {journalsForDay.length > 0 && (
                    <span className="count-badge">{journalsForDay.length}개</span>
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
                <button className="btn btn-primary btn-xs" onClick={openCreate}>
                  + 이 날 일기 쓰기
                </button>
              ) : (
                <button className="btn btn-ghost btn-xs" onClick={() => setMode('view')}>
                  ✕ 취소
                </button>
              )}
            </div>
            )}

            {/* ── 뷰 모드 ── */}
            {mode === 'view' && !isSearchActive && (
              <div className="form-split">
                {/* 왼쪽: 일기 목록 */}
                <div className="form-split-left">
                {/* 오늘의 매매 계획 (뷰 모드) */}
                {plansForDay.length > 0 && (
                  <div style={{
                    marginBottom: '12px', padding: '10px 12px',
                    background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📋 이 날의 매매 계획
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plansForDay.map(p => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '8px',
                          fontSize: '12px', lineHeight: 1.5,
                          opacity: p.done ? 0.5 : 1,
                        }}>
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
                      이 날 작성한 일기가 없습니다
                    </p>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={openCreate}>
                      + 첫 일기 작성하기
                    </button>
                  </div>
                ) : (
                  journalsForDay.map(journal => (
                    <div key={journal.id} className="journal-card">
                      {/* 상단 메타 (거래 참조, 감정, 시각) */}
                      <div className="journal-card-meta" style={{ flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {(() => {
                          try {
                            const refs = journal.trade_refs_json ? JSON.parse(journal.trade_refs_json) : [];
                            if (refs.length > 0) {
                              return refs.map((t, i) => <TradeRefBadge key={i} ref={t} />);
                            }
                          } catch {}
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
                          <div className="journal-section-label">진입 이유</div>
                          <p className="journal-section-content">{journal.entry_reason}</p>
                        </div>
                      )}
                      {journal.exit_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">청산 이유</div>
                          <p className="journal-section-content">{journal.exit_reason}</p>
                        </div>
                      )}
                      {journal.memo && (
                        <div className="journal-section">
                          <div className="journal-section-label">메모</div>
                          <p className="journal-section-content">{journal.memo}</p>
                        </div>
                      )}

                      {/* 첨부 이미지 (hasImage=true면 detail API로 로드) */}
                      <JournalImageViewer journal={journal} onZoom={setZoomImage} />

                      {/* 수정/삭제 버튼 — 카드 맨 아래 오른쪽 */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(journal)}>수정</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(journal.id)}>삭제</button>
                      </div>
                    </div>
                  ))
                )}
                </div>
                </div>

                {/* 오른쪽: 당일 거래 내역 (읽기 전용) */}
                <div className="form-split-right">
                  <div className="trades-ref-header">
                    <span className="trades-ref-title">당일 거래 내역</span>
                    <span className="mono text-muted" style={{ fontSize: '11px' }}>
                      {tradesForDay.length}건
                    </span>
                  </div>
                  <div className="trades-ref-scroll">
                    {tradesForDay.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p className="text-muted" style={{ fontSize: '13px' }}>이 날 거래 내역이 없습니다</p>
                      </div>
                    ) : (
                      tradesForDay.map(trade => (
                        <div key={trade.id} className="trade-ref-card">
                          <div className="trade-ref-top">
                            <span className={`badge badge-${trade.side.toLowerCase()}`}
                              style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {trade.side === 'BUY' ? '매수' : '매도'}
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
                              <span className="trade-ref-label">가격</span>
                              <span className="mono trade-ref-val">{Number(trade.price).toLocaleString()}</span>
                            </div>
                            <div className="trade-ref-row">
                              <span className="trade-ref-label">수량</span>
                              <span className="mono trade-ref-val">{parseFloat(Number(trade.qty).toFixed(8)).toString()}</span>
                            </div>
                            <div className="trade-ref-row">
                              <span className="trade-ref-label">시각</span>
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
                    <p className="empty-state-title">검색 중...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="empty-state">
                    <span style={{ fontSize: '32px' }}>🔍</span>
                    <p className="text-muted" style={{ fontSize: '14px', marginTop: '8px' }}>
                      검색 결과가 없습니다
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
                              return refs.map((t, i) => <TradeRefBadge key={i} ref={t} />);
                            }
                          } catch {}
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
                          <div className="journal-section-label">진입 이유</div>
                          <p className="journal-section-content">{journal.entry_reason}</p>
                        </div>
                      )}
                      {journal.exit_reason && (
                        <div className="journal-section">
                          <div className="journal-section-label">청산 이유</div>
                          <p className="journal-section-content">{journal.exit_reason}</p>
                        </div>
                      )}
                      {journal.memo && (
                        <div className="journal-section">
                          <div className="journal-section-label">메모</div>
                          <p className="journal-section-content">{journal.memo}</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(journal)}>수정</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(journal.id)}>삭제</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── 폼 모드: 일기 작성 + 거래 내역 ── */}
            {mode === 'form' && (
              <div className="form-split">
                {/* 왼쪽: 작성 폼 */}
                <div className="form-split-left">
                  {/* 오늘의 매매 계획 (해당 날짜) */}
                  {plansForDay.length > 0 && (
                    <div style={{
                      marginBottom: '14px', padding: '10px 12px',
                      background: 'rgba(99,102,241,0.06)', borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📋 이 날의 매매 계획
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {plansForDay.map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            fontSize: '12px', lineHeight: 1.5,
                            opacity: p.done ? 0.5 : 1,
                          }}>
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
                  <div className="form-group">
                    <label className="input-label">종목</label>
                    {/* 선택된 거래 칩 목록 */}
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
                      placeholder="예: KRW-BTC, BTCUSDT  (오른쪽 거래 클릭 시 자동 입력)"
                      value={form.symbol}
                      onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">매매 감정</label>
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
                    <label className="input-label">진입 이유</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="왜 매수/진입했나요?  (오른쪽에서 거래 선택)"
                      value={form.entryReason}
                      onChange={e => setForm(p => ({ ...p, entryReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">청산 이유</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="왜 매도/청산했나요?  (오른쪽에서 거래 선택)"
                      value={form.exitReason}
                      onChange={e => setForm(p => ({ ...p, exitReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="input-label" style={{ margin: 0 }}>전략 태그</label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => { setShowTagInput(v => !v); setNewTagName(''); }}
                      >
                        {showTagInput ? '✕ 닫기' : '+ 새 태그'}
                      </button>
                    </div>
                    <div className="tag-grid">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`tag-btn${form.tagIds.includes(tag.id) ? ' selected' : ''}`}
                          style={{ '--tag-color': tag.color }}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                        </button>
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
                          title="태그 색상"
                        />
                        <input
                          type="text"
                          className="input input-sm"
                          placeholder="태그 이름 입력 후 Enter"
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
                          추가
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="input-label">메모</label>
                    <textarea
                      className="textarea"
                      rows={4}
                      placeholder="반성, 개선할 점, 기타 메모..."
                      value={form.memo}
                      onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                    />
                  </div>

                  {/* 이미지 첨부 */}
                  <div className="form-group">
                    <label className="input-label">사진 첨부</label>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', flexShrink: 0 }}>
                        📷 사진 선택
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const compressed = await compressImage(file);
                              setForm(p => ({ ...p, image: compressed }));
                            } catch {
                              alert('이미지 처리에 실패했습니다.');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {form.image && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={form.image}
                            alt="첨부"
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
                    <button className="btn btn-ghost" onClick={() => setMode('view')}>취소</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? '저장 중...' : editTarget ? '수정 완료' : '일기 저장'}
                    </button>
                  </div>
                </div>

                {/* 오른쪽: 당일 거래 내역 */}
                <div className="form-split-right">
                  <div className="trades-ref-header">
                    <span className="trades-ref-title">당일 거래 내역</span>
                    <span className="mono text-muted" style={{ fontSize: '11px' }}>
                      {tradesForDay.length}건 · 클릭해서 선택 (다중선택 가능)
                    </span>
                  </div>
                  <div className="trades-ref-scroll">
                    {tradesForDay.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p className="text-muted" style={{ fontSize: '13px' }}>이 날 거래 내역이 없습니다</p>
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
                              <span className={`badge badge-${trade.side.toLowerCase()}`}
                                style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.7 }}>
                                {trade.side === 'BUY' ? '매수' : '매도'}
                              </span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                                {trade.symbol}
                              </span>
                            </div>
                            <div className="trade-ref-rows">
                              <div className="trade-ref-row">
                                <span className="trade-ref-label">가격</span>
                                <span className="mono trade-ref-val">
                                  {Number(trade.price).toLocaleString()}
                                </span>
                              </div>
                              <div className="trade-ref-row">
                                <span className="trade-ref-label">수량</span>
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

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">일기 삭제</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)' }}>이 일기를 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>삭제</button>
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
    </div>
  );
};

export default JournalPage;
