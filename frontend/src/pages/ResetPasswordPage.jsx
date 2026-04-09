// [파일 용도] 비밀번호 재설정 페이지 (이메일 링크 클릭 후 진입)

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authApi';

// [컴포넌트] 토큰으로 새 비밀번호 설정 / [호출] App.jsx 라우터 (/reset-password?token=...)
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

  // [용도] 새 비밀번호 제출 처리 / [호출] 폼 submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cond8chars || !condUpper) {
      setError('비밀번호 조건을 충족해주세요.');
      return;
    }
    if (!condMatch) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || '링크가 만료되었거나 유효하지 않습니다.');
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
          /* 완료 상태 */
          <div style={{ paddingTop: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>
              비밀번호가 변경되었습니다
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '24px', lineHeight: '1.6' }}>
              새 비밀번호로 로그인하세요.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate('/')}
            >
              로그인하러 가기
            </button>
          </div>
        ) : (
          /* 입력 폼 */
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
              새 비밀번호 설정
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              8자 이상, 대문자 1개 이상 포함해야 합니다.
            </p>

            {!token && (
              <p className="msg-error" style={{ marginBottom: '16px' }}>
                유효하지 않은 링크입니다. 이메일의 링크를 다시 클릭해주세요.
              </p>
            )}

            {/* 새 비밀번호 */}
            <div className="pw-input-wrap" style={{ marginBottom: '12px' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="새 비밀번호"
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

            {/* 비밀번호 확인 */}
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="새 비밀번호 확인"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              style={{ marginBottom: '12px' }}
              autoComplete="new-password"
            />

            {/* 조건 표시 */}
            {password.length > 0 && (
              <div className="pw-conditions" style={{ marginBottom: '12px' }}>
                <span className={`pw-cond${cond8chars ? ' ok' : ''}`}>
                  {cond8chars ? '✓' : '○'} 8자 이상
                </span>
                <span className={`pw-cond${condUpper ? ' ok' : ''}`}>
                  {condUpper ? '✓' : '○'} 대문자 1개 이상
                </span>
                {password2.length > 0 && (
                  <span className={`pw-cond${condMatch ? ' ok' : ''}`}>
                    {condMatch ? '✓' : '○'} 비밀번호 일치
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
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>

            <button
              type="button"
              className="auth-back-link"
              style={{ marginTop: '12px', display: 'block', textAlign: 'center' }}
              onClick={() => navigate('/')}
            >
              ← 홈으로
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
