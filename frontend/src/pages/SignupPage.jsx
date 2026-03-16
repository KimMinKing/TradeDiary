// [파일 용도] 회원가입 페이지

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/authApi';

// [컴포넌트] 이메일/비밀번호/닉네임 회원가입 화면 / [호출] App.jsx 라우터
const SignupPage = () => {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, nickname);
      navigate('/login', { state: { signedUp: true } });
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo" style={{ marginBottom: '4px' }}>TradeDiary</div>
        <p className="auth-subtitle">새 계정 만들기</p>

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
            <label className="input-label">비밀번호 (8자 이상)</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="input-label">닉네임 (2~20자)</label>
            <input
              className="input"
              type="text"
              placeholder="나의 트레이더명"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={20}
              required
            />
          </div>

          {error && <p className="msg-error">{error}</p>}

          <button
            className="btn btn-primary btn-lg btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p className="auth-footer">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
