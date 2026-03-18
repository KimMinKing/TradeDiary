// [파일 용도] 대시보드 페이지 (로그인 후 메인 화면)

import { useNavigate } from 'react-router-dom';

// 퀵 액션 카드 데이터
const ACTIONS = [
  {
    title: '거래 내역',
    desc: '동기화된 체결 내역을 조회하고 필터링합니다',
    icon: '≡',
    path: '/trades',
    accent: 'var(--accent)',
  },
  {
    title: '포지션',
    desc: '완결된 포지션 손익·승률을 분석합니다',
    icon: '◈',
    path: '/positions',
    accent: '#4ade80',
  },
  {
    title: '통계',
    desc: '승률·손익비·시간대별 성과를 한눈에 파악합니다',
    icon: '◫',
    path: '/stats',
    accent: '#facc15',
  },
  {
    title: '매매 일기',
    desc: '감정·전략 태그로 매매를 기록하고 패턴을 발견합니다',
    icon: '◧',
    path: '/journal',
    accent: '#a78bfa',
  },
  {
    title: '거래소 연동',
    desc: 'Upbit · Bybit API Key를 등록하고 관리합니다',
    icon: '⚙',
    path: '/exchange-keys',
    accent: '#60a5fa',
  },
];

// [컴포넌트] 로그인 후 메인 화면 / [호출] App.jsx 라우터
const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* 헤더 */}
      <div className="anim-fade-up" style={{ marginBottom: '32px' }}>
        <h1
          className="syne"
          style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}
        >
          대시보드
        </h1>
        <p className="text-secondary text-sm">
          거래소를 연동하고 거래 내역을 분석하세요
        </p>
      </div>

      {/* 퀵 액션 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {ACTIONS.map((action, i) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`card anim-fade-up${i + 1 > 1 ? String(i + 1) : ''}`}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              background: 'var(--bg-card)',
              transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
              animation: `fadeUp 0.35s ease ${i * 0.07}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = action.accent;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div
              style={{
                fontSize: '28px',
                marginBottom: '14px',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `rgba(0,0,0,0.25)`,
                borderRadius: '10px',
                color: action.accent,
                border: `1px solid ${action.accent}22`,
              }}
            >
              {action.icon}
            </div>
            <div
              className="syne"
              style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}
            >
              {action.title}
            </div>
            <p className="text-sm text-secondary">{action.desc}</p>
          </button>
        ))}
      </div>

      {/* Coming soon 섹션 */}
      <div style={{ marginTop: '32px' }}>
        <p className="section-title">곧 출시 예정</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {['AI 리포트'].map((label) => (
            <div
              key={label}
              className="card"
              style={{
                opacity: 0.4,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 18px',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>◻</span>
              <span className="text-sm text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
