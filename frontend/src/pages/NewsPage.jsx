// [파일 용도] Asset 뉴스 페이지 (CryptoCompare  KRW문 영어 기사 + Today의 AI 시장 요약)

import { useState, useEffect, useCallback } from 'react';
import { getNews, getNewsSummary, refreshNewsSummary } from '../api/newsApi';
import MarkdownContent from '../components/MarkdownContent';
import usePreferredLanguage from '../hooks/usePreferredLanguage';

const CATEGORIES = [
  { value: 'all',        label: 'All' },
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
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// [컴포넌트] Asset 뉴스 페이지 / [호출] App.jsx 라우터
const NewsPage = () => {
  const language = usePreferredLanguage();
  const [category,   setCategory]   = useState('all');
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [summary,    setSummary]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // [용도]  KRW문 기사 조회 / [호출] 카테고리 변경, 마운트
  const fetchNews = useCallback(async (cat) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getNews(cat);
      setPosts(res.data || []);
    } catch {
      setError('Could not load market news.');
    } finally {
      setLoading(false);
    }
  }, []);

  // [용도] AI 요약 조회 / [호출] 마운트
  const fetchSummary = useCallback(async () => {
    try {
      const res = await getNewsSummary();
      if (res.data?.summary_ko) setSummary(res.data);
    } catch { /* Summary is optional; news remains usable without it. */ }
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
    } catch { /* Keep the previous summary on refresh failure. */ }
    setRefreshing(false);
  };

  return (
    <div className="page">
      {/* ── 헤더 ── */}
      <div className="news-header">
        <div>
          <h1 className="news-title">Market News</h1>
          <span className="news-last-update">Live English coverage from CryptoCompare</span>
        </div>
      </div>

      {/* ── AI 일별 요약 카드 ── */}
      {summary?.summary_ko && (
        <div className="news-summary-card">
          <div className="news-summary-header">
            <span className="news-summary-label">{language === 'ko' ? '✦ 오늘의 AI 시장 요약' : "✦ Today's AI market brief"}</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={handleRefreshSummary}
              disabled={refreshing}
              style={{ opacity: 0.7 }}
            >
              {refreshing ? '생성 중...' : '↺ 새로고침'}
            </button>
          </div>
          <MarkdownContent className="news-summary-text">{summary.summary_ko}</MarkdownContent>
          {summary.updated_at && (
            <span className="news-summary-time">
              {new Date(summary.updated_at).toLocaleString('ko-KR', {
                month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })}
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
            <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="news-error">{error}</div>
      ) : posts.length === 0 ? (
          <div className="news-empty">No news is available.</div>
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
