// [파일 용도] Trade Sync 관리 페이지

import { useState, useEffect } from 'react';
import { getMyExchangeKeys, getSyncStatus } from '../api/exchangeApi';
import TradeSync from '../components/TradeSync/TradeSync';
import './TradeSyncPage.css';

const TradeSyncPage = () => {
  const [exchangeKeys, setExchangeKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [syncStates, setSyncStates] = useState({});
  const [statusError, setStatusError] = useState(false);

  const refreshStatus = async () => {
    try {
      const { data } = await getSyncStatus();
      setSyncStates(Object.fromEntries((data.connections || []).map(item => [item.exchange, item])));
      setStatusError(false);
    } catch {
      setStatusError(true);
    }
  };

  useEffect(() => {
    void loadExchangeKeys();
    void refreshStatus();
    const timer = window.setInterval(refreshStatus, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const loadExchangeKeys = async () => {
    try {
      const response = await getMyExchangeKeys();
      setExchangeKeys(response.data);
      setLoadError(false);
    } catch (error) {
      console.error('Exchange 목록 Could not load:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const getExchangeInfo = (exchangeCode) => {
    const exchanges = {
      UPBIT: { name: 'Upbit', color: '#3b82f6' },
      BYBIT: { name: 'Bybit', color: '#f97316' },
      BITGET: { name: 'Bitget', color: '#00c0a3' },
      OKX: { name: 'OKX', color: '#e4a400' },
      BINANCE: { name: 'Binance', color: '#f0b90b' },
      BINGX: { name: 'BingX', color: '#00b578' },
      KRAKEN: { name: 'Kraken', color: '#57477c' }
    };
    return exchanges[exchangeCode] || { name: exchangeCode, color: '#6b7280' };
  };

  if (loading) {
    return (
      <div className="trade-sync-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-sync-page">
      <div className="sync-header">
        <h1>Trade Sync</h1>
        <p>Sync execution history from each exchange and rebuild positions automatically.</p>
      </div>

      <div className="sync-grid">
        {loadError ? (
          <div className="empty-state">
            <h2>Unable to load connections</h2>
            <p>Check your connection and try again.</p>
            <button className="goto-exchange-btn" onClick={loadExchangeKeys}>Retry</button>
          </div>
        ) : exchangeKeys.length === 0 ? (
          <div className="empty-state">
            <h2>No connected exchanges</h2>
            <p>Add an exchange API key to begin.</p>
            <button className="goto-exchange-btn" onClick={() => window.location.href = '/exchange-keys'}>
              Add API key
            </button>
          </div>
        ) : (
          exchangeKeys.map((key) => {
            const exchangeInfo = getExchangeInfo(key.exchange);
            return (
              <div key={key.exchange} className="sync-card">
                <div className="exchange-header">
                  <div className="exchange-info">
                    <div
                      className="exchange-icon"
                      style={{ backgroundColor: exchangeInfo.color }}
                    >
                      {exchangeInfo.name.charAt(0)}
                    </div>
                    <div>
                      <h3>{exchangeInfo.name}</h3>
                      <p className="exchange-status">
                        {key.reconnectRequired ? 'Reconnect required' : statusError ? 'Status unavailable' : syncStates[key.exchange]?.status === 'ACTION_REQUIRED'
                          ? 'Connection needs attention' : 'Connected'}
                      </p>
                    </div>
                  </div>
                  <TradeSync exchange={key.exchange} syncState={syncStates[key.exchange]} onQueued={refreshStatus} reconnectRequired={key.reconnectRequired} />
                </div>
                <div className="exchange-details">
                  <p className="last-sync">
                    {key.reconnectRequired ? 'Sync unavailable until reconnection' : statusError ? 'Sync status unavailable' : syncStates[key.exchange]?.last_success_at
                      ? `Last successful sync: ${new Date(syncStates[key.exchange].last_success_at).toLocaleString()}`
                      : 'No successful sync yet'}
                  </p>
                  <p className="sync-tip">{key.reconnectRequired ? 'Replace the exchange API key in Connections to resume syncing.'
                    : statusError ? 'Check your connection to see the current sync state.'
                    : syncStates[key.exchange]?.status === 'ACTION_REQUIRED'
                      ? 'Check this exchange’s API permissions, then retry the sync.'
                      : syncStates[key.exchange]?.status === 'BACKOFF'
                        ? 'Sync failed. The server will retry automatically; you can also retry now.'
                    : syncStates[key.exchange]?.status === 'RUNNING'
                      ? syncStates[key.exchange]?.latest_ready ? 'Importing history...' : 'Importing recent executions...'
                      : syncStates[key.exchange]?.status === 'QUEUED' ? 'Waiting to sync...'
                        : syncStates[key.exchange]?.history_complete ? 'History import complete.' : 'History import is pending.'}</p>
                  <p className="sync-tip">
                    Sync detects new executions and updates positions automatically.
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sync-info">
        <div className="info-box">
          <h4>Frequently asked questions</h4>
          <ul>
            <li><strong>Q: How often should I sync?</strong><br/>
                A: Use Sync now, or let the server schedule syncs based on recent activity.</li>
            <li><strong>Q: What happens to existing trade history?</strong><br/>
                A: Existing history is preserved and only newly detected executions are added.</li>
            <li><strong>Q: What if the data looks incorrect?</strong><br/>
                A: Check the exchange connection and use Rebuild positions from the portfolio page if calculations still look wrong.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TradeSyncPage;
