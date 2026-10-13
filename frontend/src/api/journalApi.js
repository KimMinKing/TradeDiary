// [파일 용도] Trading journal 및 전략 태그 API 호출

import api from './authApi';

// ── 전략 태그 ─────────────────────────────────────────

// [용도] 기본 + 커스텀 태그 목록 조회 / [호출] JournalPage.jsx, JournalFormModal.jsx
export const getStrategyTags = () =>
  api.get('/api/strategy-tags');

// [용도] 커스텀 태그 생성 / [호출] JournalFormModal.jsx
export const createStrategyTag = (name, color) =>
  api.post('/api/strategy-tags', { name, color });

// [용도] 커스텀 태그 Delete / [호출] JournalPage.jsx
export const deleteStrategyTag = (id) =>
  api.delete(`/api/strategy-tags/${id}`);

// ── Trading journal ─────────────────────────────────────────

// [용도] Journal 목록 조회 (hasImage boolean만 포함) / [호출] JournalPage.jsx
export const getJournals = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, item);
        }
      });
      return;
    }

    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  return api.get(query ? `/api/journals?${query}` : '/api/journals');
};

// [용도] Journal 단 조회 (이미지 data 포함) / [호출] JournalPage.jsx (이미지 로드 시)
export const getJournal = (id) =>
  api.get(`/api/journals/${id}`);

// [용도] Journal 작성 / [호출] JournalFormModal.jsx
export const createJournal = (data) =>
  api.post('/api/journals', data);

// [용도] Journal Edit / [호출] JournalFormModal.jsx
export const updateJournal = (id, data) =>
  api.put(`/api/journals/${id}`, data);

// [용도] Journal Delete / [호출] JournalPage.jsx
export const deleteJournal = (id) =>
  api.delete(`/api/journals/${id}`);

// [용도] 감정 트렌드 data 조회 / [호출] StatsPage.jsx
export const getEmotionTimeline = (params = {}) =>
  api.get('/api/journals/emotion-timeline', { params });

// ── 체크리스트 ─────────────────────────────────────────

// [용도] 체크리스트 항목 목록 조회 (카테고리별) / [호출] JournalPage.jsx
export const getChecklist = () =>
  api.get('/api/checklist');

// [용도] 체크리스트 항목 카테고리별 조회 / [호출] JournalPage.jsx
export const getChecklistByCategory = () =>
  api.get('/api/checklist/categories');

// [용도] 커스텀 체크리스트 항목 생성 / [호출] JournalPage.jsx
export const createChecklistItem = (category, content) =>
  api.post('/api/checklist', { category, content });

// [용도] 커스텀 체크리스트 항목 Delete / [호출] JournalPage.jsx
export const deleteChecklistItem = (id) =>
  api.delete(`/api/checklist/${id}`);

// [용도] 별 Journal AI 피드백 생성 / [호출] JournalPage.jsx
export const getJournalFeedback = (id, refresh = false) =>
  api.post(`/api/journals/${id}/ai-feedback`, null, { params: { refresh } });

// [용도] 기간별 AI 리뷰 생성 / [호출] JournalPage.jsx
export const getPeriodReview = (period, from, to) =>
  api.post('/api/journals/period-review', { period, from, to });

// [용도] 최근 1주일 Trade 요약 AI 리뷰 생성 / [호출] JournalPage.jsx
export const getWeeklyReview = () =>
  api.post('/api/journals/weekly-review');

export const getPlanFeedback = (data) =>
  api.post('/api/journals/plan-review', data);

// ── AI challenge ─────────────────────────────────────────

// [용도] AI 챌린지 세션 시작 / [호출] AIChallenge.jsx, TradePage.jsx
export const startAichallenge = (data) =>
  api.post('/api/journal/ai-challenge/start', data);

// [용도] AI 챌린지 Question 응답 / [호출] AIChallenge.jsx
export const respondToChallenge = (sessionId, questionId, response) =>
  api.post('/api/journal/ai-challenge/respond', {
    session_id: sessionId,
    question_id: questionId,
    response: response
  });

// [용도] AI 챌린지 complete / [호출] AIChallenge.jsx
export const completeAichallenge = (sessionId, responses) =>
  api.post('/api/journal/ai-challenge/complete', {
    session_id: sessionId,
    responses: responses
  });

// ── 감정 analysis ─────────────────────────────────────────

// [용도] 매매Journal 감정 analysis / [호출] JournalForm.jsx
export const analyzeEmotion = (data) =>
  api.post('/api/journal/emotion/analyze', data);

// ── 게임화 ─────────────────────────────────────────

// [용도] 사용자 게임화 점수 조회 / [호출] StatsPage.jsx, ProfilePage.jsx
export const getUserScore = (userId) =>
  api.get(`/api/game/score/${userId}`);

// [용도] 사용자 점수 업데이트 / [호출] TradePage.jsx
export const updateUserScore = (userId, data) =>
  api.post(`/api/game/score/update/${userId}`, data);

// [용도] 사용자 업정 목록 조회 / [호출] ProfilePage.jsx
export const getUserAchievements = (userId) =>
  api.get(`/api/game/achievements/${userId}`);

// [용도] 리더보드 조회 / [호출] StatsPage.jsx
export const getLeaderboard = (limit = 10) =>
  api.get(`/api/game/leaderboard?limit=${limit}`);

// ── 차트 analysis ─────────────────────────────────────────

// [용도] 차트 patterns analysis / [호출] ChartPage.jsx
export const analyzeChart = (data) =>
  api.post('/api/chart/analyze', data);

// [용도] 차트 업로드 및 analysis / [호출] ChartPage.jsx
export const uploadAndAnalyzeChart = (file, symbol) => {
  const formData = new FormData();
  formData.append('file', file);
  if (symbol) formData.append('symbol', symbol);
  return api.post('/api/chart/upload-and-analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// [용도] 사용 가능한 patterns 목록 조회 / [호출] ChartPage.jsx
export const getAvailablePatterns = () =>
  api.get('/api/chart/patterns');

// [용도] 사용자 신호 이력 조회 / [호출] ChartPage.jsx
export const getSignalHistory = (userId, limit = 50) =>
  api.get(`/api/chart/signal-history/${userId}?limit=${limit}`);
