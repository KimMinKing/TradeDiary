// [파일 용도] 매매 일기 작성/수정 모달 컴포넌트

import { useState, useEffect } from 'react';
import { createJournal, updateJournal, createStrategyTag } from '../api/journalApi';

// 감정 선택지
const EMOTIONS = [
  { value: 'CALM',      label: '😌 냉정' },
  { value: 'CONFIDENT', label: '💪 확신' },
  { value: 'FOMO',      label: '😰 FOMO' },
  { value: 'GREEDY',    label: '🤑 욕심' },
  { value: 'FEARFUL',   label: '😨 공포' },
  { value: 'ANXIOUS',   label: '😟 불안' },
];

// [컴포넌트] 일기 작성/수정 모달 / [호출] JournalPage.jsx
const JournalFormModal = ({ journal, tags, onClose, onSaved }) => {
  const isEdit = !!journal;

  const [form, setForm] = useState({
    symbol:      journal?.symbol      ?? '',
    entryReason: journal?.entry_reason ?? '',
    exitReason:  journal?.exit_reason  ?? '',
    emotion:     journal?.emotion      ?? '',
    memo:        journal?.memo         ?? '',
    tagIds:      journal?.tags?.map((t) => t.id) ?? [],
  });

  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [newTagName, setNewTagName]   = useState('');
  const [newTagColor, setNewTagColor] = useState('#00d4aa');
  const [allTags, setAllTags]         = useState(tags ?? []);
  const [addingTag, setAddingTag]     = useState(false);

  useEffect(() => {
    setAllTags(tags ?? []);
  }, [tags]);

  // [용도] 폼 필드 변경 / [호출] 각 input onChange
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // [용도] 태그 선택/해제 토글 / [호출] 태그 버튼 클릭
  const toggleTag = (id) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((t) => t !== id)
        : [...prev.tagIds, id],
    }));
  };

  // [용도] 새 커스텀 태그 생성 후 즉시 선택 / [호출] 태그 추가 버튼
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const res = await createStrategyTag(newTagName.trim(), newTagColor);
      const created = res.data;
      setAllTags((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, created.id] }));
      setNewTagName('');
    } catch {
      setError('태그 생성 실패');
    } finally {
      setAddingTag(false);
    }
  };

  // [용도] 일기 저장 (작성/수정) / [호출] 저장 버튼
  const handleSubmit = async () => {
    if (!form.symbol.trim() && !form.entryReason.trim()) {
      setError('종목명 또는 진입 이유를 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        symbol:       form.symbol.trim() || null,
        entry_reason: form.entryReason.trim() || null,
        exit_reason:  form.exitReason.trim()  || null,
        emotion:      form.emotion            || null,
        memo:         form.memo.trim()        || null,
        tag_ids:      form.tagIds,
      };
      if (isEdit) {
        await updateJournal(journal.id, payload);
      } else {
        await createJournal(payload);
      }
      onSaved();
    } catch {
      setError('저장 실패. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '일기 수정' : '새 매매 일기'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* 종목 */}
          <div className="form-group">
            <label className="input-label">종목</label>
            <input
              type="text"
              className="input"
              placeholder="예: BTC-KRW, BTCUSDT"
              value={form.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
            />
          </div>

          {/* 감정 선택 */}
          <div className="form-group">
            <label className="input-label">매매 감정</label>
            <div className="emotion-grid">
              {EMOTIONS.map((em) => (
                <button
                  key={em.value}
                  type="button"
                  className={`emotion-btn${form.emotion === em.value ? ' selected' : ''}`}
                  onClick={() => handleChange('emotion', form.emotion === em.value ? '' : em.value)}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>

          {/* 진입 이유 */}
          <div className="form-group">
            <label className="input-label">진입 이유</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="왜 매수/진입했나요?"
              value={form.entryReason}
              onChange={(e) => handleChange('entryReason', e.target.value)}
            />
          </div>

          {/* 청산 이유 */}
          <div className="form-group">
            <label className="input-label">청산 이유</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="왜 매도/청산했나요?"
              value={form.exitReason}
              onChange={(e) => handleChange('exitReason', e.target.value)}
            />
          </div>

          {/* 전략 태그 */}
          <div className="form-group">
            <label className="input-label">전략 태그</label>
            <div className="tag-grid">
              {allTags.map((tag) => (
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
            {/* 새 태그 추가 */}
            <div className="tag-add-row">
              <input
                type="color"
                className="color-picker"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                title="태그 색상"
              />
              <input
                type="text"
                className="input input-sm"
                placeholder="새 태그 이름"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
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

          {/* 자유 메모 */}
          <div className="form-group">
            <label className="input-label">메모</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="반성, 개선할 점, 기타 메모..."
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
            />
          </div>

          {error && <p className="msg-error">{error}</p>}
        </div>

        {/* 푸터 */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '일기 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalFormModal;
