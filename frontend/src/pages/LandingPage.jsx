// [파일 용도] 메인 랜딩 페이지 (서비스 소 + Sign in/Create account 모달)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import useAuthStore from '../store/authStore';
import { getMe } from '../api/userApi';
import brandLogo from '../assets/logo1.png';

const FEATURES = [
  {
    icon: '⟳',
    title: 'Automatic trade sync',
    desc: 'Connect a read-only API key and keep your trade history up to date.',
  },
  {
    icon: '◈',
    title: 'Portfolio analytics',
    desc: 'See realized P&L, win rate and performance across every connected exchange.',
  },
  {
    icon: '📓',
    title: 'Trading journal',
    desc: 'Capture your decisions, emotions and strategy beside the trades that shaped them.',
  },
  {
    icon: '📊',
    title: 'AI performance review',
    desc: 'Turn your trading history into clear patterns, risks and practical next steps.',
  },
];

const EXCHANGES = [
  { name: 'Upbit',   color: '#3b82f6', desc: 'KRW spot' },
  { name: 'Bybit',   color: '#f97316', desc: 'Futures & spot' },
  { name: 'Bitget',  color: '#00c0a3', desc: 'Futures' },
  { name: 'OKX',     color: '#e4a400', desc: 'Swap & futures' },
  { name: 'Binance', color: '#f0b90b', desc: 'USDT-M futures' },
  { name: 'BingX',   color: '#1db8c0', desc: 'USDT-M futures' },
  { name: 'Kraken',  color: '#7c6cf2', desc: 'Global spot' },
];

const STEPS = [
  {
    num: '01',
    title: 'Connect',
    desc: 'Add a read-only exchange API key. Your credentials stay encrypted.',
  },
  {
    num: '02',
    title: 'Review',
    desc: 'See what works by market, session, strategy and position.',
  },
  {
    num: '03',
    title: 'Improve',
    desc: 'Use your journal and AI review to make the next decision better.',
  },
];

// [컴포넌트] 서비스 메인 랜딩 페이지 / [호출] App.jsx 라우터
const LandingPage = () => {
  const [modal, setModal] = useState(null); // null | 'login' | 'signup'
  const [profile, setProfile] = useState({ nickname: '', avatar: null });
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const navigate = useNavigate();

  // Sign in 상태로 랜딩 페이지 접속 시 대시보드로 이동
  useEffect(() => {
    if (isLoggedIn) navigate('/dashboard', { replace: true });
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMe().then((res) => setProfile(res.data)).catch(() => {});
  }, [isLoggedIn]);

  const avatarContent = profile.avatar
    ? <img src={profile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : (profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?');

  return (
    <div className="landing-wrap">

      {/* ── 상단 네비 ── */}
      <nav className="landing-nav">
        <span className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img className="landing-brand-image" src={brandLogo} alt="Trade Diary" />
          Trade Diary
        </span>
        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <button
              className="avatar-btn"
              onClick={() => navigate('/settings?tab=profile')}
              title="Settings"
            >
              {avatarContent}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('signup')}>
              Start free
            </button>
          )}
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">A clearer way to improve your trading</span>
          <h1 className="landing-title">
            Your trades.<br />
            <span className="landing-title-accent">Your edge.</span>
          </h1>
          <p className="landing-desc">
            Sync your trades, review every decision and understand what actually drives your performance.
          </p>
          {!isLoggedIn ? (
            <div className="landing-cta">
              <button className="btn btn-primary btn-lg" onClick={() => setModal('signup')}>
                Start free
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => setModal('login')}>
                Sign in
              </button>
            </div>
          ) : (
            <div className="landing-cta">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/journal')}>
                Write today’s journal
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/trades')}>
                View trade history
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Supported Exchange ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">Supported exchanges</p>
          <div className="landing-exchanges-grid">
            {EXCHANGES.map((ex) => (
              <div key={ex.name} className="landing-exchange-card">
                <img
                  src={`/exchanges/${ex.name.toLowerCase()}_logo.png`}
                  alt={ex.name}
                  style={{ height: '20px', width: 'auto', objectFit: 'contain', maxWidth: '80px', marginBottom: '2px' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                />
                <span className="landing-exchange-name" style={{ display: 'none' }}>{ex.name}</span>
                <span className="landing-exchange-desc">{ex.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">How it works</p>
          <h2 className="landing-section-title">From execution to insight</h2>
          <div className="landing-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="landing-step">
                <span className="landing-step-num">{step.num}</span>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-desc">{step.desc}</p>
                {i < STEPS.length - 1 && <span className="landing-step-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 카드 ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">Core features</p>
          <h2 className="landing-section-title">Everything you need to review your edge</h2>
          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="landing-feature-card">
                <span className="landing-feature-icon">{f.icon}</span>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA 하단 ── */}
      <section className="landing-section landing-cta-section">
        <div className="landing-container" style={{ textAlign: 'center' }}>
          {isLoggedIn ? (
            <>
              <h2 className="landing-section-title">Review today’s decisions</h2>
              <p className="landing-desc" style={{ marginBottom: '28px' }}>
                Add context to your trades while the details are still fresh.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/journal')}>
                Write today’s journal
              </button>
            </>
          ) : (
            <>
              <h2 className="landing-section-title">Build a better trading process</h2>
              <p className="landing-desc" style={{ marginBottom: '28px' }}>
                Connect your history and turn every trade into useful feedback.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => setModal('signup')}>
                Start free
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="landing-footer">
        <span className="landing-nav-logo" style={{ fontSize: '14px' }}>Trade Diary</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          © 2026 Trade Diary. Trading involves risk.
        </span>
      </footer>

      {/* ── 인증 모달 ── */}
      {modal && (
        <AuthModal initialMode={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default LandingPage;
