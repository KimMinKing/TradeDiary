// [파일 용도] Trade Sync 버튼 및 진행 상태 표시 컴포넌트

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncTrades } from '../../api/exchangeApi';
import './TradeSync.css';

const TradeSync = ({ exchange, syncState, onQueued, reconnectRequired = false }) => {
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const inProgress = requesting || syncState?.status === 'QUEUED' || syncState?.status === 'RUNNING';

  const handleSync = async () => {
    if (reconnectRequired) {
      navigate('/exchange-keys');
      return;
    }
    if (inProgress) return;

    setRequesting(true);
    setError('');
    try {
      await syncTrades(exchange);
      await onQueued();
    } catch {
      setError('Could not queue sync. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="trade-sync-container">
      <button
        className={`sync-button ${inProgress ? 'syncing' : ''}`}
        onClick={handleSync}
        disabled={inProgress}
      >
        {inProgress ? (
          <>
            <span className="sync-spinner"></span>
            {syncState?.status === 'RUNNING' ? 'Syncing...' : 'Queued...'}
          </>
        ) : (
          reconnectRequired ? 'Reconnect key' : syncState?.status === 'ACTION_REQUIRED' ? 'Retry sync' : 'Sync now'
        )}
      </button>

      {error && <span role="alert" className="sync-error">{error}</span>}
    </div>
  );
};

export default TradeSync;
