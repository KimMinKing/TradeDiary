// [파일 용도] Google OAuth2 로그인 후 토큰을 저장하고 대시보드로 이동하는 콜백 페이지

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// [컴포넌트] URL 파라미터에서 토큰을 읽어 localStorage에 저장 / [호출] App.jsx 라우터 /oauth/callback
const OAuthCallbackPage = () => {
  const navigate    = useNavigate();
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);

  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setLoggedIn();
      navigate('/trades', { replace: true });
    } else {
      // 토큰이 없으면 로그인 실패로 처리
      navigate('/', { replace: true });
    }
  }, [navigate, setLoggedIn]);

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
