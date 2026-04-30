// [파일 용도] 라우터 설정 및 앱 진입점

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useTheme from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ExchangeKeyPage from './pages/ExchangeKeyPage';
import PositionListPage from './pages/PositionListPage';
import JournalPage from './pages/JournalPage';
import StatsPage from './pages/StatsPage';
import RankingPage from './pages/RankingPage';
import TraderProfilePage from './pages/TraderProfilePage';
import DashboardPage from './pages/DashboardPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Layout from './components/Layout';
import useAuthStore from './store/authStore';

// [컴포넌트] 로그인/토큰 유효 여부에 따라 접근 제한하는 라우트 / [호출] App
const PrivateRoute = ({ children }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

// [컴포넌트] 전체 라우터 설정 / [호출] main.jsx
const App = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  useTheme(); // 앱 초기 로드 시 저장된 테마 적용

  useEffect(() => {
    // 절전모드 복귀 / 탭 포커스 복귀 시 토큰 만료 여부 재확인 → 만료면 /login으로 이동
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
          path="/journal"
          element={<PrivateRoute><JournalPage /></PrivateRoute>}
        />
        <Route
          path="/stats"
          element={<PrivateRoute><StatsPage /></PrivateRoute>}
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
    </BrowserRouter>
  );
};

export default App;
