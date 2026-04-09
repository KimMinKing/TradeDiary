// [파일 용도] 인증 관련 API 호출 함수 모음

import axios from 'axios';

// VITE_API_URL 미설정 시:
//   - 개발(npm run dev): Vite 프록시 또는 localhost:8080 직접 접근
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

// [용도] 401 응답 시 RefreshToken으로 AccessToken 재발급 후 원래 요청 재시도 / [호출] axios 인터셉터 자동 실행
// 재발급 실패 또는 로그인/회원가입 API 401은 로그아웃 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/');
    if (error.response?.status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      window.location.href = '/';
      return Promise.reject(error);
    }

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
      const res = await axios.post('/api/auth/refresh', { refreshToken });
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

// [용도] 회원가입 / [호출] SignupPage.jsx
export const signup = (email, password, nickname) =>
  api.post('/api/auth/signup', { email, password, nickname });

// [용도] 로그인 → 토큰 저장 / [호출] LoginPage.jsx
export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  // Spring Boot SNAKE_CASE 설정으로 인해 access_token, refresh_token으로 응답됨
  const { access_token, refresh_token } = response.data;
  localStorage.setItem('accessToken', access_token);
  localStorage.setItem('refreshToken', refresh_token);
  return response.data;
};

// [용도] 로그아웃 → 토큰 삭제 / [호출] useAuthStore
export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // 이미 만료된 토큰이어도 로컬 토큰은 삭제
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

// [용도] 비밀번호 재설정 이메일 발송 요청 / [호출] AuthModal.jsx
export const requestPasswordReset = (email) =>
  api.post('/api/auth/password-reset/request', { email });

// [용도] 토큰으로 비밀번호 변경 / [호출] ResetPasswordPage.jsx
export const resetPassword = (token, newPassword) =>
  api.post('/api/auth/password-reset/confirm', { token, new_password: newPassword });

export default api;
