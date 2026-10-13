// [파일 용도] 라우터 Settings 및 앱 Entry점 (lazy loading Apply)

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useTheme from './hooks/useTheme';
import Layout from './components/Layout';
import useAuthStore from './store/authStore';

// 즉시 로드: 랜딩 페이지 (첫 화면)
import LandingPage from './pages/LandingPage';

// lazy 로드: You머지 페이지 (접속 시에만 다운로드)
const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const ExchangeKeyPage   = lazy(() => import('./pages/ExchangeKeyPage'));
const PositionListPage  = lazy(() => import('./pages/PositionListPage'));
const JournalPage       = lazy(() => import('./pages/JournalPage'));
const StatsPage         = lazy(() => import('./pages/StatsPage'));
const CommunityPage     = lazy(() => import('./pages/CommunityPage'));
const RankingPage       = lazy(() => import('./pages/RankingPage'));
const TraderProfilePage = lazy(() => import('./pages/TraderProfilePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const TradeSyncPage     = lazy(() => import('./pages/TradeSyncPage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));

// [용도] lazy loading 중 표시할 로딩 스피너 / [호출] Suspense fallback
const PageLoader = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', color: 'var(--text-muted)', fontSize: '0.9rem',
  }}>
    <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</div>
  </div>
);

// [컴포넌트] Sign in/토큰 유효 여부에 따라 접근 제한하는 라우트 / [호출] App
const PrivateRoute = ({ children }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

// [컴포넌트] All 라우터 Settings / [호출] main.jsx
const App = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  useTheme(); // 앱 초기 로드 시 Save된 테마 Apply

  useEffect(() => {
    // 절전모드 복귀 / 탭 포커스 복귀 시 토큰 만료 여부 재Confirm → 만료면 /login으로 이동
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route
            path="/exchange-keys"
            element={<PrivateRoute><ExchangeKeyPage /></PrivateRoute>}
          />
          {/* 구 경로 → 통합된 경로로 리디렉트 */}
          <Route path="/trades"       element={<Navigate to="/positions?tab=trades"   replace />} />
          <Route path="/holdings"     element={<Navigate to="/positions?tab=holdings" replace />} />
          <Route path="/plans"        element={<Navigate to="/journal?tab=plans"      replace />} />
          <Route path="/trader-type"  element={<Navigate to="/stats?tab=trader-type"  replace />} />
          <Route path="/news"         element={<Navigate to="/dashboard"              replace />} />
          <Route
            path="/positions"
            element={<PrivateRoute><PositionListPage /></PrivateRoute>}
          />
          <Route
            path="/sync"
            element={<PrivateRoute><TradeSyncPage /></PrivateRoute>}
          />
          <Route
            path="/settings"
            element={<PrivateRoute><SettingsPage /></PrivateRoute>}
          />
          <Route
            path="/journal"
            element={<PrivateRoute><JournalPage /></PrivateRoute>}
          />
          <Route
            path="/stats"
            element={<Navigate to="/positions?tab=analytics" replace />}
          />
          <Route
            path="/community"
            element={<PrivateRoute><CommunityPage /></PrivateRoute>}
          />
          <Route
            path="/ranking"
            element={<PrivateRoute><RankingPage /></PrivateRoute>}
          />
          <Route
            path="/trader/:userId"
            element={<PrivateRoute><TraderProfilePage /></PrivateRoute>}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
