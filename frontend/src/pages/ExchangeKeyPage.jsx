// [파일 용도] 거래소 API Key 관리 페이지 (관리 → 선택 → 연결 3단계)

import { useState, useEffect } from 'react';
import { saveExchangeKey, getMyExchangeKeys, deleteExchangeKey } from '../api/exchangeApi';

// [상수] 거래소별 설정
const EXCHANGE_CONFIG = {
  UPBIT: {
    label: 'Upbit',
    color: '#3b82f6',
    activeClass: 'active-upbit',
    guide: 'Upbit → 마이페이지 → Open API 관리에서 자산조회, 주문조회 권한으로 발급하세요.',
    apiKeyPlaceholder: 'Access Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BYBIT: {
    label: 'Bybit',
    color: '#f97316',
    activeClass: 'active-bybit',
    guide: 'Bybit → 계정 → API 관리에서 포지션, 주문, 거래 조회 권한으로 발급하세요.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BITGET: {
    label: 'Bitget',
    color: '#00c0a3',
    activeClass: 'active-bitget',
    guide: 'Bitget → API Key 관리에서 읽기전용 권한으로 발급하세요. Passphrase는 API Key 생성 시 직접 설정한 비밀번호입니다.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: true,
  },
  OKX: {
    label: 'OKX',
    color: '#e4a400',
    activeClass: 'active-okx',
    guide: 'OKX → 계정 → API → API Key 생성에서 Read 권한으로 발급하세요. Passphrase는 API Key 생성 시 직접 설정한 비밀번호입니다.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: true,
  },
  BINANCE: {
    label: 'Binance',
    color: '#f0b90b',
    activeClass: 'active-binance',
    guide: 'Binance → 계정 → API 관리에서 읽기 권한(선물 거래 내역 조회)으로 발급하세요. IP 제한 설정을 권장합니다.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BINGX: {
    label: 'BingX',
    color: '#1db8c0',
    activeClass: 'active-bingx',
    guide: 'BingX → 사용자센터 → API 관리에서 읽기 전용 권한으로 발급하세요. IP 화이트리스트 설정을 권장합니다.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
};

// [컴포넌트] 거래소 API Key 관리 화면 / [호출] App.jsx 라우터
const ExchangeKeyPage = () => {
  // step: 'manage' | 'select' | 'connect'
  const [step,                setStep]                = useState('manage');
  const [selectedExchange,    setSelectedExchange]    = useState(null);
  const [apiKey,              setApiKey]              = useState('');
  const [secretKey,           setSecretKey]           = useState('');
  const [passphrase,          setPassphrase]          = useState('');
  const [registeredExchanges, setRegisteredExchanges] = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [message,             setMessage]             = useState('');
  const [error,               setError]               = useState('');

  useEffect(() => { fetchRegisteredKeys(); }, []);

  // [용도] 등록된 거래소 목록 조회 / [호출] useEffect, handleSubmit, handleDelete
  const fetchRegisteredKeys = async () => {
    try {
      const res = await getMyExchangeKeys();
      const data = res.data.map((item) =>
        typeof item === 'string' ? { exchange: item, maskedApiKey: null } : item
      );
      setRegisteredExchanges(data);
    } catch (e) {
      console.error(e);
    }
  };

  // [용도] 연결하기 버튼 클릭 → connect 단계로 / [호출] 선택 화면
  const handleGoConnect = () => {
    if (!selectedExchange) return;
    setApiKey('');
    setSecretKey('');
    setPassphrase('');
    setMessage('');
    setError('');
    setStep('connect');
  };

  // [용도] API Key 등록 제출 / [호출] form onSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await saveExchangeKey(selectedExchange, apiKey.trim(), secretKey.trim(), passphrase.trim() || null);
      setMessage(`${EXCHANGE_CONFIG[selectedExchange].label} API Key가 등록되었습니다.`);
      setApiKey('');
      setSecretKey('');
      setPassphrase('');
      localStorage.setItem(`syncStartTime_${selectedExchange}`, Date.now());
      fetchRegisteredKeys();
      // 등록 성공 후 1.2초 뒤 관리 화면으로 복귀
      setTimeout(() => { setStep('manage'); setSelectedExchange(null); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] API Key 삭제 / [호출] 관리 화면 삭제 버튼
  const handleDelete = async (exchange) => {
    if (!window.confirm(`${exchange} API Key를 삭제할까요?`)) return;
    try {
      await deleteExchangeKey(exchange);
      fetchRegisteredKeys();
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  // ── 관리 화면 ──────────────────────────────────────────────────
  if (step === 'manage') {
    return (
      <div className="page" style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="syne page-title">거래소 관리</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '4px' }}>
            연동된 거래소의 API Key를 관리합니다
          </p>
        </div>

        {/* 연동된 거래소 목록 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <p className="section-title" style={{ marginBottom: '16px' }}>연동된 거래소</p>
          {registeredExchanges.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div className="empty-state-icon">🔗</div>
              <p className="empty-state-title">연동된 거래소가 없습니다</p>
              <p className="empty-state-desc">아래 버튼을 눌러 거래소를 연결하세요</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registeredExchanges.map((item) => {
                const cfg = EXCHANGE_CONFIG[item.exchange];
                if (!cfg) return null;
                return (
                  <div key={item.exchange} className="exmgr-row">
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={`/exchanges/${item.exchange.toLowerCase()}_logo.png`}
                        alt={cfg.label}
                        style={{ height: '20px', width: 'auto', objectFit: 'contain', opacity: 0.9 }}
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }}
                      />
                      <span className="syne" style={{ fontWeight: 700, fontSize: '15px', display: 'none' }}>{cfg.label}</span>
                      {item.maskedApiKey && (
                        <span className="mono text-muted" style={{ fontSize: '12px', marginLeft: '10px' }}>
                          {item.maskedApiKey}
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '13px', padding: '4px 10px', color: 'var(--text-muted)' }}
                      onClick={() => {
                        setSelectedExchange(item.exchange);
                        setStep('connect');
                        setApiKey(''); setSecretKey(''); setPassphrase('');
                        setMessage(''); setError('');
                      }}
                    >
                      재연결
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '13px', padding: '4px 10px' }}
                      onClick={() => handleDelete(item.exchange)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* IP 화이트리스트 안내 */}
        <div style={{
          margin: '16px 0',
          padding: '14px 16px',
          borderRadius: '10px',
          background: 'var(--warning-bg)',
          border: '2px solid var(--warning-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--warning)' }}>IP 화이트리스트 설정 필수</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--warning-text)', lineHeight: '1.7', margin: 0 }}>
            거래소 API Key 발급 시 <strong style={{ color: 'var(--warning)' }}>IP 제한(화이트리스트)</strong> 설정이 있다면
            아래 서버 IP를 반드시 추가하세요.<br />
            추가하지 않으면 데이터 동기화가 되지 않습니다.
          </p>
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '15px',
            color: 'var(--warning)',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            152.69.206.56
          </div>
        </div>

        {/* 거래소 연결 버튼 */}
        <button
          className="btn btn-primary btn-full"
          onClick={() => { setSelectedExchange(null); setStep('select'); }}
        >
          + 거래소 연결
        </button>
      </div>
    );
  }

  // ── 거래소 선택 화면 ──────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="page" style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep('manage')}>← 뒤로</button>
          <div>
            <h1 className="syne page-title">거래소 선택</h1>
            <p className="text-sm text-secondary" style={{ marginTop: '2px' }}>연결할 거래소를 선택하세요</p>
          </div>
        </div>

        {/* 2열 그리드 */}
        <div className="exsel-grid" style={{ marginBottom: '24px' }}>
          {Object.entries(EXCHANGE_CONFIG).map(([key, cfg]) => {
            const isRegistered = registeredExchanges.some((r) => r.exchange === key);
            const isSelected   = selectedExchange === key;
            return (
              <button
                key={key}
                className={`exsel-btn${isSelected ? ' exsel-selected' : ''}`}
                style={isSelected ? { borderColor: cfg.color, background: `${cfg.color}18` } : {}}
                onClick={() => setSelectedExchange(key)}
              >
                <img
                  src={`/exchanges/${key.toLowerCase()}_logo.png`}
                  alt={cfg.label}
                  style={{ height: '22px', width: 'auto', objectFit: 'contain', maxWidth: '90px' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                />
                <span className="syne" style={{ fontSize: '16px', fontWeight: 700, display: 'none' }}>{cfg.label}</span>
                {isRegistered && (
                  <span className="exsel-badge" style={{ background: cfg.color }}>연동됨</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 연결하기 버튼 */}
        <button
          className="btn btn-primary btn-full"
          disabled={!selectedExchange}
          onClick={handleGoConnect}
        >
          {selectedExchange
            ? `${EXCHANGE_CONFIG[selectedExchange].label} 연결하기`
            : '거래소를 선택하세요'}
        </button>
      </div>
    );
  }

  // ── API Key 입력 화면 ─────────────────────────────────────────
  const config       = EXCHANGE_CONFIG[selectedExchange];
  const isRegistered = registeredExchanges.some((r) => r.exchange === selectedExchange);

  return (
    <div className="page" style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setStep('select')}>← 뒤로</button>
        <div>
          <h1 className="syne page-title">{config.label} 연결</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '2px' }}>API Key를 입력하세요</p>
        </div>
      </div>

      <div className="card">
        {/* 이미 연동된 경우 안내 */}
        {isRegistered && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span style={{ fontSize: '13px', color: '#fbbf24' }}>이미 연동된 거래소입니다. 입력 시 기존 Key를 덮어씁니다.</span>
          </div>
        )}

        <p className="text-xs text-muted" style={{ marginBottom: '16px', lineHeight: '1.7' }}>
          {config.guide}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">{config.apiKeyPlaceholder}</label>
            <input
              className="input"
              type="text"
              placeholder={config.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="input-label">{config.secretKeyPlaceholder}</label>
            <input
              className="input"
              type="password"
              placeholder={config.secretKeyPlaceholder}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {config.hasPassphrase && (
            <div>
              <label className="input-label">Passphrase</label>
              <input
                className="input"
                type="password"
                placeholder="API Key 생성 시 설정한 Passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error   && <p className="msg-error">{error}</p>}
          {message && <p className="msg-success">{message}</p>}

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? '등록 중...' : `${config.label} API Key 등록`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExchangeKeyPage;
