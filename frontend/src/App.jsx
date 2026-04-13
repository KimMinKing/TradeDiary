// [파일 용도] 라우터 설정 및 앱 진입점

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useTheme from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ExchangeKeyPage from './pages/ExchangeKeyPage';
import TradeListPage from './pages/TradeListPage';
import PositionListPage from './pages/PositionListPage';
import JournalPage from './pages/JournalPage';
import StatsPage from './pages/StatsPage';
import NewsPage from './pages/NewsPage';
import HoldingsPage from './pages/HoldingsPage';
import TradePlanPage from './pages/TradePlanPage';
import TraderTypePage from './pages/TraderTypePage';
import RankingPage from './pages/RankingPage';
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
        <Route
          path="/trades"
          element={<PrivateRoute><TradeListPage /></PrivateRoute>}
        />
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
          path="/news"
          element={<PrivateRoute><NewsPage /></PrivateRoute>}
        />
        <Route
          path="/holdings"
          element={<PrivateRoute><HoldingsPage /></PrivateRoute>}
        />
        <Route
          path="/plans"
          element={<PrivateRoute><TradePlanPage /></PrivateRoute>}
        />
        <Route
          path="/trader-type"
          element={<PrivateRoute><TraderTypePage /></PrivateRoute>}
        />
        <Route
          path="/ranking"
          element={<PrivateRoute><RankingPage /></PrivateRoute>}
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
