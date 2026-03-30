// [파일 용도] 코인 뉴스 페이지 (CryptoCompare 원문 영어 기사 + 오늘의 AI 시장 요약)

import { useState, useEffect, useCallback } from 'react';
import { getNews, getNewsSummary, refreshNewsSummary } from '../api/newsApi';

const CATEGORIES = [
  { value: 'all',        label: '전체' },
  { value: 'BTC',        label: '₿ Bitcoin' },
  { value: 'ETH',        label: '⟠ Ethereum' },
  { value: 'Market',     label: '📈 Market' },
  { value: 'Trading',    label: '💹 Trading' },
  { value: 'Regulation', label: '⚖️ Regulation' },
  { value: 'Mining',     label: '⛏️ Mining' },
];

// [용도] Unix timestamp를 "N분 전 / N시간 전 / N일 전"으로 변환 / [호출] 카드 렌더링
const timeAgoFromUnix = (unix) => {
  const diff = Date.now() - unix * 1000;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return '방금 전';
  if (mins  < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

// [컴포넌트] 코인 뉴스 페이지 / [호출] App.jsx 라우터
const NewsPage = () => {
  const [category,   setCategory]   = useState('all');
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [summary,    setSummary]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // [용도] 원문 기사 조회 / [호출] 카테고리 변경, 마운트
  const fetchNews = useCallback(async (cat) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNews(cat);
      setPosts(res.data || []);
    } catch {
      setError('뉴스를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // [용도] AI 요약 조회 / [호출] 마운트
  const fetchSummary = useCallback(async () => {
    try {
      const res = await getNewsSummary();
      if (res.data?.summary_ko) setSummary(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNews(category);
    fetchSummary();
  }, [category, fetchNews, fetchSummary]);

  // [용도] AI 요약 수동 재생성 / [호출] 새로고침 버튼
  const handleRefreshSummary = async () => {
    setRefreshing(true);
    try {
      const res = await refreshNewsSummary();
      if (res.data?.summary_ko) setSummary(res.data);
    } catch {}
    setRefreshing(false);
  };

  return (
    <div className="page">
      {/* ── 헤더 ── */}
      <div className="news-header">
        <div>
          <h1 className="news-title">코인 뉴스</h1>
          <span className="news-last-update">CryptoCompare 실시간 영문 기사</span>
        </div>
      </div>

      {/* ── AI 일별 요약 카드 ── */}
      {summary?.summary_ko && (
        <div className="news-summary-card">
          <div className="news-summary-header">
            <span className="news-summary-label">✦ 오늘의 AI 시장 요약</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={handleRefreshSummary}
              disabled={refreshing}
              style={{ opacity: 0.7 }}
            >
              {refreshing ? '생성 중...' : '↺ 새로고침'}
            </button>
          </div>
          <p className="news-summary-text">{summary.summary_ko}</p>
          {summary.updated_at && (
            <span className="news-summary-time">
              {new Date(summary.updated_at).toLocaleString('ko-KR', {
                month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })} 기준
            </span>
          )}
        </div>
      )}

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
          <span>불러오는 중…</span>
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
              className="news-card news-card-link"
            >
              <div className="news-card-top">
                <span className="news-source">{post.source}</span>
                <span className="news-time">{timeAgoFromUnix(post.publishedOn)}</span>
              </div>
              <div className="news-card-title">{post.title}</div>
              {post.body && (
                <div className="news-card-body">{post.body}</div>
              )}
              {post.categories && (
                <div className="news-currencies">
                  {post.categories.split('|').filter(Boolean).slice(0, 4).map((tag) => (
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
