// [파일 용도] Google OAuth2 Sign in 후 토큰을 Save하고 대시보드로 이동하는 콜백 페이지

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// [컴포넌트] URL 파라미터에서 토큰을 읽어 localStorage에 Save / [호출] App.jsx 라우터 /oauth/callback
const OAuthCallbackPage = () => {
  const navigate    = useNavigate();
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);

  useEffect(() => {
    const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const params = fragmentParams.size > 0 ? fragmentParams : queryParams;
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userId       = params.get('user_id');

    window.history.replaceState(null, '', '/oauth/callback');

    if (accessToken && refreshToken && userId) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', userId);
      setLoggedIn();
      navigate('/trades', { replace: true });
    } else {
      // 토큰이 없으면 Sign in failed로 처리
      navigate('/', { replace: true });
    }
  }, [navigate, setLoggedIn]);

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Completing sign-in...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
