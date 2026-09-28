// [파일 용도] Sign in 상태 전역 관리 (zustand)

import { create } from 'zustand';
import { logout as logoutApi } from '../api/authApi';
import { getTokenExpirationMs, getTokenUserId } from '../utils/jwt';

// [용도] JWT 토큰의 만료 여부 Confirm (서버 요청 없이 클라이언트에서 검사)
const isTokenValid = () => {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!token) return Boolean(refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined');
  const expiresAt = getTokenExpirationMs(token);
  return (expiresAt !== null && expiresAt > Date.now())
    || Boolean(refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined');
};

// [용도] JWT 토큰에서 userId 추출 (sub 클레임) / [호출] Navbar.jsx 등 userId 필요 컴포넌트
export const getUserId = () => {
  const token = localStorage.getItem('accessToken');
  const tokenUserId = getTokenUserId(token);
  if (tokenUserId) {
    localStorage.setItem('userId', String(tokenUserId));
    return tokenUserId;
  }
  const storedUserId = Number(localStorage.getItem('userId'));
  return Number.isSafeInteger(storedUserId) && storedUserId > 0 ? storedUserId : null;
};

// [용도] Sign in 여부, 로그아웃 액션 전역 상태 / [호출] App.jsx, Navbar.jsx 등
const useAuthStore = create((set) => ({
  isLoggedIn: isTokenValid(),

  setLoggedIn: () => set({ isLoggedIn: true }),

  // [용도] 토큰 만료 여부 재Confirm (페이지 포커스 복귀 시 호출)
  checkAuth: () => set({ isLoggedIn: isTokenValid() }),

  logout: async () => {
    await logoutApi();
    set({ isLoggedIn: false });
  },
}));

export default useAuthStore;
