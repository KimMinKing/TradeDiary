// [파일 용도] 사용자 Profile 조회 및 변경 API 호출

import api from './authApi';

// [용도] 현재 사용자 정보 조회 / [호출] Navbar.jsx, SettingsPanel.jsx
export const getMe = () =>
  api.get('/api/user/me');

// [용도] Change display name / [호출] SettingsPanel.jsx
export const updateNickname = (nickname) =>
  api.patch('/api/user/nickname', { nickname });

// [용도] Change password / [호출] SettingsPanel.jsx
export const updatePassword = (currentPassword, newPassword) =>
  api.patch('/api/user/password', { current_password: currentPassword, new_password: newPassword });

// [용도] Profile 아바타 변경 (base64) / [호출] SettingsPanel.jsx
export const updateAvatar = (avatar) =>
  api.patch('/api/user/avatar', { avatar });

export const updatePrivacy = (privacy) =>
  api.put('/api/user/privacy', privacy);

export const updateLanguage = (language) =>
  api.patch('/api/user/language', { language });
