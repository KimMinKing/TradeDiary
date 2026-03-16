// [파일 용도] 라우터 설정 및 앱 진입점

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ExchangeKeyPage from './pages/ExchangeKeyPage';
import TradeListPage from './pages/TradeListPage';
import useAuthStore from './store/authStore';

// [컴포넌트] 로그인 여부에 따라 접근 제한하는 라우트 / [호출] App
const PrivateRoute = ({ children }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

// [컴포넌트] 전체 라우터 설정 / [호출] main.jsx
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/exchange-keys"
          element={<PrivateRoute><ExchangeKeyPage /></PrivateRoute>}
        />
        <Route
          path="/trades"
          element={<PrivateRoute><TradeListPage /></PrivateRoute>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
