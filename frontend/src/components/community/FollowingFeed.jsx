import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFollowingFeed } from '../../api/exchangeApi';
import ChartState from '../ChartState';
import { useLocale } from '../../i18n/localeContext';

const FollowingFeed = () => {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  const handleResult = response => {
    const nextItems = response.data || [];
    setItems(nextItems);
    setStatus(nextItems.length ? 'ready' : 'empty');
  };
  const retry = () => {
    setStatus('loading');
    getFollowingFeed().then(handleResult).catch(() => setStatus('error'));
  };

  useEffect(() => {
    getFollowingFeed().then(response => {
      const nextItems = response.data || [];
      setItems(nextItems);
      setStatus(nextItems.length ? 'ready' : 'empty');
    }).catch(() => setStatus('error'));
  }, []);

  if (status !== 'ready') return <div className="community-feed">
    <ChartState status={status}
      title={status === 'empty' ? 'Your following feed is quiet' : undefined}
      description={status === 'empty'
        ? 'Follow public traders to see their journals and verified closed positions here.'
        : 'Check your connection and try again.'}
      actionLabel={status === 'error' ? 'Retry' : undefined} onAction={retry} />
  </div>;

  return <div className="community-feed">
    <div className="community-section-head"><div><b>Following activity</b><span>Public journals and verified closed positions only</span></div></div>
    {items.map((item, index) => <button
      key={`${item.type}-${item.user_id}-${item.occurred_at}-${index}`}
      onClick={() => navigate(`/trader/${item.user_id}`)}>
      <span className="community-avatar">{(item.nickname || '?')[0].toUpperCase()}</span>
      <span><b>{item.nickname}</b><small>{item.type === 'POSITION_CLOSED'
        ? `${item.side} ${item.symbol} closed · ${Number(item.pnl_rate) >= 0 ? '+' : ''}${item.pnl_rate}%`
        : `Published a journal${item.symbol ? ` · ${item.symbol}` : ''}`}</small></span>
      <time>{new Date(item.occurred_at).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
    </button>)}
  </div>;
};

export default FollowingFeed;
