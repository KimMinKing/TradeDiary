// [파일 용도] 로그인/회원가입 통합 모달 (이메일 / 구글 / 카카오)

import { useState, useEffect } from 'react';

const SAVED_EMAIL_KEY = 'savedEmail';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../api/authApi';
import useAuthStore from '../store/authStore';

// [컴포넌트] 인증 모달 / [호출] LandingPage.jsx
const AuthModal = ({ initialMode = 'login', onClose }) => {
  const [mode,          setMode]          = useState(initialMode); // 'login' | 'signup'
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [nickname,      setNickname]      = useState('');
  const [showPw,        setShowPw]        = useState(false); // 비밀번호 표시 토글
  const [rememberMe,    setRememberMe]    = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [loading,       setLoading]       = useState(false);

  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);
  const navigate    = useNavigate();

  // [용도] 저장된 이메일 불러오기 / [호출] 마운트 시
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // [용도] 비밀번호 유효성 조건 / [호출] 회원가입 폼
  const cond8chars  = password.length >= 8;
  const condUpper   = /[A-Z]/.test(password);
  const pwValid     = cond8chars && condUpper;

  // [용도] 로그인/회원가입 모드 전환 시 상태 초기화 / [호출] 하단 전환 버튼
  const switchMode = (next) => {
    setMode(next);
    setEmailExpanded(false);
    setEmail('');
    setPassword('');
    setNickname('');
    setShowPw(false);
    setError('');
    setSuccess('');
  };

  // [용도] 이메일 로그인 처리 / [호출] 이메일 폼 submit
  const handleLogin = async (e) => {
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
      onClose();
      navigate('/trades');
    } catch (err) {
      setError(err.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] 이메일 회원가입 처리 / [호출] 이메일 폼 submit
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!pwValid) {
      setError('비밀번호 조건을 충족해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email, password, nickname);
      setSuccess('가입 완료! 이메일로 로그인하세요.');
      switchMode('login');
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* 닫기 */}
        <button className="auth-modal-close" onClick={onClose}>✕</button>

        {/* 헤더 */}
        <div className="auth-modal-logo">TradeDiary</div>
        <p className="auth-modal-sub">
          {mode === 'login' ? '로그인하여 시작하세요' : '새 계정 만들기'}
        </p>

        {/* 이메일 버튼 or 펼쳐진 폼 */}
        {!emailExpanded ? (
          <button
            className="auth-social-btn auth-email-btn"
            onClick={() => setEmailExpanded(true)}
          >
            <span className="auth-social-icon">✉</span>
            이메일로 {mode === 'login' ? '로그인' : '회원가입'}
          </button>
        ) : (
          <form
            className="auth-email-form"
            onSubmit={mode === 'login' ? handleLogin : handleSignup}
          >
            <input
              className="input"
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />

            {/* 비밀번호 + 눈 아이콘 */}
            <div className="pw-input-wrap">
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? '비밀번호 (8자 이상, 대문자 포함)' : '비밀번호'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="pw-toggle-btn"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>

            {/* 회원가입 비밀번호 조건 */}
            {mode === 'signup' && password.length > 0 && (
              <div className="pw-conditions">
                <span className={`pw-cond${cond8chars ? ' ok' : ''}`}>
                  {cond8chars ? '✓' : '○'} 8자 이상
                </span>
                <span className={`pw-cond${condUpper ? ' ok' : ''}`}>
                  {condUpper ? '✓' : '○'} 대문자 1개 이상
                </span>
              </div>
            )}

            {mode === 'signup' && (
              <input
                className="input"
                type="text"
                placeholder="닉네임 (2~20자)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={2}
                maxLength={20}
                required
              />
            )}
            {/* 아이디 저장 (로그인 모드에서만) */}
            {mode === 'login' && (
              <label className="login-remember-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>아이디 저장</span>
              </label>
            )}

            {error   && <p className="msg-error">{error}</p>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
            <button
              type="button"
              className="auth-back-link"
              onClick={() => setEmailExpanded(false)}
            >
              ← 다른 방법으로
            </button>
          </form>
        )}

        {/* 구분선 */}
        <div className="auth-divider"><span>또는</span></div>

        {/* 구글 */}
        <button
          className="auth-social-btn auth-google-btn"
          onClick={() => { window.location.href = '/oauth2/authorization/google'; }}
        >
          <svg className="auth-social-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-3.3 0-6.19 1.47-8.2 3.82l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          구글로 {mode === 'login' ? '로그인' : '계속하기'}
        </button>

        {/* 카카오 */}
        <button
          className="auth-social-btn auth-kakao-btn"
          onClick={() => { window.location.href = '/oauth2/authorization/kakao'; }}
        >
          <span className="auth-social-icon" style={{ fontSize: '18px' }}>💬</span>
          카카오로 {mode === 'login' ? '로그인' : '계속하기'}
        </button>

        {/* 하단 모드 전환 */}
        {success && <p className="msg-success" style={{ textAlign: 'center', marginTop: '12px' }}>{success}</p>}
        <p className="auth-modal-footer">
          {mode === 'login' ? (
            <>계정이 없으신가요?{' '}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('signup')}>
                회원가입
              </button>
            </>
          ) : (
            <>이미 계정이 있으신가요?{' '}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode('login')}>
                로그인
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
