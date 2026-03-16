// [파일 용도] 로그인 상태 전역 관리 (zustand)

import { create } from 'zustand';
import { logout as logoutApi } from '../api/authApi';

// [용도] 로그인 여부, 로그아웃 액션 전역 상태 / [호출] LoginPage, 헤더 등
const useAuthStore = create((set) => ({
  isLoggedIn: !!localStorage.getItem('accessToken'),

  setLoggedIn: () => set({ isLoggedIn: true }),

  logout: async () => {
    await logoutApi();
    set({ isLoggedIn: false });
  },
}));

export default useAuthStore;
