// [파일 용도] 요청 캐시의 중복 병합 및 Reset 경쟁 조 회귀 테스트

import assert from 'node:assert/strict';
import test from 'node:test';

import { cachedGet, clearRequestCache } from './requestCache.js';

test('동일 키의 진행 중 요청을 하You로 병합한다', async () => {
  clearRequestCache();
  let requestCount = 0;
  let resolveRequest;
  const request = () => {
    requestCount += 1;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };

  const first = cachedGet('dashboard', request);
  const second = cachedGet('dashboard', request);
  assert.equal(first, second);
  assert.equal(requestCount, 1);

  resolveRequest({ data: 'ok' });
  assert.deepEqual(await second, { data: 'ok' });
});

test('캐시 Reset 전에 시작한 응답은 이후 캐시를 다시 채우지 않는다', async () => {
  clearRequestCache();
  let resolveOldRequest;
  const oldRequest = cachedGet('trades:ALL', () => new Promise((resolve) => {
    resolveOldRequest = resolve;
  }));

  clearRequestCache();
  resolveOldRequest({ data: ['old'] });
  await oldRequest;

  let freshRequestCount = 0;
  const fresh = await cachedGet('trades:ALL', async () => {
    freshRequestCount += 1;
    return { data: ['fresh'] };
  });

  assert.equal(freshRequestCount, 1);
  assert.deepEqual(fresh, { data: ['fresh'] });
});

test('TTL 안에서는 complete된 응답을 재사용한다', async () => {
  clearRequestCache();
  let requestCount = 0;
  const request = async () => ({ data: ++requestCount });

  const first = await cachedGet('balances', request, 1000);
  const second = await cachedGet('balances', request, 1000);

  assert.equal(requestCount, 1);
  assert.equal(first, second);
});
