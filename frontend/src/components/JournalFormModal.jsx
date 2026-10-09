// [파일 용도] Trading journal 작성/Edit 모달 컴포넌트

import { useState, useEffect } from 'react';
import { createJournal, updateJournal, createStrategyTag } from '../api/journalApi';

// 감정 선택지
const EMOTIONS = [
  { value: 'CALM',      label: '😌 Calm' },
  { value: 'CONFIDENT', label: '💪 Confident' },
  { value: 'GREEDY',    label: '🤑 Greedy' },
  { value: 'FEARFUL',   label: '😨 Fearful' },
  { value: 'ANXIOUS',   label: '😟 Anxious' },
];

const EMOTION_HELP = {
  CALM: 'Calm: decisions followed the plan without emotional interference.',
  CONFIDENT: 'Confident: entry and exit decisions were supported by clear evidence.',
  GREEDY: 'Greedy: the desire for a larger gain began to influence the decision.',
  FEARFUL: 'Fearful: loss avoidance made the decision more hesitant.',
  ANXIOUS: 'Anxious: uncertainty repeatedly affected conviction.',
};

// [컴포넌트] Journal 작성/Edit 모달 / [호출] JournalPage.jsx
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
  const [addingTag, setAddingTag]     = useState(false);
  const [allTags, setAllTags]         = useState(tags ?? []);

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

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name || addingTag) return;

    setAddingTag(true);
    setError('');
    try {
      const response = await createStrategyTag(name, newTagColor);
      const createdTag = response.data;
      setAllTags((prev) => [...prev, createdTag]);
      setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, createdTag.id] }));
      setNewTagName('');
    } catch {
      setError('Could not add the tag.');
    } finally {
      setAddingTag(false);
    }
  };

  // [용도] Journal Save (작성/Edit) / [호출] Save 버튼
  const handleSubmit = async () => {
    if (!form.symbol.trim() && !form.entryReason.trim()) {
      setError('Enter a symbol and an entry reason.');
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
      setError('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit journal' : 'New journal'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Symbol */}
          <div className="form-group">
            <label className="input-label">Symbol</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. BTC-KRW, BTCUSDT"
              value={form.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
            />
          </div>

          {/* 감정 선택 */}
          <div className="form-group">
            <label className="input-label">Trading emotion</label>
            <div className="emotion-grid">
              {EMOTIONS.map((em) => (
                <button
                  key={em.value}
                  type="button"
                  className={`emotion-btn${form.emotion === em.value ? ' selected' : ''}`}
                  onClick={() => handleChange('emotion', form.emotion === em.value ? '' : em.value)}
                  title={EMOTION_HELP[em.value]}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entry 이유 */}
          <div className="form-group">
            <label className="input-label">Entry reason</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Why did you enter?"
              value={form.entryReason}
              onChange={(e) => handleChange('entryReason', e.target.value)}
            />
          </div>

          {/* Exit 이유 */}
          <div className="form-group">
            <label className="input-label">Exit reason</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Why did you exit?"
              value={form.exitReason}
              onChange={(e) => handleChange('exitReason', e.target.value)}
            />
          </div>

          {/* 전략 태그 */}
          <div className="form-group">
            <label className="input-label">{"\uC804\uB7B5 \uD0DC\uADF8"}</label>
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
            <div className="tag-add-panel">
              <div className="tag-add-row">
                <input
                  type="color"
                  className="color-picker"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  title={"\uC0C9\uC0C1 \uC120\uD0DD"}
                />
                <input
                  type="text"
                  className="input input-sm tag-add-input"
                  placeholder={"\uC0C8 \uD0DC\uADF8 \uC774\uB984"}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm tag-add-btn"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagName.trim()}
                >
                  {"\uFF0B \uCD94\uAC00"}
                </button>
              </div>
            </div>
          </div>

          {/* 자유 메모 */}
          <div className="form-group">
            <label className="input-label">Notes</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Reflections, improvements, and other notes..."
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
            />
          </div>

          {error && <p className="msg-error">{error}</p>}
        </div>

        {/* 푸터 */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Edit complete' : 'Journal Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalFormModal;
