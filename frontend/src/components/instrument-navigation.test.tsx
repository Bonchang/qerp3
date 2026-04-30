import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { InstrumentSearch } from '@/components/instrument-search';
import { OrderList } from '@/components/order-list';
import { PositionsTable } from '@/components/positions-table';
import { getInstrumentDetailHref } from '@/lib/instrument-detail-route';

test('getInstrumentDetailHref normalizes symbols for the dedicated detail route', () => {
  assert.equal(getInstrumentDetailHref(' aapl '), '/instruments/AAPL');
  assert.equal(getInstrumentDetailHref('brk.b'), '/instruments/BRK.B');
  assert.equal(getInstrumentDetailHref('   '), null);
});

test('instrument search renders a detail link for each result card', () => {
  const markup = renderToStaticMarkup(
    <InstrumentSearch
      results={[
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          assetType: 'EQUITY',
          currency: 'USD',
        },
      ]}
      loading={false}
      error={null}
      hasSearched
      selectedSymbol={null}
      onSearch={async () => undefined}
      onSelectInstrument={() => undefined}
    />,
  );

  assert.match(markup, /href="\/instruments\/AAPL"/);
  assert.match(markup, /Open detail/);
});

test('positions and recent orders link symbols to the detail workspace', () => {
  const positionsMarkup = renderToStaticMarkup(
    <PositionsTable
      positions={[
        {
          symbol: 'MSFT',
          quantity: 2,
          avgPrice: 410,
          currentPrice: 415,
          marketValue: 830,
          unrealizedPnl: 10,
          unrealizedPnlRate: 0.02439,
        },
      ]}
      asOf="2026-04-30T10:00:00Z"
      formatCurrency={(value) => `$${value.toFixed(2)}`}
      formatNumber={(value) => value.toString()}
      formatPercent={(value) => `${(value * 100).toFixed(2)}%`}
    />,
  );

  const ordersMarkup = renderToStaticMarkup(
    <OrderList
      orders={[
        {
          orderId: 'ord-1',
          symbol: 'NVDA',
          side: 'BUY',
          orderType: 'MARKET',
          quantity: 1,
          filledQuantity: 1,
          remainingQuantity: 0,
          limitPrice: null,
          avgFillPrice: 900,
          status: 'FILLED',
          createdAt: '2026-04-30T10:00:00Z',
          updatedAt: '2026-04-30T10:00:00Z',
        },
      ]}
      formatCurrency={(value) => `$${value.toFixed(2)}`}
      formatNumber={(value) => value.toString()}
    />,
  );

  assert.match(positionsMarkup, /href="\/instruments\/MSFT"/);
  assert.match(ordersMarkup, /href="\/instruments\/NVDA"/);
});