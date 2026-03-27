// [파일 용도] 코인 뉴스 페이지 (Gemini 번역+요약, DB 기반, 5분 자동 갱신)

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

// [용도] ISO 날짜 문자열을 "N분 전 / N시간 전 / N일 전" 형식으로 변환 / [호출] 카드 렌더링
const timeAgo = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return '방금 전';
  if (mins  < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

// [용도] categories 파이프 구분 문자열에서 태그 배열 추출 / [호출] 카드 렌더링
const parseTags = (str) => {
  if (!str) return [];
  return str.split('|').filter(Boolean).slice(0, 4);
};

// [컴포넌트] 코인 뉴스 페이지 / [호출] App.jsx 라우터
const NewsPage = () => {
  const [category,  setCategory]  = useState('all');
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [page,      setPage]      = useState(0);
  const [hasMore,   setHasMore]   = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  // [용도] DB에서 번역 뉴스 조회 / [호출] 카테고리 변경, 5분 폴링
  const fetchNews = useCallback(async (cat, pg, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);
      const res = await getNews(cat, pg, 30);
      const data = res.data || [];
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 30);
      setLastFetch(new Date());
    } catch {
      setError('뉴스를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchNews(category, 0, false);
  }, [category, fetchNews]);

  // [용도] 5분마다 자동 갱신 (스케줄러 주기와 동일) / [호출] 마운트 후 인터벌
  useEffect(() => {
    const id = setInterval(() => {
      setPage(0);
      fetchNews(category, 0, false);
    }, 300_000);
    return () => clearInterval(id);
  }, [category, fetchNews]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchNews(category, next, true);
  };

  return (
    <div className="page">
      {/* ── 헤더 ── */}
      <div className="news-header">
        <div>
          <h1 className="news-title">코인 뉴스</h1>
          <span className="news-last-update">
            {lastFetch
              ? `마지막 갱신: ${lastFetch.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'AI가 번역·요약한 실시간 뉴스'}
          </span>
        </div>
        <div className="news-live-badge">● LIVE</div>
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
      {loading && posts.length === 0 ? (
        <div className="news-loading">
          <div className="news-spinner" />
          <span>뉴스 번역 중…</span>
        </div>
      ) : error ? (
        <div className="news-error">{error}</div>
      ) : posts.length === 0 ? (
        <div className="news-empty">
          <div style={{ marginBottom: '8px' }}>번역된 뉴스가 없습니다.</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            서버 시작 후 약 10초 뒤 자동으로 수집됩니다.
          </div>
        </div>
      ) : (
        <>
          <div className="news-list">
            {posts.map((post) => (
              <div key={post.id} className="news-card">
                <div className="news-card-top">
                  <span className="news-source">{post.source}</span>
                  <span className="news-time">{timeAgo(post.publishedAt)}</span>
                </div>

                {/* 번역된 제목 */}
                <div className="news-card-title">{post.titleKo}</div>

                {/* AI 요약 */}
                <div className="news-card-body">{post.summaryKo}</div>

                {/* 카테고리 태그 */}
                {post.categories && (
                  <div className="news-currencies">
                    {parseTags(post.categories).map((tag) => (
                      <span key={tag} className="news-currency-tag">{tag}</span>
                    ))}
                  </div>
                )}

                {/* 원본 링크 */}
                <div className="news-card-bottom">
                  <a
                    href={post.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-original-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    원문 보기 →
                  </a>
                  <span className="news-ai-badge">✦ AI 번역</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button className="news-load-more" onClick={handleLoadMore}>
              더 보기
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default NewsPage;
