// [파일 용도] Sign in/Create account 통합 모달 (이메일 / 구글 / 카카오)

import { useState, useEffect } from 'react';

const SAVED_EMAIL_KEY = 'savedEmail';
import { useNavigate } from 'react-router-dom';
import { login, signup, requestPasswordReset } from '../api/authApi';
import useAuthStore from '../store/authStore';

// [컴포넌트] 인증 모달 / [호출] LandingPage.jsx
const AuthModal = ({ initialMode = 'login', onClose }) => {
  const [mode,          setMode]          = useState(initialMode); // 'login' | 'signup' | 'forgot'
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

  // [용도] Save된 이메일 불러오기 / [호출] 마운트 시
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // [용도] 비밀번호 유효성 조 / [호출] Create account 폼
  const cond8chars  = password.length >= 8;
  const condUpper   = /[A-Z]/.test(password);
  const pwValid     = cond8chars && condUpper;

  // [용도] 모드 전환 시 상태 Reset / [호출] 하단 전환 버튼
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

  // [용도] 비밀번호 찾기 이메일 발송 처리 / [호출] forgot 폼 submit
  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccess('Check your inbox for a password reset link.');
    } catch {
      setError('We could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] 이메일 Sign in 처리 / [호출] 이메일 폼 submit
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
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] 이메일 Create account 처리 / [호출] 이메일 폼 submit
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!pwValid) {
      setError('Password requirements are not met.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email, password, nickname);
      setSuccess('Account created. Sign in with your email.');
      switchMode('login');
    } catch (err) {
      setError(err.response?.data?.message || 'We could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">

        {/* Close */}
        <button className="auth-modal-close" onClick={onClose}>✕</button>

        {/* 헤더 */}
        <div className="auth-modal-logo" id="auth-dialog-title">TradeDiary</div>
        <p className="auth-modal-sub">
          {mode === 'login' ? 'Sign in to your trading workspace'
            : mode === 'signup' ? 'Create your account'
            : 'Reset your password'}
        </p>

        {/* ── 비밀번호 찾기 모드 ── */}
        {mode === 'forgot' && (
          <div>
            {success ? (
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <p className="msg-success" style={{ marginBottom: '16px' }}>{success}</p>
                <button
                  type="button"
                  className="auth-back-link"
                  onClick={() => switchMode('login')}
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form className="auth-email-form" onSubmit={handleForgot}>
                <p className="text-sm text-secondary" style={{ marginBottom: '12px', lineHeight: '1.5' }}>
                  Enter the email address associated with your account.
                </p>
                <input
                  className="input"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && <p className="msg-error">{error}</p>}
                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  className="auth-back-link"
                  onClick={() => switchMode('login')}
                >
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        )}

        {/* 이메일 버튼 or 펼쳐진 폼 (Sign in/Create account 모드에서만) */}
        {mode !== 'forgot' && (!emailExpanded ? (
          <button
            className="auth-social-btn auth-email-btn"
            onClick={() => setEmailExpanded(true)}
          >
            <span className="auth-social-icon auth-email-icon">@</span>
            {mode === 'login' ? 'Continue with email' : 'Sign up with email'}
          </button>
        ) : (
          <form
            className="auth-email-form"
            onSubmit={mode === 'login' ? handleLogin : handleSignup}
          >
            <input
              className="input"
              type="email"
              placeholder="Email address"
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
                placeholder={mode === 'signup' ? 'Password — 8+ characters, one uppercase' : 'Password'}
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
                aria-label={showPw ? 'Hide password' : 'Show password'}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.8 10.8 0 0112 4c5.2 0 8.7 4.8 8.7 4.8a14 14 0 01-2.3 2.8M6.3 6.3C4.4 7.5 3.3 8.8 3.3 8.8S6.8 16 12 16c1 0 2-.2 2.8-.6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3.3 12S6.8 6 12 6s8.7 6 8.7 6-3.5 6-8.7 6-8.7-6-8.7-6z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>

            {/* Create account 비밀번호 조 */}
            {mode === 'signup' && password.length > 0 && (
              <div className="pw-conditions">
                <span className={`pw-cond${cond8chars ? ' ok' : ''}`}>
                  {cond8chars ? '✓' : '○'} 8+ characters
                </span>
                <span className={`pw-cond${condUpper ? ' ok' : ''}`}>
                  {condUpper ? '✓' : '○'} One uppercase
                </span>
              </div>
            )}

            {mode === 'signup' && (
              <input
                className="input"
                type="text"
                placeholder="Display name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={2}
                maxLength={20}
                required
              />
            )}
            {/* 아이디 Save + 비밀번호 찾기 (Sign in 모드에서만) */}
            {mode === 'login' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="login-remember-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember email</span>
                </label>
                <button
                  type="button"
                  className="auth-switch-btn"
                  style={{ fontSize: '12px' }}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error   && <p className="msg-error">{error}</p>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              className="auth-back-link"
              onClick={() => setEmailExpanded(false)}
            >
              ← Other sign-in options
            </button>
          </form>
        ))}

        {/* 소셜 Sign in + 하단 (forgot 모드에서는 숨김) */}
        {mode !== 'forgot' && (
          <>
            <div className="auth-divider"><span>or</span></div>

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
              Continue with Google
            </button>

            {/* 카카오 */}
            <button
              className="auth-social-btn auth-kakao-btn"
              onClick={() => { window.location.href = '/oauth2/authorization/kakao'; }}
            >
              <span className="auth-social-icon auth-kakao-icon">K</span>
              Continue with Kakao
            </button>

            {/* 하단 모드 전환 */}
            {success && <p className="msg-success" style={{ textAlign: 'center', marginTop: '12px' }}>{success}</p>}
            <p className="auth-modal-footer">
              {mode === 'login' ? (
                <>New to Trade Diary?{' '}
                  <button type="button" className="auth-switch-btn" onClick={() => switchMode('signup')}>
                    Create account
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" className="auth-switch-btn" onClick={() => switchMode('login')}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
