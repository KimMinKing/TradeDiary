// [파일 용도] 거래소 API Key 등록 페이지 (Upbit / Bybit 선택)

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
  },
  BYBIT: {
    label: 'Bybit',
    color: '#f97316',
    activeClass: 'active-bybit',
    guide: 'Bybit → 계정 → API 관리에서 포지션, 주문, 거래 조회 권한으로 발급하세요.',
    apiKeyPlaceholder: 'API Key',
    secretKeyPlaceholder: 'Secret Key',
  },
};

// [컴포넌트] 거래소 API Key 선택 및 등록 화면 / [호출] App.jsx 라우터
const ExchangeKeyPage = () => {
  const [selectedExchange,    setSelectedExchange]    = useState('UPBIT');
  const [apiKey,              setApiKey]              = useState('');
  const [secretKey,           setSecretKey]           = useState('');
  const [registeredExchanges, setRegisteredExchanges] = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [message,             setMessage]             = useState('');
  const [error,               setError]               = useState('');

  useEffect(() => { fetchRegisteredKeys(); }, []);

  // [용도] 거래소 탭 전환 시 입력 초기화 / [호출] 탭 버튼 클릭
  const handleSelectExchange = (exchange) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setSecretKey('');
    setMessage('');
    setError('');
  };

  // [용도] 등록된 거래소 목록 조회 / [호출] useEffect, handleSubmit, handleDelete
  const fetchRegisteredKeys = async () => {
    try {
      const res = await getMyExchangeKeys();
      setRegisteredExchanges(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // [용도] API Key 등록 제출 / [호출] form onSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await saveExchangeKey(selectedExchange, apiKey.trim(), secretKey.trim());
      setMessage(`${EXCHANGE_CONFIG[selectedExchange].label} API Key가 등록되었습니다.`);
      setApiKey('');
      setSecretKey('');
      fetchRegisteredKeys();
    } catch (err) {
      setError(err.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [용도] API Key 삭제 / [호출] 삭제 버튼 클릭
  const handleDelete = async (exchange) => {
    if (!window.confirm(`${exchange} API Key를 삭제할까요?`)) return;
    try {
      await deleteExchangeKey(exchange);
      setMessage(`${exchange} API Key가 삭제되었습니다.`);
      fetchRegisteredKeys();
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const config       = EXCHANGE_CONFIG[selectedExchange];
  const isRegistered = registeredExchanges.includes(selectedExchange);

  return (
    <div className="page" style={{ maxWidth: '600px' }}>
      {/* 페이지 제목 */}
      <div className="anim-fade-up" style={{ marginBottom: '28px' }}>
        <h1 className="syne page-title">거래소 연동</h1>
        <p className="text-sm text-secondary" style={{ marginTop: '4px' }}>
          API Key를 등록하면 거래 내역을 자동으로 동기화합니다
        </p>
      </div>

      {/* 등록된 거래소 현황 */}
      {registeredExchanges.length > 0 && (
        <div className="anim-fade-up2" style={{ marginBottom: '24px' }}>
          <p className="section-title">연동된 거래소</p>
          {registeredExchanges.map((exchange) => {
            const cfg = EXCHANGE_CONFIG[exchange] || {};
            return (
              <div key={exchange} className="exchange-row">
                <span
                  className="badge"
                  style={{
                    background: `${cfg.color}1a`,
                    color: cfg.color,
                  }}
                >
                  {cfg.label || exchange}
                </span>
                <span className="text-sm" style={{ flex: 1, color: '#4ade80' }}>
                  ✓ 연동됨
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(exchange)}
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 거래소 선택 탭 */}
      <div className="anim-fade-up2" style={{ marginBottom: '24px' }}>
        <p className="section-title">거래소 선택</p>
        <div className="flex gap-3">
          {Object.entries(EXCHANGE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className={`exchange-tab-btn${selectedExchange === key ? ` ${cfg.activeClass}` : ''}`}
              onClick={() => handleSelectExchange(key)}
            >
              {cfg.label}
              {registeredExchanges.includes(key) && (
                <span
                  className="registered-dot"
                  style={{ background: cfg.color }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* API Key 입력 폼 */}
      <div className="card anim-fade-up3">
        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
          <span className="syne" style={{ fontSize: '16px', fontWeight: 700 }}>
            {config.label} API Key 등록
          </span>
          {isRegistered && (
            <span
              className="badge"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: '10px' }}
            >
              덮어쓰기
            </span>
          )}
        </div>

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
