import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_API_BASE_URL, getApiBaseUrl, getApiErrorMessage, toOrderRequestBody } from './api';

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
