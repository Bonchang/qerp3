import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DEFAULT_API_BASE_URL,
  FRONTEND_PROXY_PREFIX,
  FRONTEND_QUANT_PREFIX,
  fetchCandles,
  fetchQuantSignal,
  fetchQuote,
  getApiBaseUrl,
  getApiErrorMessage,
  searchInstruments,
  toOrderRequestBody,
} from './api';
import { buildChartGeometry, formatSignedPercent, formatUtcSessionDate, summarizeCandles } from '@/components/market-chart-panel';
import { buildQuantWorkerArgs, deriveReferencePriceFromQuote, normalizeQuantThresholdPercent, resolveQuantWorkerDirectory } from './quant-worker';
import { createSymbolRequestGuard } from './request-guard';

test('getApiBaseUrl falls back to localhost when env is missing', () => {
  assert.equal(getApiBaseUrl(undefined), DEFAULT_API_BASE_URL);
  assert.equal(getApiBaseUrl('   '), DEFAULT_API_BASE_URL);
});

test('getApiBaseUrl trims trailing slash', () => {
  assert.equal(getApiBaseUrl('http://localhost:8080/'), 'http://localhost:8080');
});

test('getApiErrorMessage prefers backend message', () => {
  assert.equal(
    getApiErrorMessage({
      error: {
        message: 'quantity must be > 0',
      },
    }),
    'quantity must be > 0',
  );
});

test('toOrderRequestBody uppercases symbol and omits limitPrice for market orders', () => {
  assert.deepEqual(
    toOrderRequestBody({
      symbol: 'aapl',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
      limitPrice: 150,
    }),
    {
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
    },
  );
});

test('toOrderRequestBody includes limitPrice for limit orders', () => {
  assert.deepEqual(
    toOrderRequestBody({
      symbol: 'msft',
      side: 'SELL',
      orderType: 'LIMIT',
      quantity: 5,
      limitPrice: 300.25,
    }),
    {
      symbol: 'MSFT',
      side: 'SELL',
      orderType: 'LIMIT',
      quantity: 5,
      limitPrice: 300.25,
    },
  );
});

