import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText } from './translations.js';

test('core navigation switches in both directions', () => {
  assert.equal(translateText('Settings', 'ko'), '설정');
  assert.equal(translateText('설정', 'en'), 'Settings');
  assert.equal(translateText('Performance', 'ko'), '성과');
  assert.equal(translateText('성과', 'en'), 'Performance');
});

test('legacy mixed-language labels are normalized', () => {
  assert.equal(translateText('Entry 이유', 'ko'), '진입 이유');
  assert.equal(translateText('Entry 이유', 'en'), 'Entry rationale');
  assert.equal(translateText('24시간 고가', 'ko'), '24시간 최고가');
  assert.equal(translateText('24시간 고가', 'en'), '24-hour high');
});

test('dynamic feed labels are localized', () => {
  assert.equal(translateText('8 trades', 'ko'), '8회 거래');
  assert.equal(translateText('Published a journal · BTCUSDT', 'ko'), '공개 일지를 작성했습니다 · BTCUSDT');
});
