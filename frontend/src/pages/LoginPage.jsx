// [파일 용도] Sign in 페이지

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import useAuthStore from '../store/authStore';

const SAVED_EMAIL_KEY = 'savedEmail';

// [컴포넌트] 이메일/비밀번호 Sign in 화면 / [호출] App.jsx 라우터
const LoginPage = () => {
  const navigate    = useNavigate();
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // [용도] Save된 이메일 불러오기 / [호출] 마운트 시
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      setLoggedIn();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* 로고 */}
        <div className="auth-logo">TradeDiary</div>
        <p className="auth-subtitle">Sign in to your trading workspace</p>

        {/* 폼 */}
        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">Email</label>
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
            <label className="input-label">Password</label>
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

          {/* 아이디 Save */}
          <label className="login-remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember email</span>
          </label>

          {error && <p className="msg-error">{error}</p>}

          <button
            className="btn btn-primary btn-lg btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New to Trade Diary?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
