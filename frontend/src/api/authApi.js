// [파일 용도] 인증 관련 API 호출 함수 모음

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// [용도] 요청마다 AccessToken 자동 첨부 / [호출] axios 인터셉터 자동 실행
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// [용도] 회원가입 / [호출] SignupPage.jsx
export const signup = (email, password, nickname) =>
  api.post('/api/auth/signup', { email, password, nickname });

// [용도] 로그인 → 토큰 저장 / [호출] LoginPage.jsx
export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  return response.data;
};

// [용도] 로그아웃 → 토큰 삭제 / [호출] useAuthStore
export const logout = async () => {
  await api.post('/api/auth/logout');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export default api;
