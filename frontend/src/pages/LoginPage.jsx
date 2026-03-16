// [파일 용도] 로그인 페이지

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import useAuthStore from '../store/authStore';

// [컴포넌트] 이메일/비밀번호 로그인 화면 / [호출] App.jsx 라우터
const LoginPage = () => {
  const navigate    = useNavigate();
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setLoggedIn();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* 로고 */}
        <div className="auth-logo">TradeDiary</div>
        <p className="auth-subtitle">거래 기록 기반 성장 분석 플랫폼</p>

        {/* 폼 */}
        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">이메일</label>
            <input
              className="input"
              type="email"
              placeholder="trader@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="input-label">비밀번호</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="msg-error">{error}</p>}

          <button
            className="btn btn-primary btn-lg btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="auth-footer">
          계정이 없으신가요?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
