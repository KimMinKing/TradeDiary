// [파일 용도] 다크/라이트 테마 전환 훅 (시스템 설정 우선, localStorage 저장)

import { useState, useEffect } from 'react';

const THEME_KEY = 'theme';

// [용도] 시스템 prefers-color-scheme 감지 후 테마 초기값 결정 / [호출] useTheme
const getInitialTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// [용도] 테마 상태 관리 및 html[data-theme] 적용 / [호출] SettingsPanel.jsx, App.jsx
const useTheme = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // [용도] 수동 미설정 시 시스템 테마 변경 감지 / [호출] useEffect
  useEffect(() => {
    if (localStorage.getItem(THEME_KEY)) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
};

export default useTheme;