test('searchInstruments uses the frontend proxy path with encoded query params', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }) as typeof fetch;

  try {
    const response = await searchInstruments('micro soft', 5);

    assert.deepEqual(response, { items: [] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, `${FRONTEND_PROXY_PREFIX}/instruments/search?q=micro+soft&limit=5`);
    assert.equal(calls[0]?.init?.cache, 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('searchInstruments rejects blank queries before making a request', async () => {
  await assert.rejects(() => searchInstruments('   '), /Search query is required\./);
});

test('fetchQuote uppercases the symbol and uses the quote proxy path', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        symbol: 'MSFT',
        price: 320,
        currency: 'USD',
        change: 2.4,
        changePercent: 0.76,
        asOf: '2026-04-22T13:30:00Z',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const response = await fetchQuote(' msft ');

    assert.equal(response.symbol, 'MSFT');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, `${FRONTEND_PROXY_PREFIX}/market/quotes/MSFT`);
    assert.equal(calls[0]?.init?.cache, 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchCandles uppercases the symbol and uses the candles proxy path', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        symbol: 'AAPL',
        interval: '1D',
        items: [
          {
            timestamp: '2026-04-22T20:00:00Z',
            open: 178.75,
            high: 182.56,
            low: 176.56,
            close: 180,
            volume: 379575817,
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const response = await fetchCandles(' aapl ', '1d', 2);

    assert.equal(response.symbol, 'AAPL');
    assert.equal(response.items.length, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, `${FRONTEND_PROXY_PREFIX}/market/candles/AAPL?interval=1D&limit=2`);
    assert.equal(calls[0]?.init?.cache, 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchQuantSignal uses the quant route without the backend proxy prefix', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        symbol: 'AAPL',
        observedPrice: 180,
        referencePrice: 178,
        thresholdPercent: 2,
        priceChangePercent: 1.12,
        signal: 'HOLD',
        explanation: 'AAPL 변동폭이 임계값 ±2.00% 이내라 HOLD placeholder 신호를 반환했습니다.',
        generatedAt: '2026-04-23T13:33:00Z',
        source: 'placeholder-v1',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const response = await fetchQuantSignal(' aapl ');

    assert.equal(response.symbol, 'AAPL');
    assert.equal(response.signal, 'HOLD');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, `${FRONTEND_QUANT_PREFIX}/signals/AAPL`);
    assert.equal(calls[0]?.init?.cache, 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizeQuantThresholdPercent defaults to 2 and rejects negative values', () => {
  assert.equal(normalizeQuantThresholdPercent(null), 2);
  assert.equal(normalizeQuantThresholdPercent(' 3.5 '), 3.5);
  assert.throws(() => normalizeQuantThresholdPercent('-1'), /thresholdPercent must be a non-negative number\./);
});

test('deriveReferencePriceFromQuote uses price minus change', () => {
  assert.equal(
    deriveReferencePriceFromQuote({
      symbol: 'AAPL',
      price: 180,
      currency: 'USD',
      change: 2,
      changePercent: 1.12,
      asOf: '2026-04-23T13:33:00Z',
    }),
    178,
  );
});

test('buildQuantWorkerArgs preserves the placeholder quant-worker contract', () => {
  assert.deepEqual(buildQuantWorkerArgs({ symbol: ' msft ', observedPrice: 320.5, referencePrice: 315, thresholdPercent: 2 }), [
    '-m',
    'app.main',
    '--symbol',
    'MSFT',
    '--price',
    '320.5',
    '--reference-price',
    '315',
    '--threshold-percent',
    '2',
  ]);
});

test('resolveQuantWorkerDirectory finds the repo worker from a standalone runtime path', () => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'qerp3-quant-worker-'));
  const repoRoot = path.join(fixtureRoot, 'qerp3');
  const workerDirectory = path.join(repoRoot, 'quant-worker');
  const standaloneDirectory = path.join(repoRoot, 'frontend', '.next', 'standalone');

  mkdirSync(path.join(workerDirectory, 'app'), { recursive: true });
  mkdirSync(standaloneDirectory, { recursive: true });
  writeFileSync(path.join(workerDirectory, 'app', 'main.py'), 'print("ok")\n');
  writeFileSync(path.join(standaloneDirectory, 'server.js'), '');

  try {
    assert.equal(resolveQuantWorkerDirectory(standaloneDirectory, path.join(standaloneDirectory, 'server.js')), workerDirectory);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test('createSymbolRequestGuard rejects stale responses after a newer selection or refresh', () => {
  const guard = createSymbolRequestGuard();
  const aaplRequest = guard.begin('AAPL');

  assert.equal(guard.isCurrent(aaplRequest), true);

  const msftRequest = guard.begin('MSFT');

  assert.equal(guard.isCurrent(aaplRequest), false);
  assert.equal(guard.isCurrent(msftRequest), true);

  const refreshedMsftRequest = guard.begin('MSFT');

  assert.equal(guard.isCurrent(msftRequest), false);
  assert.equal(guard.isCurrent(refreshedMsftRequest), true);
});

test('summarizeCandles calculates chart summary metrics', () => {
  const summary = summarizeCandles([
    { timestamp: '2026-04-21T20:00:00Z', open: 100, high: 104, low: 99, close: 102, volume: 1200 },
    { timestamp: '2026-04-22T20:00:00Z', open: 102, high: 108, low: 101, close: 106, volume: 1800 },
  ]);

  assert.deepEqual(summary, {
    firstClose: 102,
    latestClose: 106,
    rangeHigh: 108,
    rangeLow: 99,
    latestVolume: 1800,
    averageVolume: 1500,
    delta: 4,
    deltaPercent: (4 / 102) * 100,
    latestTimestamp: '2026-04-22T20:00:00Z',
  });
});

test('buildChartGeometry creates line and area coordinates for candles', () => {
  const geometry = buildChartGeometry([
    { timestamp: '2026-04-21T20:00:00Z', open: 100, high: 104, low: 99, close: 102, volume: 1200 },
    { timestamp: '2026-04-22T20:00:00Z', open: 102, high: 108, low: 101, close: 106, volume: 1800 },
  ]);

  assert.match(geometry.linePoints, /^14,102 306,43\.33$/);
  assert.equal(geometry.areaPath, 'M 14 146 L 14 102 306 43.33 L 306 146 Z');
  assert.deepEqual(geometry.lastPoint, { x: 306, y: 43.33 });
});

test('formatSignedPercent renders neutral moves without a plus sign', () => {
  assert.equal(formatSignedPercent(0), '0.00%');
  assert.equal(formatSignedPercent(1.25), '+1.25%');
  assert.equal(formatSignedPercent(-1.25), '-1.25%');
});

test('formatUtcSessionDate keeps UTC session dates stable across local timezones', () => {
  assert.equal(formatUtcSessionDate('2026-04-22T20:00:00Z'), '2026-04-22');
  assert.equal(formatUtcSessionDate('2026-04-22T00:30:00Z'), '2026-04-22');
});
