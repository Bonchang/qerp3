import { useMemo } from 'react';

import type { InstrumentSearchItem, MarketCandle, MarketCandleSeries, MarketQuote } from '@/types/api';

interface Props {
  selectedInstrument: InstrumentSearchItem | null;
  candles: MarketCandleSeries | null;
  quote: MarketQuote | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface CandleSummary {
  firstClose: number;
  latestClose: number;
  rangeHigh: number;
  rangeLow: number;
  latestVolume: number;
  averageVolume: number;
  delta: number;
  deltaPercent: number;
  latestTimestamp: string;
}

interface ChartGeometry {
  linePoints: string;
  areaPath: string;
  lastPoint: { x: number; y: number } | null;
}

const chartWidth = 320;
const chartHeight = 160;
const chartPadding = 14;

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSignedPercent(value: number) {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${prefix}${formatted}%`;
}

export function formatUtcSessionDate(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toISOString().slice(0, 10);
}

function formatVolume(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function summarizeCandles(items: MarketCandle[]): CandleSummary | null {
  if (items.length === 0) {
    return null;
  }

  const first = items[0];
  const latest = items[items.length - 1];
  const rangeHigh = Math.max(...items.map((item) => item.high));
  const rangeLow = Math.min(...items.map((item) => item.low));
  const latestVolume = latest?.volume ?? 0;
  const averageVolume = items.reduce((sum, item) => sum + item.volume, 0) / items.length;
  const delta = latest.close - first.close;
  const deltaPercent = first.close === 0 ? 0 : (delta / first.close) * 100;

  return {
    firstClose: first.close,
    latestClose: latest.close,
    rangeHigh,
    rangeLow,
    latestVolume,
    averageVolume,
    delta,
    deltaPercent,
    latestTimestamp: latest.timestamp,
  };
}

export function buildChartGeometry(items: MarketCandle[]): ChartGeometry {
  if (items.length === 0) {
    return { linePoints: '', areaPath: '', lastPoint: null };
  }

  const upper = Math.max(...items.map((item) => item.high));
  const lower = Math.min(...items.map((item) => item.low));
  const span = Math.max(upper - lower, 1);
  const drawableWidth = chartWidth - chartPadding * 2;
  const drawableHeight = chartHeight - chartPadding * 2;
  const denominator = Math.max(items.length - 1, 1);

  const coordinates = items.map((item, index) => {
    const x = chartPadding + (drawableWidth * index) / denominator;
    const y = chartPadding + ((upper - item.close) / span) * drawableHeight;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1] ?? null;
  const areaPath = firstPoint && lastPoint
    ? `M ${firstPoint.x} ${chartHeight - chartPadding} L ${linePoints.replace(/,/g, ' ')} L ${lastPoint.x} ${chartHeight - chartPadding} Z`
    : '';

  return { linePoints, areaPath, lastPoint };
}

export function MarketChartPanel({ selectedInstrument, candles, quote, loading, error, onRefresh }: Props) {
  const symbol = selectedInstrument?.symbol ?? candles?.symbol ?? quote?.symbol ?? null;
  const currency = quote?.currency ?? selectedInstrument?.currency ?? 'USD';
  const summary = useMemo(() => summarizeCandles(candles?.items ?? []), [candles]);
  const geometry = useMemo(() => buildChartGeometry(candles?.items ?? []), [candles]);
  const trendClassName = summary
    ? summary.delta > 0
      ? 'quote-change-positive'
      : summary.delta < 0
        ? 'quote-change-negative'
        : 'quote-change-neutral'
    : 'quote-change-neutral';
  const chartLineClassName = summary
    ? summary.delta > 0
      ? 'chart-line-positive'
      : summary.delta < 0
        ? 'chart-line-negative'
        : 'chart-line-neutral'
    : 'chart-line-neutral';
  const gradientId = `market-chart-fill-${(symbol ?? 'default').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Market chart</h2>
          <p>
            {selectedInstrument
              ? `${selectedInstrument.name} · ${selectedInstrument.exchange} · ${candles?.interval ?? '1D'} candles`
              : 'Select a search result to load recent candle history.'}
          </p>
        </div>
        <button className="toolbar-button" type="button" onClick={onRefresh} disabled={!symbol || loading}>
          {loading ? 'Loading…' : 'Refresh chart'}
        </button>
      </div>

      {!symbol ? <div className="empty-state">Search and select a symbol to view recent price action.</div> : null}

      {symbol && loading ? <div className="status-note">Loading 1D candles for {symbol}…</div> : null}

      {symbol && error ? (
        <div className="error-state">
          <strong>Chart unavailable</strong>
          <div>{error}</div>
        </div>
      ) : null}

      {candles && summary ? (
        <div className="market-chart-layout">
          <div className="market-chart-hero quote-hero">
            <div>
              <div className="quote-symbol">{candles.symbol}</div>
              <div className="quote-price">{formatCurrency(summary.latestClose, currency)}</div>
              <div className={`quote-change ${trendClassName}`}>
                <strong>{summary.delta > 0 ? '+' : ''}{formatCurrency(summary.delta, currency)}</strong>
                <span>{formatSignedPercent(summary.deltaPercent)} over the window</span>
              </div>
            </div>
            <div className="chart-badge-group">
              <span className="chart-badge">{candles.interval}</span>
              <span className="chart-badge">{candles.items.length} sessions</span>
            </div>
          </div>

          <div className="chart-frame">
            <div className="chart-range-label chart-range-label-top">{formatCurrency(summary.rangeHigh, currency)}</div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${candles.symbol} recent price trend`}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(29,78,216,0.24)" />
                  <stop offset="100%" stopColor="rgba(29,78,216,0.03)" />
                </linearGradient>
              </defs>
              <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} className="chart-grid-line" />
              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} className="chart-grid-line" />
              <path d={geometry.areaPath} fill={`url(#${gradientId})`} className="chart-area" />
              <polyline
                fill="none"
                points={geometry.linePoints}
                className={`chart-line ${chartLineClassName}`}
              />
              {geometry.lastPoint ? (
                <circle cx={geometry.lastPoint.x} cy={geometry.lastPoint.y} r="4.5" className="chart-last-point" />
              ) : null}
            </svg>
            <div className="chart-range-label chart-range-label-bottom">{formatCurrency(summary.rangeLow, currency)}</div>
          </div>

          <div className="quote-grid">
            <div className="summary-card">
              <span>Window</span>
              <strong>{formatCurrency(summary.firstClose, currency)} → {formatCurrency(summary.latestClose, currency)}</strong>
            </div>
            <div className="summary-card">
              <span>Range</span>
              <strong>{formatCurrency(summary.rangeLow, currency)} — {formatCurrency(summary.rangeHigh, currency)}</strong>
            </div>
            <div className="summary-card">
              <span>Latest volume</span>
              <strong>{formatVolume(summary.latestVolume)}</strong>
            </div>
            <div className="summary-card">
              <span>Avg volume</span>
              <strong>{formatVolume(summary.averageVolume)}</strong>
            </div>
            <div className="summary-card">
              <span>Last candle</span>
              <strong>{formatUtcSessionDate(summary.latestTimestamp)}</strong>
            </div>
            {quote ? (
              <div className="summary-card">
                <span>Quote snapshot</span>
                <strong>{formatCurrency(quote.price, quote.currency)}</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {symbol && !loading && !error && candles && candles.items.length === 0 ? (
        <div className="empty-state">No candle data available for {symbol}.</div>
      ) : null}
    </section>
  );
}
