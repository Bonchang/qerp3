import Link from 'next/link';
import React from 'react';

import { getInstrumentDetailHref } from '@/lib/instrument-detail-route';
import type { PositionItem } from '@/types/api';

interface Props {
  positions: PositionItem[];
  asOf?: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function PositionsTable({
  positions,
  asOf,
  formatCurrency,
  formatNumber,
  formatPercent,
  loading = false,
  error = null,
  emptyMessage = 'No open positions yet.',
}: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Positions</h2>
          <p>{asOf ? `Updated ${new Date(asOf).toLocaleString()}` : 'No position snapshot available.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-table" aria-live="polite">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`positions-loading-${index}`} className="loading-row" aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        <div className="error-state">
          <strong>Positions unavailable</strong>
          <div>{error}</div>
        </div>
      ) : positions.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Avg price</th>
                <th>Current price</th>
                <th>Market value</th>
                <th>Unrealized PnL</th>
                <th>PnL rate</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const detailHref = getInstrumentDetailHref(position.symbol);

                return (
                  <tr key={position.symbol}>
                    <td>
                      {detailHref ? (
                        <Link className="symbol-link" href={detailHref}>
                          {position.symbol}
                        </Link>
                      ) : (
                        position.symbol
                      )}
                    </td>
                    <td>{formatNumber(position.quantity)}</td>
                    <td>{formatCurrency(position.avgPrice)}</td>
                    <td>{formatCurrency(position.currentPrice)}</td>
                    <td>{formatCurrency(position.marketValue)}</td>
                    <td className={position.unrealizedPnl > 0 ? 'number-positive' : position.unrealizedPnl < 0 ? 'number-negative' : 'number-neutral'}>
                      {formatCurrency(position.unrealizedPnl)}
                    </td>
                    <td className={position.unrealizedPnlRate > 0 ? 'number-positive' : position.unrealizedPnlRate < 0 ? 'number-negative' : 'number-neutral'}>
                      {formatPercent(position.unrealizedPnlRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
