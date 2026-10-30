import test from 'node:test';
import assert from 'node:assert/strict';
import { historyLabel, checkedRangeLabel } from './syncCoverage.js';

test('legacy imports remain unverified and an empty API result can still have a checked range', () => {
  assert.match(historyLabel({ history_complete: true, coverage: [] }), /unknown/);
  assert.match(historyLabel({ history_complete: true, coverage: [
    { coverage_status: 'REQUESTED_RANGE_CHECKED' }
  ] }), /range checked/);
  assert.match(historyLabel({ history_complete: false, coverage: [
    { coverage_status: 'REQUESTED_RANGE_CHECKED' }
  ] }), /recheck pending/);
});

test('a limited product keeps the overall history warning', () => {
  assert.match(historyLabel({ coverage: [
    { coverage_status: 'REQUESTED_RANGE_CHECKED' },
    { coverage_status: 'LIMITED_BY_EXCHANGE' }
  ] }), /limited/);
  assert.equal(checkedRangeLabel({ product_type: 'USDT_FUTURES', requested_from: 'A',
    available_from: 'B', verified_through: 'C' }, value => value),
  'USDT FUTURES: requested from A; API checked B to C.');
});
