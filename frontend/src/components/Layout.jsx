// [파일 용도] 인증된 페이지의 공통 셸 레이아웃 (사이드바 + 메인, 자동 Sync)

import { memo } from 'react';
import Navbar from './Navbar';
import useAutoSync from '../hooks/useAutoSync';
import useActivityRefresh from '../hooks/useActivityRefresh';
import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_META = {
  '/dashboard': ['Overview', 'Your trading performance at a glance'],
  '/positions': ['Portfolio', 'Positions, holdings and execution history'],
  '/stats': ['Analytics', 'Performance patterns and risk metrics'],
  '/journal': ['Journal', 'Plans, reviews and trading decisions'],
  '/community': ['Community', 'Share market ideas and discuss trading decisions'],
  '/ranking': ['Ranking', 'Compare verified performance with other traders'],
  '/exchange-keys': ['Connections', 'Manage read-only exchange integrations'],
  '/settings': ['Settings', 'Profile, appearance and preferences'],
};

// [컴포넌트] children을 memo로 감싸 Sync 상태와 무관하게 페이지 리렌더 방지
const PageContent = memo(({ children }) => <>{children}</>);

// [컴포넌트] private 페이지 공통 셸 래퍼 / [호출] App.jsx
// useAutoSync는 백그라운드 Trade Sync 부작용만 사용 (상태는 사이드바에서 미사용)
const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [title, description] = PAGE_META[location.pathname] ?? ['Trade Diary', 'Professional trading workspace'];
  const isTraderNetwork = location.pathname === '/ranking' || location.pathname === '/community';
  useAutoSync();
  // 사용자 활동 기반 AccessToken 갱신 (슬라이딩 세션) — 비활성 시엔 기존 30분 만료 유지
  useActivityRefresh();

  return (
    <div className="app-shell">
      <Navbar />
      <div className="workspace-shell">
        <header className="workspace-header">
          <div className="workspace-header-inner"><div className="workspace-heading">
            <span className="workspace-kicker">{isTraderNetwork ? 'TRADER NETWORK' : `TRADE DIARY / ${title.toUpperCase()}`}</span>
            <div><h1>{title}</h1><p>{description}</p></div>
          </div>
          <div className="workspace-actions">
            <span className="workspace-live"><i /> Live sync</span>
            {!isTraderNetwork && <button className="workspace-action" onClick={() => navigate('/exchange-keys')}>Connections</button>}
            {!isTraderNetwork && <button className="workspace-action primary" onClick={() => navigate('/journal')}><span>+</span> New journal</button>}
          </div></div>
        </header>
        <main className="app-main">
          <PageContent>{children}</PageContent>
        </main>
      </div>
    </div>
  );
};

export default Layout;
