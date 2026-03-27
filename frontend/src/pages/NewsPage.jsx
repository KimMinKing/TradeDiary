// [파일 용도] 코인 뉴스 페이지 (CryptoPanic API 기반, 60초 자동 갱신)

import { useState, useEffect, useCallback } from 'react';
import { getNews } from '../api/newsApi';

const FILTERS = [
  { value: 'hot',       label: '🔥 인기' },
  { value: 'rising',    label: '📈 급상승' },
  { value: 'bullish',   label: '🟢 강세' },
  { value: 'bearish',   label: '🔴 약세' },
  { value: 'important', label: '⭐ 주요' },
];

// [용도] 발행 시각을 "N분 전 / N시간 전 / N일 전" 형식으로 변환 / [호출] NewsPage 렌더링
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

// [용도] CryptoPanic 소스 도메인에서 짧은 출처명 추출 / [호출] 카드 렌더링
const sourceName = (post) => {
  try {
    return new URL(post.url).hostname.replace('www.', '');
  } catch {
    return post.source?.title || '';
  }
};

// [컴포넌트] 코인 뉴스 페이지 / [호출] App.jsx 라우터
const NewsPage = () => {
  const [filter,   setFilter]   = useState('hot');
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [page,     setPage]     = useState(1);
  const [hasNext,  setHasNext]  = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  // [용도] 뉴스 데이터 fetch / [호출] 필터·페이지 변경, 60초 폴링
  const fetchNews = useCallback(async (f, p, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);
      const res = await getNews(f, p);
      const data = res.data;
      const newPosts = data.results || [];
      setPosts((prev) => append ? [...prev, ...newPosts] : newPosts);
      setHasNext(!!data.next);
      setLastFetch(new Date());
    } catch {
      setError('뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // [용도] 필터 변경 시 1페이지부터 재로드 / [호출] 필터 버튼 클릭
  useEffect(() => {
    setPage(1);
    fetchNews(filter, 1, false);
  }, [filter, fetchNews]);

  // [용도] 60초마다 최신 뉴스 자동 갱신 (1페이지 기준) / [호출] 마운트 후 인터벌
  useEffect(() => {
    const id = setInterval(() => {
      fetchNews(filter, 1, false);
      setPage(1);
    }, 60000);
    return () => clearInterval(id);
  }, [filter, fetchNews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(filter, nextPage, true);
  };

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
        <div className="news-live-badge">● LIVE</div>
      </div>

      {/* ── 필터 탭 ── */}
      <div className="news-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`news-filter-btn${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── 뉴스 목록 ── */}
      {loading && posts.length === 0 ? (
        <div className="news-loading">
          <div className="news-spinner" />
          <span>뉴스 불러오는 중…</span>
        </div>
      ) : error ? (
        <div className="news-error">{error}</div>
      ) : posts.length === 0 ? (
        <div className="news-empty">뉴스가 없습니다.</div>
      ) : (
        <>
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
                  <span className="news-source">{sourceName(post)}</span>
                  <span className="news-time">{timeAgo(post.published_at)}</span>
                </div>
                <div className="news-card-title">{post.title}</div>
                {post.currencies && post.currencies.length > 0 && (
                  <div className="news-currencies">
                    {post.currencies.slice(0, 5).map((c) => (
                      <span key={c.code} className="news-currency-tag">{c.code}</span>
                    ))}
                  </div>
                )}
                <div className="news-card-bottom">
                  <div className="news-votes">
                    <span className="news-vote-pos">▲ {post.votes?.positive ?? 0}</span>
                    <span className="news-vote-neg">▼ {post.votes?.negative ?? 0}</span>
                  </div>
                  {post.votes?.important > 0 && (
                    <span className="news-important-badge">⭐ 중요</span>
                  )}
                </div>
              </a>
            ))}
          </div>

          {hasNext && (
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
