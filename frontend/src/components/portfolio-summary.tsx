import type { PortfolioSummary } from '@/types/api';

interface PortfolioSummaryCardProps {
  title: string;
  value: string;
}

function SummaryCard({ title, value }: PortfolioSummaryCardProps) {
  return (
    <div className="summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface Props {
  summary: PortfolioSummary;
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
}

export function PortfolioSummarySection({ summary, formatCurrency, formatPercent }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Portfolio summary</h2>
          <p>Snapshot as of {new Date(summary.asOf).toLocaleString()}</p>
        </div>
      </div>
      <div className="summary-grid">
        <SummaryCard title="Cash balance" value={formatCurrency(summary.cashBalance)} />
        <SummaryCard title="Positions market value" value={formatCurrency(summary.positionsMarketValue)} />
        <SummaryCard title="Total portfolio value" value={formatCurrency(summary.totalPortfolioValue)} />
        <SummaryCard title="Unrealized PnL" value={formatCurrency(summary.unrealizedPnl)} />
        <SummaryCard title="Realized PnL" value={formatCurrency(summary.realizedPnl)} />
        <SummaryCard title="Return rate" value={formatPercent(summary.returnRate)} />
      </div>
    </section>
  );
}
