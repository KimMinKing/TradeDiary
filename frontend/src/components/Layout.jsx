// [파일 용도] 인증된 페이지의 공통 레이아웃 (Navbar 포함, 자동 동기화)

import { memo } from 'react';
import Navbar from './Navbar';
import useAutoSync from '../hooks/useAutoSync';

// [컴포넌트] children을 memo로 감싸 autoSync 상태 변경 시 페이지 리렌더 방지
const PageContent = memo(({ children }) => <>{children}</>);

// [컴포넌트] private 페이지 공통 래퍼 / [호출] App.jsx
// useAutoSync 상태(isSyncing, lastSyncAt) 변경 → Navbar만 리렌더, 페이지는 유지
const Layout = ({ children }) => {
  const autoSync = useAutoSync();

  return (
    <>
      <Navbar autoSync={autoSync} />
      <PageContent>{children}</PageContent>
    </>
  );
};

export default Layout;
