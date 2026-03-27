// [파일 용도] 코인 뉴스 API 호출 (백엔드 CryptoCompare 프록시)

import api from './authApi';

// [용도] 뉴스 목록 조회 / [호출] NewsPage.jsx
// category: 'all' | 'bitcoin' | 'ethereum' | 'altcoin' | 'market' | 'trading' | 'regulation' | 'mining'
// sortOrder: 'latest' | 'popular'
export const getNews = (category = 'all', sortOrder = 'latest') =>
  api.get('/api/news', { params: { category, sortOrder } });
