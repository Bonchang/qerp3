import type { Order } from '@/types/api';

interface Props {
  orders: Order[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function OrderList({ orders, formatCurrency, formatNumber }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Recent orders</h2>
          <p>Most recent 10 orders from the backend.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">No orders submitted yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Limit</th>
                <th>Avg fill</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{order.symbol}</td>
                  <td>
                    <span className={`pill pill-${order.side.toLowerCase()}`}>{order.side}</span>
                  </td>
                  <td>{order.orderType}</td>
                  <td>{formatNumber(order.quantity)}</td>
                  <td>{order.status}</td>
                  <td>{order.limitPrice == null ? '—' : formatCurrency(order.limitPrice)}</td>
                  <td>{order.avgFillPrice == null ? '—' : formatCurrency(order.avgFillPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
