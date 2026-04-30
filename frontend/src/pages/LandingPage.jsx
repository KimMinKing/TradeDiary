// [파일 용도] 메인 랜딩 페이지 (서비스 소개 + 로그인/회원가입 모달)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import useAuthStore from '../store/authStore';
import SettingsPanel from '../components/SettingsPanel';
import { getMe } from '../api/userApi';

const FEATURES = [
  {
    icon: '⟳',
    title: '거래소 자동 동기화',
    desc: 'API Key 등록 한 번으로 체결 내역을 자동 수집합니다. 30초~5분 주기로 실시간 갱신.',
  },
  {
    icon: '◈',
    title: '포지션 손익 분석',
    desc: '매수·매도를 자동으로 묶어 실제 수익률과 손익금을 계산합니다. 승률도 한눈에.',
  },
  {
    icon: '📓',
    title: '매매 일기',
    desc: '진입 이유, 감정, 전략 태그를 기록하세요. 거래 내역을 직접 연결해 근거를 남길 수 있습니다.',
  },
  {
    icon: '📊',
    title: '통계 & AI 리포트',
    desc: '시간대별 성과, 종목별 승률, 연속 손실 구간을 분석합니다. AI가 패턴을 찾아 개선안을 제시합니다.',
  },
];

const EXCHANGES = [
  { name: 'Upbit',   color: '#3b82f6', desc: '원화 현물' },
  { name: 'Bybit',   color: '#f97316', desc: '선물·현물' },
  { name: 'Bitget',  color: '#00c0a3', desc: '선물 통합' },
  { name: 'OKX',     color: '#e4a400', desc: 'SWAP·선물' },
  { name: 'Binance', color: '#f0b90b', desc: 'USDT-M 선물' },
  { name: 'BingX',   color: '#1db8c0', desc: 'USDT-M 선물' },
];

const STEPS = [
  {
    num: '01',
    title: '거래소 API 연결',
    desc: '읽기 전용 API Key를 등록하면 모든 체결 내역이 자동으로 동기화됩니다.',
  },
  {
    num: '02',
    title: '패턴 발견',
    desc: '포지션 분석과 통계로 내가 어떤 시간대에, 어떤 종목에서 강한지 파악합니다.',
  },
  {
    num: '03',
    title: '전략 개선',
    desc: '매매 일기와 AI 리포트를 활용해 반복되는 실수를 줄이고 승률을 높입니다.',
  },
];

// [컴포넌트] 서비스 메인 랜딩 페이지 / [호출] App.jsx 라우터
const LandingPage = () => {
  const [modal, setModal] = useState(null); // null | 'login' | 'signup'
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState({ nickname: '', avatar: null });
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const navigate = useNavigate();

  // 로그인 상태로 랜딩 페이지 접속 시 대시보드로 이동
  useEffect(() => {
    if (isLoggedIn) navigate('/dashboard', { replace: true });
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMe().then((res) => setProfile(res.data)).catch(() => {});
  }, [isLoggedIn]);

  const avatarContent = profile.avatar
    ? <img src={profile.avatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : (profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?');

  return (
    <div className="landing-wrap">

      {/* ── 상단 네비 ── */}
      <nav className="landing-nav">
        <span className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/favicon.svg" alt="logo" style={{ width: '17px', height: '17px' }} />
          Trade Diary
        </span>
        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <button
              className="avatar-btn"
              onClick={() => setSettingsOpen((v) => !v)}
              title="설정"
            >
              {avatarContent}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('signup')}>
              무료 시작
            </button>
          )}
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">코인 트레이더를 위한 성장 분석 플랫폼</span>
          <h1 className="landing-title">
            거래를 기록하고<br />
            <span className="landing-title-accent">패턴을 발견하세요</span>
          </h1>
          <p className="landing-desc">
            거래소 API 자동 동기화부터 AI 분석 리포트까지.<br />
            매매 데이터를 기반으로 실력을 끌어올리세요.
          </p>
          {!isLoggedIn ? (
            <div className="landing-cta">
              <button className="btn btn-primary btn-lg" onClick={() => setModal('signup')}>
                무료로 시작하기
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => setModal('login')}>
                로그인
              </button>
            </div>
          ) : (
            <div className="landing-cta">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/journal')}>
                오늘 일기 기록하기
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/trades')}>
                거래 내역 보기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 지원 거래소 ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">지원 거래소</p>
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

      {/* ── 성장 흐름 ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">어떻게 성장하나요</p>
          <h2 className="landing-section-title">3단계로 트레이딩을 개선합니다</h2>
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
          <p className="landing-section-eyebrow">주요 기능</p>
          <h2 className="landing-section-title">필요한 건 다 있습니다</h2>
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
              <h2 className="landing-section-title">오늘의 매매를 기록하세요</h2>
              <p className="landing-desc" style={{ marginBottom: '28px' }}>
                매매 일기를 작성하고 패턴을 발견하세요.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/journal')}>
                오늘 일기 기록하기
              </button>
            </>
          ) : (
            <>
              <h2 className="landing-section-title">지금 바로 시작하세요</h2>
              <p className="landing-desc" style={{ marginBottom: '28px' }}>
                무료로 가입하고 거래 데이터를 분석해보세요.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => setModal('signup')}>
                무료로 시작하기
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="landing-footer">
        <span className="landing-nav-logo" style={{ fontSize: '14px' }}>Trade Diary</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          © 2025 Trade Diary. 투자의 책임은 본인에게 있습니다.
        </span>
      </footer>

      {/* ── 인증 모달 ── */}
      {modal && (
        <AuthModal initialMode={modal} onClose={() => setModal(null)} />
      )}
      {isLoggedIn && settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
};

export default LandingPage;
