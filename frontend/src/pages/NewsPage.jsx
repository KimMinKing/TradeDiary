// [파일 용도] 코인 뉴스 페이지 (CryptoCompare API 기반, 60초 자동 갱신)

import { useState, useEffect, useCallback } from 'react';
import { getNews } from '../api/newsApi';

const CATEGORIES = [
  { value: 'all',        label: '전체' },
  { value: 'bitcoin',    label: '₿ 비트코인' },
  { value: 'ethereum',   label: '⟠ 이더리움' },
  { value: 'altcoin',    label: '🪙 알트코인' },
  { value: 'market',     label: '📈 시장' },
  { value: 'trading',    label: '💹 트레이딩' },
  { value: 'regulation', label: '⚖️ 규제' },
  { value: 'mining',     label: '⛏️ 채굴' },
];

const SORT_OPTIONS = [
  { value: 'latest',  label: '최신순' },
  { value: 'popular', label: '인기순' },
];

// [용도] Unix 타임스탬프를 "N분 전 / N시간 전 / N일 전" 형식으로 변환 / [호출] NewsPage 렌더링
const timeAgo = (unixTs) => {
  const diff = Date.now() - unixTs * 1000;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return '방금 전';
  if (mins  < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

// [용도] categories 문자열에서 표시용 태그 배열 추출 / [호출] 카드 렌더링
const parseTags = (categoriesStr) => {
  if (!categoriesStr) return [];
  return categoriesStr.split('|').filter(Boolean).slice(0, 4);
};

// [컴포넌트] 코인 뉴스 페이지 / [호출] App.jsx 라우터
const NewsPage = () => {
  const [category,   setCategory]   = useState('all');
  const [sortOrder,  setSortOrder]  = useState('latest');
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastFetch,  setLastFetch]  = useState(null);

  // [용도] 뉴스 데이터 fetch / [호출] 카테고리·정렬 변경, 60초 폴링
  const fetchNews = useCallback(async (cat, sort) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNews(cat, sort);
      // JsonNode로 반환되므로 키 변환 없이 원본 Data 배열 그대로
      const rawData = res.data?.Data;
      setPosts(Array.isArray(rawData) ? rawData : []);
      setLastFetch(new Date());
    } catch {
      setError('뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(category, sortOrder);
  }, [category, sortOrder, fetchNews]);

  // [용도] 60초마다 최신 뉴스 자동 갱신 / [호출] 마운트 후 인터벌
  useEffect(() => {
    const id = setInterval(() => fetchNews(category, sortOrder), 60000);
    return () => clearInterval(id);
  }, [category, sortOrder, fetchNews]);

  return (
    <div className="page">
      {/* ── 헤더 ── */}
      <div className="news-header">
        <div>
          <h1 className="news-title">코인 뉴스</h1>
          {lastFetch && (
            <span className="news-last-update">
              마지막 갱신: {lastFetch.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`news-filter-btn${sortOrder === opt.value ? ' active' : ''}`}
              onClick={() => setSortOrder(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          <div className="news-live-badge">● LIVE</div>
        </div>
      </div>

      {/* ── 카테고리 필터 ── */}
      <div className="news-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`news-filter-btn${category === c.value ? ' active' : ''}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── 뉴스 목록 ── */}
      {loading ? (
        <div className="news-loading">
          <div className="news-spinner" />
          <span>뉴스 불러오는 중…</span>
        </div>
      ) : error ? (
        <div className="news-error">{error}</div>
      ) : posts.length === 0 ? (
        <div className="news-empty">뉴스가 없습니다.</div>
      ) : (
        <div className="news-list">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-card"
            >
              <div className="news-card-top">
                <span className="news-source">{post.source_info?.name || post.source}</span>
                <span className="news-time">{timeAgo(post.published_on)}</span>
              </div>
              <div className="news-card-title">{post.title}</div>
              {post.body && (
                <div className="news-card-body">{post.body.slice(0, 120)}{post.body.length > 120 ? '…' : ''}</div>
              )}
              {post.categories && (
                <div className="news-currencies">
                  {parseTags(post.categories).map((tag) => (
                    <span key={tag} className="news-currency-tag">{tag}</span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsPage;
