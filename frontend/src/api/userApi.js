// [파일 용도] 사용자 프로필 조회 및 변경 API 호출

import api from './authApi';

// [용도] 현재 사용자 정보 조회 / [호출] Navbar.jsx, SettingsPanel.jsx
export const getMe = () =>
  api.get('/api/user/me');

// [용도] 닉네임 변경 / [호출] SettingsPanel.jsx
export const updateNickname = (nickname) =>
  api.patch('/api/user/nickname', { nickname });

// [용도] 비밀번호 변경 / [호출] SettingsPanel.jsx
export const updatePassword = (currentPassword, newPassword) =>
  api.patch('/api/user/password', { current_password: currentPassword, new_password: newPassword });

// [용도] 프로필 아바타 변경 (base64) / [호출] SettingsPanel.jsx
export const updateAvatar = (avatar) =>
  api.patch('/api/user/avatar', { avatar });
