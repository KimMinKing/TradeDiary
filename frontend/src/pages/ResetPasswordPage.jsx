// [파일 용도] 비밀번호 재Settings 페이지 (이메일 링크 클릭 후 Entry)

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authApi';

// [컴포넌트] 토큰으로 New password Settings / [호출] App.jsx 라우터 (/reset-password?token=...)
const ResetPasswordPage = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') ?? '';

  const [password,   setPassword]   = useState('');
  const [password2,  setPassword2]  = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [done,       setDone]       = useState(false);

  const cond8chars = password.length >= 8;
  const condUpper  = /[A-Z]/.test(password);
  const condMatch  = password === password2 && password2.length > 0;

  // [용도] New password 제출 처리 / [호출] 폼 submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cond8chars || !condUpper) {
      setError('Password requirements are not met.');
      return;
    }
    if (!condMatch) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'This link is expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '36px 32px',
      }}>
        {/* 로고 */}
        <div style={{
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '8px',
          fontFamily: 'var(--font-heading)',
          color: 'var(--text)',
        }}>
          TradeDiary
        </div>

        {done ? (
          /* complete 상태 */
          <div style={{ paddingTop: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
              Password updated
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '24px', lineHeight: '1.6' }}>
              Sign in with your new password.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate('/')}
            >
              Go to sign in
            </button>
          </div>
        ) : (
          /* 입력 폼 */
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
              Set a new password
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              Use at least 8 characters including one uppercase letter.
            </p>

            {!token && (
              <p className="msg-error" style={{ marginBottom: '16px' }}>
                This link is invalid. Open the password reset link from your email again.
              </p>
            )}

            {/* New password */}
            <div className="pw-input-wrap" style={{ marginBottom: '12px' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
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

            {/* 비밀번호 Confirm */}
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="New password Confirm"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              style={{ marginBottom: '12px' }}
              autoComplete="new-password"
            />

            {/* 조 표시 */}
            {password.length > 0 && (
              <div className="pw-conditions" style={{ marginBottom: '12px' }}>
                <span className={`pw-cond${cond8chars ? ' ok' : ''}`}>
                  {cond8chars ? '✓' : '○'} 8+ characters
                </span>
                <span className={`pw-cond${condUpper ? ' ok' : ''}`}>
                  {condUpper ? '✓' : '○'} One uppercase letter
                </span>
                {password2.length > 0 && (
                  <span className={`pw-cond${condMatch ? ' ok' : ''}`}>
                    {condMatch ? '✓' : '○'} Passwords match
                  </span>
                )}
              </div>
            )}

            {error && <p className="msg-error" style={{ marginBottom: '12px' }}>{error}</p>}

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={loading || !token}
            >
              {loading ? 'Updating...' : 'Change password'}
            </button>

            <button
              type="button"
              className="auth-back-link"
              style={{ marginTop: '12px', display: 'block', textAlign: 'center' }}
              onClick={() => navigate('/')}
            >
              ← Back home
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
