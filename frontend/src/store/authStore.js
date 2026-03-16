// [파일 용도] 로그인 상태 전역 관리 (zustand)

import { create } from 'zustand';
import { logout as logoutApi } from '../api/authApi';

// [용도] JWT 토큰의 만료 여부 확인 (서버 요청 없이 클라이언트에서 검사)
const isTokenValid = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  try {
    // JWT payload는 base64url 인코딩 → 디코딩 후 exp(만료 시각, 초 단위) 확인
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

// [용도] 로그인 여부, 로그아웃 액션 전역 상태 / [호출] App.jsx, Navbar.jsx 등
const useAuthStore = create((set) => ({
  isLoggedIn: isTokenValid(),

  setLoggedIn: () => set({ isLoggedIn: true }),

  // [용도] 토큰 만료 여부 재확인 (페이지 포커스 복귀 시 호출)
  checkAuth: () => set({ isLoggedIn: isTokenValid() }),

  logout: async () => {
    await logoutApi();
    set({ isLoggedIn: false });
  },
}));

export default useAuthStore;
