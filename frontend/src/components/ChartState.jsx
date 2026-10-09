import { useLocale } from '../i18n/localeContext';
const ChartState = ({ status = 'empty', title, description, actionLabel, onAction, height = 200 }) => { const { t } = useLocale(); return (
  <div className={`chart-state chart-state-${status}`} style={{ minHeight: height }} role={status === 'error' ? 'alert' : 'status'}>
    <span className="chart-state-mark" aria-hidden="true">{status === 'loading' ? '···' : status === 'error' ? '!' : '—'}</span>
    <b>{t(title || (status === 'loading' ? 'Loading data' : status === 'error' ? 'Unable to load data' : 'No data yet'))}</b>
    {description && <small>{t(description)}</small>}
    {actionLabel && onAction && <button type="button" onClick={onAction}>{t(actionLabel)}</button>}
  </div>
); };
export default ChartState;
