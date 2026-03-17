// [파일 용도] 매매 일기 페이지 (캘린더 뷰 + 일기 작성/거래 내역 분할 패널)

import { useState, useEffect } from 'react';
import {
  getJournals, deleteJournal, getStrategyTags,
  createJournal, updateJournal, createStrategyTag,
} from '../api/journalApi';
import { getTrades } from '../api/exchangeApi';

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

// [컴포넌트] 매매 일기 메인 페이지 / [호출] App.jsx 라우터
const JournalPage = () => {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [journals,     setJournals]     = useState([]);
  const [trades,       setTrades]       = useState([]);
  const [tags,         setTags]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [mode,         setMode]         = useState('view'); // 'view' | 'form'
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 폼 상태
  const [form, setForm] = useState({
    symbol: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [],
  });
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');
  const [newTagName,  setNewTagName]  = useState('');
  const [newTagColor, setNewTagColor] = useState('#00d4aa');
  const [addingTag,   setAddingTag]   = useState(false);

  useEffect(() => { fetchAll(); }, []);

  // [용도] 일기/태그/거래 전체 조회 / [호출] useEffect, 저장/삭제 후
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [jRes, tgRes, trRes] = await Promise.all([
        getJournals(), getStrategyTags(), getTrades(),
      ]);
      setJournals(jRes.data);
      setTags(tgRes.data);
      setTrades(trRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── 파생 데이터 ────────────────────────────────
  const selectedDateStr   = fmtDate(selectedDate);
  const journalDateSet    = new Set(journals.map(j => j.created_at?.slice(0, 10)));
  const journalsForDay    = journals.filter(j => j.created_at?.slice(0, 10) === selectedDateStr);
  const tradesForDay      = trades.filter(t => t.traded_at?.slice(0, 10) === selectedDateStr);

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
    setForm({ symbol: '', entryReason: '', exitReason: '', emotion: '', memo: '', tagIds: [] });
    setFormError('');
    setMode('form');
  };

  // [용도] 수정 폼 열기 / [호출] 수정 버튼
  const openEdit = (journal) => {
    setEditTarget(journal);
    setForm({
      symbol:      journal.symbol       ?? '',
      entryReason: journal.entry_reason ?? '',
      exitReason:  journal.exit_reason  ?? '',
      emotion:     journal.emotion      ?? '',
      memo:        journal.memo         ?? '',
      tagIds:      journal.tags?.map(t => t.id) ?? [],
    });
    setFormError('');
    setMode('form');
  };

  // [용도] 일기 저장 (작성/수정) / [호출] 저장 버튼
  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        symbol:       form.symbol.trim()      || null,
        entry_reason: form.entryReason.trim() || null,
        exit_reason:  form.exitReason.trim()  || null,
        emotion:      form.emotion            || null,
        memo:         form.memo.trim()        || null,
        tag_ids:      form.tagIds,
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
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          + 새 일기
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ animation: 'spin 1s linear infinite' }}>◌</div>
          <p className="empty-state-title">불러오는 중...</p>
        </div>
      ) : (
        <div className="journal-page-layout anim-fade-up2">

          {/* ── 캘린더 패널 ─────────────────────────── */}
          <div className="cal-panel">
            {/* 월 네비 */}
            <div className="cal-header">
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>‹</button>
              <span className="cal-month-title">{year}년 {MONTHS_KR[month]}</span>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>›</button>
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
                const dotCount   = journals.filter(j => j.created_at?.slice(0, 10) === ds).length;

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
                  {journals.filter(j => j.created_at?.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`).length}
                </span>
                <span className="cal-summary-label">이번달 일기</span>
              </div>
              <div className="cal-summary-item">
                <span className="cal-summary-num">{journals.length}</span>
                <span className="cal-summary-label">전체 일기</span>
              </div>
            </div>
          </div>

          {/* ── 콘텐츠 패널 ──────────────────────────── */}
          <div className="journal-content">
            {/* 날짜 헤더 */}
            <div className="journal-day-header">
              <div className="journal-day-label">
                {selectedDate.getFullYear()}년&nbsp;
                {selectedDate.getMonth() + 1}월&nbsp;
                {selectedDate.getDate()}일
                {isToday(selectedDate) && <span className="today-badge">오늘</span>}
                {journalsForDay.length > 0 && (
                  <span className="count-badge">{journalsForDay.length}개</span>
                )}
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

            {/* ── 뷰 모드: 일기 목록 ── */}
            {mode === 'view' && (
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
                      <div className="journal-card-header">
                        <div className="journal-card-meta">
                          {journal.symbol && <span className="journal-symbol">{journal.symbol}</span>}
                          {journal.emotion && (
                            <span className="journal-emotion">{EMOTION_LABEL[journal.emotion]}</span>
                          )}
                          <span className="mono text-muted" style={{ fontSize: '11px' }}>
                            {journal.created_at?.slice(11, 16)}
                          </span>
                        </div>
                        <div className="journal-card-actions">
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(journal)}>수정</button>
                          <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(journal.id)}>삭제</button>
                        </div>
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
                  <div className="form-group">
                    <label className="input-label">종목</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="예: BTC-KRW, BTCUSDT"
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
                      placeholder="왜 매수/진입했나요?"
                      value={form.entryReason}
                      onChange={e => setForm(p => ({ ...p, entryReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">청산 이유</label>
                    <textarea
                      className="textarea"
                      rows={3}
                      placeholder="왜 매도/청산했나요?"
                      value={form.exitReason}
                      onChange={e => setForm(p => ({ ...p, exitReason: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">전략 태그</label>
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
                    <div className="tag-add-row">
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
                        placeholder="새 태그 이름"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleAddTag}
                        disabled={addingTag || !newTagName.trim()}
                      >
                        + 추가
                      </button>
                    </div>
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
                            <span className={`badge badge-${trade.exchange.toLowerCase()}`}
                              style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {trade.exchange}
                            </span>
                            <span className={`badge badge-${trade.side.toLowerCase()}`}
                              style={{ fontSize: '10px', padding: '2px 6px' }}>
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
                                {Number(trade.qty).toLocaleString()}
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default JournalPage;
