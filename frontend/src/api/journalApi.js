// [파일 용도] 매매 일기 및 전략 태그 API 호출

import api from './authApi';

// ── 전략 태그 ─────────────────────────────────────────

// [용도] 기본 + 커스텀 태그 목록 조회 / [호출] JournalPage.jsx, JournalFormModal.jsx
export const getStrategyTags = () =>
  api.get('/api/strategy-tags');

// [용도] 커스텀 태그 생성 / [호출] JournalFormModal.jsx
export const createStrategyTag = (name, color) =>
  api.post('/api/strategy-tags', { name, color });

// [용도] 커스텀 태그 삭제 / [호출] JournalPage.jsx
export const deleteStrategyTag = (id) =>
  api.delete(`/api/strategy-tags/${id}`);

// ── 매매 일기 ─────────────────────────────────────────

// [용도] 일기 목록 조회 (hasImage boolean만 포함) / [호출] JournalPage.jsx
export const getJournals = (params = {}) =>
  api.get('/api/journals', { params });

// [용도] 일기 단건 조회 (이미지 데이터 포함) / [호출] JournalPage.jsx (이미지 로드 시)
export const getJournal = (id) =>
  api.get(`/api/journals/${id}`);

// [용도] 일기 작성 / [호출] JournalFormModal.jsx
export const createJournal = (data) =>
  api.post('/api/journals', data);

// [용도] 일기 수정 / [호출] JournalFormModal.jsx
export const updateJournal = (id, data) =>
  api.put(`/api/journals/${id}`, data);

// [용도] 일기 삭제 / [호출] JournalPage.jsx
export const deleteJournal = (id) =>
  api.delete(`/api/journals/${id}`);
