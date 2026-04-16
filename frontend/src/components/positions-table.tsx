import type { PositionItem } from '@/types/api';

interface Props {
  positions: PositionItem[];
  asOf?: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
}

export function PositionsTable({ positions, asOf, formatCurrency, formatNumber, formatPercent }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Positions</h2>
          <p>{asOf ? `Updated ${new Date(asOf).toLocaleString()}` : 'No position snapshot available.'}</p>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="empty-state">No open positions yet.</div>
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
              {positions.map((position) => (
                <tr key={position.symbol}>
                  <td>{position.symbol}</td>
                  <td>{formatNumber(position.quantity)}</td>
                  <td>{formatCurrency(position.avgPrice)}</td>
                  <td>{formatCurrency(position.currentPrice)}</td>
                  <td>{formatCurrency(position.marketValue)}</td>
                  <td>{formatCurrency(position.unrealizedPnl)}</td>
                  <td>{formatPercent(position.unrealizedPnlRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
