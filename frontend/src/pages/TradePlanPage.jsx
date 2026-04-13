// [파일 용도] 매매 계획 메모 페이지 (거래 전 작성하는 계획/체크리스트)

import { useState, useEffect } from 'react';
import { getPlans, createPlan, updatePlan, togglePlanDone, deletePlan } from '../api/exchangeApi';

const DIRECTIONS = [
  { value: '', label: '방향 미정' },
  { value: 'LONG', label: '▲ LONG' },
  { value: 'SHORT', label: '▼ SHORT' },
];

const TODAY = new Date().toISOString().slice(0, 10);

// [용도] 날짜 기준 그룹핑 / [호출] 렌더
const groupByDate = (plans) => {
  const groups = {};
  plans.forEach(p => {
    if (!groups[p.plan_date]) groups[p.plan_date] = [];
    groups[p.plan_date].push(p);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
};

// [용도] 날짜 포맷 (YYYY-MM-DD → M월 D일 (요일)) / [호출] 렌더
const fmtDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
};

const EMPTY_FORM = { planDate: TODAY, symbol: '', direction: '', content: '' };

// [컴포넌트] 매매 계획 메모 페이지 / [호출] App.jsx 라우터
const TradePlanPage = () => {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [editId,  setEditId]  = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'active' | 'done'

  useEffect(() => { fetchPlans(); }, []);

  // [용도] 계획 목록 조회 / [호출] useEffect
  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      setPlans(res.data);
    } catch (e) {
      console.error('계획 조회 실패', e);
    } finally {
      setLoading(false);
    }
  };

  // [용도] 계획 저장 (생성 or 수정) / [호출] 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    try {
      const payload = {
        plan_date: form.planDate,
        symbol: form.symbol || null,
        direction: form.direction || null,
        content: form.content,
      };
      if (editId) {
        const res = await updatePlan(editId, payload);
        setPlans(prev => prev.map(p => p.id === editId ? res.data : p));
      } else {
        const res = await createPlan(payload);
        setPlans(prev => [res.data, ...prev]);
      }
      resetForm();
    } catch (e) {
      console.error('저장 실패', e);
    }
  };

  // [용도] 완료 토글 / [호출] 체크 버튼
  const handleToggle = async (id) => {
    try {
      const res = await togglePlanDone(id);
      setPlans(prev => prev.map(p => p.id === id ? res.data : p));
    } catch (e) { console.error(e); }
  };

  // [용도] 삭제 / [호출] 삭제 버튼
  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error(e); }
  };

  // [용도] 수정 폼 열기 / [호출] 수정 버튼
  const handleEdit = (plan) => {
    setForm({
      planDate:  plan.plan_date,
      symbol:    plan.symbol || '',
      direction: plan.direction || '',
      content:   plan.content,
    });
    setEditId(plan.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const filtered = plans.filter(p =>
    filter === 'all' ? true : filter === 'done' ? p.done : !p.done
  );
  const grouped = groupByDate(filtered);

  const total  = plans.length;
  const done   = plans.filter(p => p.done).length;
  const active = total - done;

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="page-header anim-fade-up">
        <div>
          <h1 className="page-title">매매 계획</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '4px' }}>
            거래 전 계획을 작성하고 실행 여부를 체크하세요
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { resetForm(); setShowForm(v => !v); }}
        >
          {showForm && !editId ? '닫기' : '+ 새 계획'}
        </button>
      </div>

      {/* 요약 바 */}
      {total > 0 && (
        <div className="anim-fade-up" style={{
          display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
        }}>
          {[
            { key: 'all',    label: `전체 ${total}` },
            { key: 'active', label: `미완료 ${active}`, color: '#f87171' },
            { key: 'done',   label: `완료 ${done}`, color: '#60a5fa' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '4px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
              border: filter === f.key ? `1px solid ${f.color || 'var(--accent)'}` : '1px solid var(--border)',
              background: filter === f.key ? `${f.color || 'var(--accent)'}18` : 'transparent',
              color: filter === f.key ? (f.color || 'var(--accent)') : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* 작성 폼 */}
      {showForm && (
        <div className="card anim-fade-up" style={{ marginBottom: '24px', padding: '20px' }}>
          <div className="card-title" style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
            {editId ? '계획 수정' : '새 계획 작성'}
          </div>
          <form onSubmit={handleSubmit}>
            {/* 날짜 + 종목 + 방향 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="input"
                style={{ flex: '0 0 150px' }}
                value={form.planDate}
                onChange={e => setForm(f => ({ ...f, planDate: e.target.value }))}
              />
              <input
                type="text"
                className="input"
                style={{ flex: '0 0 120px' }}
                placeholder="종목 (선택)"
                value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
              />
              <select
                className="input"
                style={{ flex: '0 0 120px' }}
                value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
              >
                {DIRECTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* 계획 내용 */}
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder="진입 근거, 목표가, 손절가, 포지션 크기 등 계획을 자유롭게 작성하세요"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm" onClick={resetForm} style={{
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              }}>취소</button>
              <button type="submit" className="btn btn-primary btn-sm">
                {editId ? '수정 완료' : '계획 저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="empty-state">
          <p className="empty-state-title">불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state anim-fade-up">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-title">
            {filter === 'done' ? '완료된 계획이 없습니다' :
             filter === 'active' ? '미완료 계획이 없습니다' : '작성된 계획이 없습니다'}
          </p>
          <p className="empty-state-desc">
            거래 전 계획을 작성하면 실행 여부를 추적하고<br />
            일기와 함께 패턴을 분석할 수 있습니다
          </p>
          {filter === 'all' && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}
              onClick={() => setShowForm(true)}>
              + 첫 계획 작성하기
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {grouped.map(([date, group]) => (
            <div key={date} className="anim-fade-up2">
              {/* 날짜 헤더 */}
              <div style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
                marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span>{fmtDate(date)}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {group.filter(p => p.done).length}/{group.length} 완료
                </span>
              </div>

              {/* 계획 카드들 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.map(plan => (
                  <div key={plan.id} className="card" style={{
                    padding: '14px 16px',
                    opacity: plan.done ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                    borderLeft: `3px solid ${plan.done ? 'var(--border)' : plan.direction === 'LONG' ? '#f87171' : plan.direction === 'SHORT' ? '#60a5fa' : 'var(--accent)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* 완료 체크 버튼 */}
                      <button
                        onClick={() => handleToggle(plan.id)}
                        style={{
                          flexShrink: 0, marginTop: '2px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          border: `2px solid ${plan.done ? '#60a5fa' : 'var(--border)'}`,
                          background: plan.done ? '#60a5fa18' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: plan.done ? '#60a5fa' : 'transparent', fontSize: '11px',
                          transition: 'all 0.15s',
                        }}
                      >✓</button>

                      {/* 내용 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 배지 행 */}
                        {(plan.symbol || plan.direction) && (
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            {plan.symbol && (
                              <span className="mono" style={{
                                fontSize: '12px', fontWeight: 700,
                                color: plan.direction === 'LONG' ? '#f87171' : plan.direction === 'SHORT' ? '#60a5fa' : 'var(--text)',
                              }}>{plan.symbol}</span>
                            )}
                            {plan.direction && (
                              <span style={{
                                fontSize: '11px', padding: '1px 7px', borderRadius: '4px',
                                background: plan.direction === 'LONG' ? '#f8717118' : '#60a5fa18',
                                color: plan.direction === 'LONG' ? '#f87171' : '#60a5fa',
                                border: `1px solid ${plan.direction === 'LONG' ? '#f8717140' : '#60a5fa40'}`,
                              }}>
                                {plan.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 계획 텍스트 */}
                        <p style={{
                          fontSize: '14px', lineHeight: 1.65,
                          color: plan.done ? 'var(--text-muted)' : 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          textDecoration: plan.done ? 'line-through' : 'none',
                        }}>{plan.content}</p>
                      </div>

                      {/* 액션 버튼 */}
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => handleEdit(plan)} style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-muted)', transition: 'all 0.15s',
                        }}>수정</button>
                        <button onClick={() => handleDelete(plan.id)} style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                          border: '1px solid rgba(248,113,113,0.3)', background: 'transparent',
                          color: '#f87171', transition: 'all 0.15s',
                        }}>삭제</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TradePlanPage;
