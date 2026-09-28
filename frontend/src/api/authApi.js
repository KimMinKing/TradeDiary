// [파일 용도] 인증 관련 API 호출 함수 모음

import axios from 'axios';
import { clearRequestCache } from './requestCache';
import { translateText } from '../i18n/translations';

// VITE_API_URL 미Settings 시:
//   - 발(npm run dev): Vite 프록시 또는 localhost:8080 직접 접근
//   - Docker: nginx가 /api를 backend:8080으로 프록시 → 빈 문자열(same-origin)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

// [용도] 요청마다 AccessToken 자동 첨부 / [호출] axios 인터셉터 자동 실행
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// [용도] 토큰 갱신 중복 방지용 플래그 및 대기 큐 / [호출] 응답 인터셉터
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  refreshQueue = [];
};

// [용도] 401 응답 시 RefreshToken으로 AccessToken 재create 후  KRW래 요청 재시도 / [호출] axios 인터셉터 자동 실행
// 재create failed 또는 Sign in/Create account API 401은 로그아웃 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.data?.message) {
      error.response.data.message = translateText(error.response.data.message, localStorage.getItem('preferredLanguage') || 'en');
    }
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/');
    if (error.response?.status !== 401 || isAuthEndpoint || error.config?._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/';
      return Promise.reject(error);
    }

    error.config._retry = true;

    // 이미 갱신 중이면 큐에 대기
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(token => {
        error.config.headers.Authorization = `Bearer ${token}`;
        return api(error.config);
      });
    }

    isRefreshing = true;
    try {
      const formData = new URLSearchParams();
      formData.append('refreshToken', refreshToken);
      const res = await axios.post('/api/auth/refresh', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const newAccess = res.data.access_token;
      localStorage.setItem('accessToken', newAccess);
      if (res.data.refresh_token) localStorage.setItem('refreshToken', res.data.refresh_token);
      processQueue(null, newAccess);
      error.config.headers.Authorization = `Bearer ${newAccess}`;
      return api(error.config);
    } catch (refreshError) {
      processQueue(refreshError);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// [용도] Create account / [호출] SignupPage.jsx
export const signup = (email, password, nickname) =>
  api.post('/api/auth/signup', { email, password, nickname });

// [용도] Sign in → 토큰 Save / [호출] LoginPage.jsx
export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  // Spring Boot SNAKE_CASE Settings으로 인해 access_token, refresh_token, user_id로 응답됨
  const { access_token, refresh_token, user_id } = response.data;
  localStorage.setItem('accessToken', access_token);
  localStorage.setItem('refreshToken', refresh_token);
  localStorage.setItem('userId', user_id);
  return response.data;
};

// [용도] 로그아웃 → 토큰 Delete / [호출] useAuthStore
export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // 이미 만료된 토큰이어도 로컬 토큰은 Delete
  } finally {
    clearRequestCache();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
  }
};

// [용도] RefreshToken으로 AccessToken 미리 재create / [호출] useActivityRefresh(활동 기반 갱신)
// 인터셉터의 401 반응형 갱신과 별로, 활동 감지 시 능동적으로 갱신하여 세션을 연장
let proactiveRefreshPromise = null;

export const refreshAccessToken = async () => {
  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }

  proactiveRefreshPromise = (async () => {
    try {
      const formData = new URLSearchParams({ refreshToken });
      const response = await axios.post('/api/auth/refresh', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const data = response.data;
      localStorage.setItem('accessToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
      if (data.user_id) localStorage.setItem('userId', data.user_id);
      return true;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      return false;
    } finally {
      proactiveRefreshPromise = null;
    }
  })();

  return proactiveRefreshPromise;
};

// [용도] 비밀번호 재Settings 이메일 발송 요청 / [호출] AuthModal.jsx
export const requestPasswordReset = (email) =>
  api.post('/api/auth/password-reset/request', { email });

// [용도] 토큰으로 Change password / [호출] ResetPasswordPage.jsx
export const resetPassword = (token, newPassword) =>
  api.post('/api/auth/password-reset/confirm', { token, new_password: newPassword });

export default api;
