// [파일 용도] 코인 뉴스 API 호출 (원문 기사 조회, AI 일별 요약)

import api from './authApi';

// [용도] CryptoCompare 원문 영어 기사 목록 조회 / [호출] NewsPage.jsx
export const getNews = (category = 'all') =>
  api.get('/api/news', { params: { category } });

// [용도] 오늘의 AI 시장 요약 조회 / [호출] JournalPage.jsx, NewsPage.jsx
export const getNewsSummary = () =>
  api.get('/api/news/summary');

// [용도] 오늘 요약 강제 재생성 요청 / [호출] JournalPage.jsx
export const refreshNewsSummary = () =>
  api.post('/api/news/summary/refresh');
