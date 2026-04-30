import Link from 'next/link';

import type { InstrumentSearchItem, MarketQuote } from '@/types/api';

interface Props {
  selectedInstrument: InstrumentSearchItem | null;
  quote: MarketQuote | null;
  loading: boolean;
  error: string | null;
  onRefreshQuote: () => void;
  detailHref?: string | null;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function QuotePanel({ selectedInstrument, quote, loading, error, onRefreshQuote, detailHref }: Props) {
  const symbol = selectedInstrument?.symbol ?? quote?.symbol ?? null;
  const changeClassName = quote
    ? quote.change > 0
      ? 'quote-change-positive'
      : quote.change < 0
        ? 'quote-change-negative'
        : 'quote-change-neutral'
    : 'quote-change-neutral';

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Quote panel</h2>
          <p>
            {selectedInstrument
              ? `${selectedInstrument.name} · ${selectedInstrument.exchange} · ${selectedInstrument.assetType}`
              : 'Select a search result to load a quote snapshot.'}
          </p>
        </div>
        <div className="panel-header-actions">
          {detailHref ? (
            <Link className="toolbar-link" href={detailHref}>
              Open detail
            </Link>
          ) : null}
          <button className="toolbar-button" type="button" onClick={onRefreshQuote} disabled={!symbol || loading}>
            {loading ? 'Loading…' : 'Refresh quote'}
          </button>
        </div>
      </div>

      {!symbol ? <div className="empty-state">Search and select a symbol to view quote details.</div> : null}

      {symbol && loading ? <div className="status-note">Loading latest quote for {symbol}…</div> : null}

      {symbol && error ? (
        <div className="error-state">
          <strong>Quote unavailable</strong>
          <div>{error}</div>
        </div>
      ) : null}

      {quote ? (
        <div className="quote-layout">
          <div className="quote-hero">
            <div>
              <div className="quote-symbol">{quote.symbol}</div>
              <div className="quote-price">{formatCurrency(quote.price, quote.currency)}</div>
            </div>
            <div className={`quote-change ${changeClassName}`}>
              <strong>{quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change, quote.currency)}</strong>
              <span>{quote.changePercent >= 0 ? '+' : ''}{formatPercent(quote.changePercent)}</span>
            </div>
          </div>

          <div className="quote-grid">
            <div className="summary-card">
              <span>Currency</span>
              <strong>{quote.currency}</strong>
            </div>
            <div className="summary-card">
              <span>As of</span>
              <strong>{new Date(quote.asOf).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
