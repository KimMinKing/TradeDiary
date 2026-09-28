// [파일 용도] Exchange API Key 관리 페이지 (관리 → 선택 → 연결 3단계)

import { useState, useEffect, useRef } from 'react';
import { siBinance, siOkx } from 'simple-icons';
import { saveExchangeKey, getMyExchangeKeys, deleteExchangeKey, syncTrades, getSyncStatus } from '../api/exchangeApi';
import { invalidateCache } from '../api/requestCache';

// [상수] Exchange별 Settings
const EXCHANGE_CONFIG = {
  UPBIT: {
    label: 'Upbit',
    color: '#3b82f6',
    activeClass: 'active-upbit',
    guide: 'Upbit → My Page → Open API Management. Enable the View Assets and View Orders permissions.',
    apiKeyPlaceholder: 'Access Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BYBIT: {
    label: 'Bybit',
    color: '#f97316',
    activeClass: 'active-bybit',
    guide: 'Bybit → Account → API Management. Enable read access for positions, orders, and executions.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BITGET: {
    label: 'Bitget',
    color: '#00c0a3',
    activeClass: 'active-bitget',
    guide: 'Bitget → API Key Management. Create a read-only key. The passphrase is the password you set when creating the key.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: true,
  },
  OKX: {
    label: 'OKX',
    color: '#e4a400',
    activeClass: 'active-okx',
    guide: 'OKX → Account → API → Create API Key. Enable Read permission. The passphrase is the password you set when creating the key.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: true,
  },
  BINANCE: {
    label: 'Binance',
    color: '#f0b90b',
    activeClass: 'active-binance',
    guide: 'Binance → Account → API Management. Enable read access for futures execution history. An IP restriction is recommended.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  BINGX: {
    label: 'BingX',
    color: '#1db8c0',
    activeClass: 'active-bingx',
    guide: 'BingX → User Center → API Management. Create a read-only key. An IP allowlist is recommended.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
    hasPassphrase: false,
  },
  KRAKEN: {
    label: 'Kraken',
    color: '#7252f3',
    activeClass: 'active-kraken',
    guide: 'For Kraken, enable Query Funds and Query Closed Orders & Trades. Withdrawal permission is not required.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Private Key (Base64)',
    hasPassphrase: false,
  },
};

const EXCHANGE_MARKS = {
  UPBIT: { label: 'UP', color: '#1261c9' },
  BYBIT: { label: 'BY', color: '#f7a600' },
  BITGET: { label: 'BG', color: '#00b8a9' },
  OKX: { icon: siOkx, color: '#111827' },
  BINANCE: { icon: siBinance, color: '#f0b90b' },
  BINGX: { label: 'BX', color: '#10a7b5' },
  KRAKEN: { label: 'KR', color: '#5741d9' },
};

const ExchangeMark = ({ exchange, size = 24 }) => {
  const mark = EXCHANGE_MARKS[exchange] || { label: 'EX', color: '#64748b' };
  return (
    <span className="exchange-brand-mark" style={{ width: size, height: size, '--exchange-color': mark.color }}>
      {mark.icon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={mark.icon.path} fill="currentColor" />
        </svg>
      ) : (
        <span>{mark.label}</span>
      )}
    </span>
  );
};

const SERVER_IP = '152.69.206.56';

