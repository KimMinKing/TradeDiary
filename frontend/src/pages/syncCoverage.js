export const historyLabel = (syncState) => {
  const coverage = syncState?.coverage || [];
  if (coverage.some(item => item.coverage_status === 'LIMITED_BY_EXCHANGE')) {
    return 'Exchange API history is limited. Older executions may be missing.';
  }
  if (!syncState?.history_complete && coverage.length > 0) {
    return 'History recheck pending; showing the previous checked range.';
  }
  if (coverage.length > 0) return 'Requested history range checked.';
  if (syncState?.history_complete) return 'Earlier import completed; its checked date range is unknown.';
  return 'History import is pending.';
};

export const checkedRangeLabel = (item, formatDate) =>
  `${item.product_type.replaceAll('_', ' ')}: requested from ${formatDate(item.requested_from)}; ` +
  `API checked ${formatDate(item.available_from)} to ${formatDate(item.verified_through)}.`;
