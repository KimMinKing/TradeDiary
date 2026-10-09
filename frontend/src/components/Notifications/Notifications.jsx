import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../api/notificationApi';
import './Notifications.css';

const newest = (items) => [...items].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
const merge = (current, incoming) => newest([...new Map([...current, ...incoming].map(item => [item.id, item])).values()]);
const unread = (item) => !(item.is_read ?? item.isRead);
const category = (type = '') => {
  if (type.includes('TRADE') || type.includes('POSITION')) return { code: 'TR', tone: 'blue' };
  if (type.includes('PROFIT')) return { code: 'PN', tone: 'green' };
  if (type.includes('LOSS') || type.includes('WARNING')) return { code: 'RK', tone: 'red' };
  if (type.includes('NEWS') || type.includes('REPORT') || type.includes('SUMMARY')) return { code: 'IN', tone: 'violet' };
  return { code: 'SY', tone: 'slate' };
};
const relativeTime = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Notifications = ({ liveNotification, onClose }) => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const [list, count] = await Promise.all([
        notificationApi.getNotifications(0, 40), notificationApi.getUnreadCount(),
      ]);
      setItems(newest(list?.data?.content ?? []));
      setUnreadCount(count?.count ?? 0);
    } finally { busy.current = false; setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!liveNotification) return;
    setItems(current => merge(current, [liveNotification]));
    setUnreadCount(count => count + 1);
  }, [liveNotification]);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);

  const markRead = async (item) => {
    if (!unread(item)) return;
    await notificationApi.markAsRead(item.id);
    setItems(current => current.map(value => value.id === item.id ? { ...value, is_read: true } : value));
    setUnreadCount(count => Math.max(0, count - 1));
  };
  const markAll = async () => {
    await notificationApi.markAllAsRead();
    setItems(current => current.map(item => ({ ...item, is_read: true })));
    setUnreadCount(0);
  };
  const clearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    await notificationApi.deleteAllNotifications(); setItems([]); setUnreadCount(0);
  };
  const remove = async (event, item) => {
    event.stopPropagation();
    await notificationApi.deleteNotification(item.id);
    setItems(current => current.filter(value => value.id !== item.id));
    if (unread(item)) setUnreadCount(count => Math.max(0, count - 1));
  };

  return <div className="notification-layer" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="notification-center" aria-label="Notification center">
      <header className="notification-center-head">
        <div><span>ACTIVITY</span><h2>Notifications {unreadCount > 0 && <b>{unreadCount}</b>}</h2></div>
        <button className="notification-close" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="notification-commandbar">
        <span>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</span>
        <div>{unreadCount > 0 && <button onClick={markAll}>Mark all read</button>}{items.length > 0 && <button onClick={clearAll}>Clear</button>}</div>
      </div>
      <div className="notification-feed">
        {loading ? <div className="notification-state">Loading activity...</div> : items.length === 0 ?
          <div className="notification-state"><i>✓</i><strong>No new activity</strong><span>Updates from trades, reports and connections will appear here.</span></div> :
          items.map(item => { const meta = category(item.type); return <button key={item.id} className={`notification-entry ${unread(item) ? 'is-unread' : ''}`} onClick={() => markRead(item)}>
            <span className={`notification-glyph ${meta.tone}`}>{meta.code}</span>
            <span className="notification-copy"><strong>{item.title || 'Activity update'}</strong><span>{item.message}</span><small>{relativeTime(item.created_at || item.createdAt)}</small></span>
            {unread(item) && <i className="notification-dot" />}
            <span className="notification-remove" role="button" aria-label="Delete" onClick={event => remove(event, item)}>×</span>
          </button>; })}
      </div>
      <footer className="notification-center-foot"><span><i /> Live updates connected</span><button onClick={() => { onClose(); window.location.assign('/settings?tab=notifications'); }}>Notification settings</button></footer>
    </aside>
  </div>;
};

export default Notifications;
