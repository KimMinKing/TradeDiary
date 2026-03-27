// [파일 용도] 코인 뉴스 API 호출 (백엔드 CryptoPanic 프록시)

import api from './authApi';

// [용도] 뉴스 목록 조회 / [호출] NewsPage.jsx
// filter: 'hot' | 'rising' | 'bullish' | 'bearish' | 'important'
export const getNews = (filter = 'hot', page = 1) =>
  api.get('/api/news', { params: { filter, page } });
