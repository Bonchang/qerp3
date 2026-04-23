import type { InstrumentSearchItem, QuantSignal } from '@/types/api';

interface Props {
  selectedInstrument: InstrumentSearchItem | null;
  signal: QuantSignal | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
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
  const absoluteValue = Math.abs(value);
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${prefix}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteValue)}%`;
}

function getSignalClassName(signal: QuantSignal['signal']) {
  if (signal === 'BUY') {
    return 'signal-pill-buy';
  }

  if (signal === 'SELL') {
    return 'signal-pill-sell';
  }

  return 'signal-pill-hold';
}

export function QuantSignalPanel({ selectedInstrument, signal, loading, error, onRefresh }: Props) {
  const symbol = selectedInstrument?.symbol ?? signal?.symbol ?? null;
  const currency = selectedInstrument?.currency ?? 'USD';

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Quant signal</h2>
          <p>
            {selectedInstrument
              ? `${selectedInstrument.name} · placeholder quant-worker signal`
              : 'Enable quant mode and select a symbol to load a placeholder signal.'}
          </p>
        </div>
        <button className="toolbar-button" type="button" onClick={onRefresh} disabled={!symbol || loading}>
          {loading ? 'Loading…' : 'Refresh signal'}
        </button>
      </div>

      {!symbol ? <div className="empty-state">Select a symbol to generate a placeholder quant signal.</div> : null}

      {symbol && loading ? <div className="status-note">Generating placeholder signal for {symbol}…</div> : null}

      {symbol && error ? (
        <div className="error-state">
          <strong>Quant signal unavailable</strong>
          <div>{error}</div>
        </div>
      ) : null}

      {signal ? (
        <div className="quant-signal-layout">
          <div className="quant-signal-hero">
            <div>
              <div className="quote-symbol">{signal.symbol}</div>
              <div className="quote-price">{formatCurrency(signal.observedPrice, currency)}</div>
              <div className="status-note">Observed/reference spread vs derived prior close.</div>
            </div>
            <span className={`signal-pill ${getSignalClassName(signal.signal)}`}>{signal.signal}</span>
          </div>

          <div className={`quant-explanation ${getSignalClassName(signal.signal)}`}>
            <strong>Explanation</strong>
            <p>{signal.explanation}</p>
          </div>

          <div className="quote-grid">
            <div className="summary-card">
              <span>Observed price</span>
              <strong>{formatCurrency(signal.observedPrice, currency)}</strong>
            </div>
            <div className="summary-card">
              <span>Reference price</span>
              <strong>{formatCurrency(signal.referencePrice, currency)}</strong>
            </div>
            <div className="summary-card">
              <span>Change percent</span>
              <strong>{formatPercent(signal.priceChangePercent)}</strong>
            </div>
            <div className="summary-card">
              <span>Threshold band</span>
              <strong>±{formatPercent(signal.thresholdPercent).replace(/^[+-]/, '')}</strong>
            </div>
            <div className="summary-card">
              <span>Generated at</span>
              <strong>{new Date(signal.generatedAt).toLocaleString()}</strong>
            </div>
            <div className="summary-card">
              <span>Source</span>
              <strong>{signal.source}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