// CSS-in-JS 스타일
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// [컴포넌트] Exchange API Key 관리 화면 / [호출] App.jsx 라우터
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
  const [ipCopied,            setIpCopied]            = useState(false);
  const [syncStates,          setSyncStates]          = useState({});
  const latestReadyRef = useRef({});

  useEffect(() => {
    fetchRegisteredKeys();
    const refreshSyncState = async () => {
      try {
        const { data } = await getSyncStatus();
        const nextStates = Object.fromEntries((data.connections || []).map(item => [item.exchange, item]));
        for (const item of data.connections || []) {
          if (item.latest_ready && latestReadyRef.current[item.exchange] === false) {
            invalidateCache('dashboard', 'positions', 'trades', 'stats', 'balances');
            window.dispatchEvent(new CustomEvent('autoSyncComplete', { detail: { exchange: item.exchange } }));
          }
          latestReadyRef.current[item.exchange] = item.latest_ready;
        }
        setSyncStates(nextStates);
      } catch { /* The connections list remains usable if status polling fails. */ }
    };
    void refreshSyncState();
    const timer = window.setInterval(refreshSyncState, 3000);
    return () => window.clearInterval(timer);
  }, []);

  // [용도] Add된 Exchange 목록 조회 / [호출] useEffect, handleSubmit, handleDelete
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

  // [용도] Connect 버튼 클릭 → connect 단계로 / [호출] 선택 화면
  const handleGoConnect = () => {
    if (!selectedExchange) return;
    setApiKey('');
    setSecretKey('');
    setPassphrase('');
    setMessage('');
    setError('');
    setStep('connect');
  };

  // [용도] API Key Add 제출 / [호출] form onSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await saveExchangeKey(selectedExchange, apiKey.trim(), secretKey.trim(), passphrase.trim() || null);
      let syncMessage = `${EXCHANGE_CONFIG[selectedExchange].label} API Key registered.`;
      try {
        await syncTrades(selectedExchange);
        syncMessage += ' Loading your latest trades now. Full history will continue in the background.';
      } catch (syncErr) {
        syncMessage += ' Trade history sync can be retried later.';
        console.error(syncErr);
      }
      setMessage(syncMessage);
      setApiKey('');
      setSecretKey('');
      setPassphrase('');
      localStorage.setItem(`syncStartTime_${selectedExchange}`, Date.now());
      fetchRegisteredKeys();
      // ?? ?? ? 1.2? ? ?? ???? ??
      setTimeout(() => { setStep('manage'); setSelectedExchange(null); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] API Key Delete / [호출] 관리 화면 Delete 버튼
  const handleDelete = async (exchange) => {
    if (!window.confirm(`Delete the ${exchange} API key?`)) return;

    const shouldCleanup = window.confirm('Run cleanup mode?\n\nCleanup mode deletes all executions, positions, and journals imported from this exchange.\nCancel keeps execution history and deletes only positions.');

    try {
      await deleteExchangeKey(exchange, shouldCleanup);
      setMessage(shouldCleanup ? 'Connection and all imported exchange data were deleted.' : 'Connection and positions were deleted. Execution history was retained.');
      fetchRegisteredKeys();
    } catch {
      setError('Could not delete the exchange connection.');
    }
  };

  // ── 관리 화면 ──────────────────────────────────────────────────
  if (step === 'manage') {
    return (
      <div className="page exchange-connections-page">
        <div className="exchange-connections-heading">
          <h1 className="syne page-title">Exchange Connections</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '4px' }}>
            Manage read-only API connections
          </p>
        </div>

        {/* Connected Exchange 목록 */}
        <div className="card exchange-connections-card">
          <div className="exchange-connections-card-head">
            <p className="section-title">Connected exchanges</p>
            <span>{registeredExchanges.length} connected</span>
          </div>
          {registeredExchanges.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div className="empty-state-icon">🔗</div>
              <p className="empty-state-title">No connected exchanges</p>
              <p className="empty-state-desc">Use the button below to connect an exchange.</p>
            </div>
          ) : (
            <div className="exchange-connections-list">
              {registeredExchanges.map((item) => {
                const cfg = EXCHANGE_CONFIG[item.exchange];
                if (!cfg) return null;
                const syncState = syncStates[item.exchange];
                const syncLabel = item.reconnectRequired
                  ? 'Reconnect required'
                  : syncState?.status === 'ACTION_REQUIRED'
                  ? 'Connection needs attention'
                  : syncState?.status === 'BACKOFF'
                    ? 'Import paused — retrying'
                    : !syncState || syncState.sync_phase === 'READY'
                      ? 'Up to date'
                      : syncState.latest_ready
                        ? 'Importing history'
                        : 'Loading latest data';
                return (
                  <div key={item.exchange} className="exmgr-row">
                    <div className="exmgr-identity">
                      <ExchangeMark exchange={item.exchange} size={30} />
                      <div className="exmgr-name-key">
                        <span className="exmgr-name">{cfg.label}</span>
                        {item.maskedApiKey && <span className="exmgr-key">{item.maskedApiKey}</span>}
                      </div>
                    </div>
                    <div className={`exmgr-status${item.reconnectRequired || syncState?.status === 'ACTION_REQUIRED' ? ' is-warning' : ''}`}>
                      <span className="exmgr-status-dot" />
                      {syncLabel}
                    </div>
                    <div className="exmgr-actions">
                    <button
                      className="exmgr-action"
                      onClick={() => {
                        setSelectedExchange(item.exchange);
                        setStep('connect');
                        setApiKey(''); setSecretKey(''); setPassphrase('');
                        setMessage(''); setError('');
                      }}
                    >
                      Reconnect
                    </button>
                    <>
                      <button
                        className="exmgr-action exmgr-action-danger"
                        onClick={() => handleDelete(item.exchange)}
                      >
                        Delete
                      </button>
                      {message && (
                        <div className="msg-success" style={{
                          position: 'fixed',
                          top: '12px',
                          right: '20px',
                          padding: '12px 20px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '8px',
                          color: '#22c55e',
                          fontSize: '14px',
                          fontWeight: 500,
                          zIndex: 1000,
                          animation: 'slideIn 0.3s ease-out',
                        }}>
                          {message}
                        </div>
                      )}
                    </>
                    </div>
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
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--warning)' }}>IP allowlist required</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--warning-text)', lineHeight: '1.7', margin: 0 }}>
            If your exchange API key supports an <strong style={{ color: 'var(--warning)' }}>IP allowlist</strong>,
            add the server IP shown below.<br />
            Synchronization will fail when the server IP is not allowed.
          </p>
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '15px',
              color: 'var(--warning)',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              {SERVER_IP}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SERVER_IP).then(() => {
                  setIpCopied(true);
                  setTimeout(() => setIpCopied(false), 2000);
                });
              }}
              style={{
                padding: '3px 10px',
                background: ipCopied ? 'rgba(34,197,94,0.15)' : 'rgba(210,153,34,0.15)',
                border: `1px solid ${ipCopied ? 'rgba(34,197,94,0.4)' : 'rgba(210,153,34,0.4)'}`,
                borderRadius: 'var(--radius-sm)',
                color: ipCopied ? '#4ade80' : 'var(--warning)',
                fontFamily: 'var(--font-ui)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {ipCopied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Exchange 연결 버튼 */}
        <button
          className="btn btn-primary btn-full"
          onClick={() => { setSelectedExchange(null); setStep('select'); }}
        >
          + Connect exchange
        </button>
      </div>
    );
  }

  // ── Exchange 선택 화면 ──────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="page" style={{ maxWidth: '640px' }}>
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep('manage')}>← Back</button>
          <div>
            <h1 className="syne page-title">Select Exchange</h1>
            <p className="text-sm text-secondary" style={{ marginTop: '2px' }}>Choose an exchange to connect</p>
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
                <ExchangeMark exchange={key} size={26} />
                <span className="syne" style={{ fontSize: '16px', fontWeight: 700 }}>{cfg.label}</span>
                {isRegistered && (
                  <span className="exsel-badge" style={{ background: cfg.color }}>Connected</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Connect 버튼 */}
        <button
          className="btn btn-primary btn-full"
          disabled={!selectedExchange}
          onClick={handleGoConnect}
        >
          {selectedExchange
            ? `${EXCHANGE_CONFIG[selectedExchange].label} Connect`
            : 'Select an exchange'}
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
        <button className="btn btn-ghost btn-sm" onClick={() => setStep('select')}>← Back</button>
        <div>
          <h1 className="syne page-title">Connect {config.label}</h1>
          <p className="text-sm text-secondary" style={{ marginTop: '2px' }}>Enter your read-only API credentials</p>
        </div>
      </div>

      <div className="card">
        {/* 이미 Connected 경우 안내 */}
        {isRegistered && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span style={{ fontSize: '13px', color: '#fbbf24' }}>This exchange is already connected. Saving will replace the existing credentials.</span>
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
                placeholder="Passphrase set when the API key was created"
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
            {loading ? 'Connecting...' : `Connect ${config.label}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExchangeKeyPage;
