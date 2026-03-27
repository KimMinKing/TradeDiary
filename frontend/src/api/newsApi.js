// [파일 용도] 코인 뉴스 API 호출 (DB 저장된 번역 기사 조회)

import api from './authApi';

// [용도] 번역된 뉴스 목록 조회 / [호출] NewsPage.jsx
export const getNews = (category = 'all', page = 0, size = 30) =>
  api.get('/api/news', { params: { category, page, size } });
