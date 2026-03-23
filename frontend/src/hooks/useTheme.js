// [파일 용도] 다크/라이트 테마 전환 훅 (localStorage 저장)

import { useState, useEffect } from 'react';

const THEME_KEY = 'theme';

// [용도] 테마 상태 관리 및 html[data-theme] 적용 / [호출] SettingsPanel.jsx, Navbar.jsx
const useTheme = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
};

export default useTheme;
