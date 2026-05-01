'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InstrumentSearch } from '@/components/instrument-search';
import { MarketChartPanel } from '@/components/market-chart-panel';
import { OrderForm } from '@/components/order-form';
import { OrderList } from '@/components/order-list';
import { PortfolioSummarySection } from '@/components/portfolio-summary';
import { PositionsTable } from '@/components/positions-table';
import { QuantSignalPanel } from '@/components/quant-signal-panel';
import { QuotePanel } from '@/components/quote-panel';
import {
  createOrder,
  fetchOrders,
  fetchPortfolioSummary,
  fetchPositions,
  fetchQuantSignal,
  searchInstruments,
} from '@/lib/api';
import { createSymbolRequestGuard } from '@/lib/request-guard';
import { getInstrumentDetailHref } from '@/lib/instrument-detail-route';
import { useLiveMarketSnapshot } from '@/lib/use-live-market-snapshot';
import type {
  InstrumentSearchItem,
  Order,
  PortfolioSummary,
  PositionItem,
  QuantSignal,
} from '@/types/api';

interface DashboardState {
  summary: PortfolioSummary | null;
  positions: PositionItem[];
  positionsAsOf: string | null;
  orders: Order[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});

const initialState: DashboardState = {
  summary: null,
  positions: [],
  positionsAsOf: null,
  orders: [],
};

type OverviewCardTone = 'default' | 'accent' | 'success';

interface OverviewCardProps {
  label: string;
  value: string;
  meta: string;
  tone?: OverviewCardTone;
  loading?: boolean;
}

function OverviewCard({ label, value, meta, tone = 'default', loading = false }: OverviewCardProps) {
  return (
    <div className={`overview-card overview-card-${tone}${loading ? ' is-loading' : ''}`}>
      <div className="overview-label">{label}</div>
      {loading ? (
        <>
          <div className="loading-bar loading-bar-lg" aria-hidden="true" />
          <div className="loading-bar loading-bar-sm" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="overview-value">{value}</div>
          <div className="overview-meta">{meta}</div>
        </>
      )}
    </div>
  );
}

interface StatePanelProps {
  title: string;
  message: string;
  tone?: 'default' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

function StatePanel({ title, message, tone = 'default', actionLabel, onAction, actionDisabled = false }: StatePanelProps) {
  const className = tone === 'error' ? 'error-state state-panel' : 'empty-state state-panel';

  return (
    <div className={className}>
      <div className="state-panel-copy">
        <strong>{title}</strong>
        <div>{message}</div>
      </div>
      {actionLabel && onAction ? (
        <div className="state-panel-actions">
          <button className="toolbar-button" type="button" onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardState>(initialState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<InstrumentSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentSearchItem | null>(null);
  const [quantModeEnabled, setQuantModeEnabled] = useState(false);
  const [quantSignal, setQuantSignal] = useState<QuantSignal | null>(null);
  const [quantLoading, setQuantLoading] = useState(false);
  const [quantError, setQuantError] = useState<string | null>(null);
  const quantRequestGuardRef = useRef(createSymbolRequestGuard());
  const {
    activity: liveMarketActivity,
    candles,
    error: liveMarketError,
    loading: liveMarketLoading,
    quote,
    refresh: refreshLiveMarket,
  } = useLiveMarketSnapshot(selectedInstrument?.symbol ?? null);

  const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), []);
  const formatNumber = useCallback((value: number) => numberFormatter.format(value), []);
  const formatPercent = useCallback((value: number) => percentFormatter.format(value), []);

  const loadDashboard = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [summary, positionsResponse, ordersResponse] = await Promise.all([
        fetchPortfolioSummary(),
        fetchPositions(),
        fetchOrders(),
      ]);

      setDashboard({
        summary,
        positions: positionsResponse.items,
        positionsAsOf: positionsResponse.asOf,
        orders: ordersResponse.items,
      });
    } catch (loadError) {
      setDashboard(initialState);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load the dashboard. Please verify the backend is running.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const resetQuantSignal = useCallback(() => {
    quantRequestGuardRef.current.reset();
    setQuantSignal(null);
    setQuantLoading(false);
    setQuantError(null);
  }, []);

  const loadQuantSignal = useCallback(async (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      resetQuantSignal();
      return;
    }

    const requestToken = quantRequestGuardRef.current.begin(normalizedSymbol);

    setQuantLoading(true);
    setQuantSignal(null);
    setQuantError(null);

    try {
      const nextSignal = await fetchQuantSignal(normalizedSymbol);
      if (!quantRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setQuantSignal(nextSignal);
    } catch (loadError) {
      if (!quantRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setQuantSignal(null);
      setQuantError(loadError instanceof Error ? loadError.message : 'Unable to load quant signal.');
    } finally {
      if (quantRequestGuardRef.current.isCurrent(requestToken)) {
        setQuantLoading(false);
      }
    }
  }, [resetQuantSignal]);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    if (!quantModeEnabled) {
      resetQuantSignal();
      return;
    }

    if (!selectedInstrument) {
      resetQuantSignal();
      return;
    }

    void loadQuantSignal(selectedInstrument.symbol);
  }, [loadQuantSignal, quantModeEnabled, resetQuantSignal, selectedInstrument]);

  const handleSubmitOrder = useCallback(async (input: Parameters<typeof createOrder>[0]) => {
    setSubmitting(true);
    try {
      await createOrder(input);
      await loadDashboard(false);
    } finally {
      setSubmitting(false);
    }
  }, [loadDashboard]);

  const handleInstrumentSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const response = await searchInstruments(query);
      setSearchResults(response.items);
    } catch (loadError) {
      setSearchResults([]);
      setSearchError(loadError instanceof Error ? loadError.message : 'Unable to search instruments.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSelectInstrument = useCallback((instrument: InstrumentSearchItem) => {
    setSelectedInstrument(instrument);
  }, []);

  const handleRefreshQuote = useCallback(() => {
    if (!selectedInstrument) {
      return;
    }

    void refreshLiveMarket();
  }, [refreshLiveMarket, selectedInstrument]);

  const handleRefreshChart = useCallback(() => {
    if (!selectedInstrument) {
      return;
    }

    void refreshLiveMarket();
  }, [refreshLiveMarket, selectedInstrument]);

  const handleRefreshWorkspace = useCallback(() => {
    void loadDashboard(false);

    if (selectedInstrument) {
      void refreshLiveMarket();

      if (quantModeEnabled) {
        void loadQuantSignal(selectedInstrument.symbol);
      }
    }
  }, [loadDashboard, loadQuantSignal, quantModeEnabled, refreshLiveMarket, selectedInstrument]);

  const handleRefreshQuantSignal = useCallback(() => {
    if (!selectedInstrument || !quantModeEnabled) {
      return;
    }

    void loadQuantSignal(selectedInstrument.symbol);
  }, [loadQuantSignal, quantModeEnabled, selectedInstrument]);

  const handleQuantModeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuantModeEnabled(event.target.checked);
  }, []);

  const statusText = useMemo(() => {
    if (loading) {
      return 'Synchronizing portfolio summary, positions, and recent orders through the Next.js proxy.';
    }
    if (refreshing) {
      return 'Refreshing portfolio, order, and market context from the backend.';
    }
    if (error) {
      return 'The frontend is still wired correctly, but one or more backend requests failed and the dashboard is showing fallback states.';
    }
    return 'Connected to the backend API through the Next.js proxy route with dashboard data, live selected-symbol snapshots, and order entry enabled.';
  }, [error, loading, refreshing]);

  const connectionBadgeClassName = loading || refreshing
    ? 'status-chip status-chip-pending'
    : error
      ? 'status-chip status-chip-error'
      : 'status-chip status-chip-success';
  const connectionBadgeText = loading
    ? 'Syncing dashboard'
    : refreshing
      ? 'Refreshing live data'
      : error
        ? 'Backend attention needed'
        : 'Backend connected';
  const quantBadgeClassName = quantModeEnabled
    ? 'status-chip status-chip-accent'
    : 'status-chip status-chip-muted';
  const quantBadgeText = quantModeEnabled ? 'Quant mode enabled' : 'Quant mode optional';

  return (
    <main className="page-shell">
      <header className="page-header page-header-hero">
        <div className="page-header-topline">
          <span className="page-eyebrow">QERP trading workspace</span>
          <div className="page-header-badges">
            <span className={connectionBadgeClassName}>{connectionBadgeText}</span>
            <span className={quantBadgeClassName}>{quantBadgeText}</span>
          </div>
        </div>

        <div className="page-header-main">
          <div className="page-header-copy">
            <h1>Execution dashboard</h1>
            <p>
              Portfolio visibility, instrument discovery, market context, quant overlays, and order entry in a
              cleaner production-style workflow.
            </p>
          </div>

          <div className="page-header-actions">
            <button
              className="toolbar-button toolbar-button-primary"
              type="button"
              onClick={handleRefreshWorkspace}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh workspace'}
            </button>
          </div>
        </div>

        <div className="overview-grid">
          <OverviewCard
            label="Portfolio value"
            value={dashboard.summary ? formatCurrency(dashboard.summary.totalPortfolioValue) : 'Unavailable'}
            meta={dashboard.summary ? `As of ${new Date(dashboard.summary.asOf).toLocaleString()}` : 'Waiting for a backend snapshot.'}
            tone="accent"
            loading={loading}
          />
          <OverviewCard
            label="Open positions"
            value={formatNumber(dashboard.positions.length)}
            meta={dashboard.positions.length > 0 ? 'Active holdings across the account.' : 'No open holdings returned yet.'}
            loading={loading}
          />
          <OverviewCard
            label="Recent orders"
            value={formatNumber(dashboard.orders.length)}
            meta={dashboard.orders.length > 0 ? 'Latest backend orders ready for review.' : 'No recent orders returned yet.'}
            loading={loading}
          />
          <OverviewCard
            label="Selected symbol"
            value={selectedInstrument?.symbol ?? 'Awaiting selection'}
            meta={selectedInstrument ? `${selectedInstrument.exchange} · ${selectedInstrument.assetType}` : 'Search for an instrument to activate quote, chart, and order context.'}
            tone={selectedInstrument ? 'success' : 'default'}
          />
        </div>
      </header>

      <div className="layout-grid">
        <div className="stack">
          {loading ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Portfolio summary</h2>
                  <p>Loading the latest account snapshot.</p>
                </div>
              </div>
              <div className="summary-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`summary-loading-${index}`} className="summary-card summary-card-loading" aria-hidden="true">
                    <div className="loading-bar loading-bar-sm" />
                    <div className="loading-bar loading-bar-md" />
                  </div>
                ))}
              </div>
            </section>
          ) : error ? (
            <section className="panel">
              <StatePanel
                title="Backend not available"
                message={error}
                tone="error"
                actionLabel={refreshing ? 'Refreshing…' : 'Try again'}
                onAction={() => void loadDashboard(false)}
                actionDisabled={refreshing}
              />
            </section>
          ) : dashboard.summary ? (
            <PortfolioSummarySection
              summary={dashboard.summary}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
            />
          ) : (
            <section className="panel">
              <StatePanel
                title="Portfolio snapshot unavailable"
                message="The backend responded without a portfolio summary. Refresh the workspace or verify seeded data exists."
                actionLabel={refreshing ? 'Refreshing…' : 'Refresh workspace'}
                onAction={() => void loadDashboard(false)}
                actionDisabled={refreshing}
              />
            </section>
          )}

          <PositionsTable
            positions={dashboard.positions}
            asOf={dashboard.positionsAsOf ?? undefined}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
            loading={loading}
            emptyMessage={
              error
                ? 'Waiting for a fresh positions snapshot once the backend reconnects.'
                : 'No open positions yet.'
            }
          />

          <OrderList
            orders={dashboard.orders}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            loading={loading}
            emptyMessage={
              error
                ? 'Recent orders will appear here once the backend reconnects.'
                : 'No orders submitted yet.'
            }
          />
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Workspace mode</h2>
                <p>Keep quant assistance opt-in while preserving the existing symbol-driven workflow.</p>
              </div>
            </div>
            <label className="mode-toggle" htmlFor="quant-mode-toggle">
              <input
                id="quant-mode-toggle"
                className="mode-toggle-input"
                type="checkbox"
                checked={quantModeEnabled}
                onChange={handleQuantModeChange}
              />
              <span className="mode-toggle-copy">
                <strong>Quant mode</strong>
                <small>Show backend BUY/HOLD/SELL signals derived from the latest quote.</small>
              </span>
            </label>
          </section>

          <InstrumentSearch
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            hasSearched={hasSearched}
            selectedSymbol={selectedInstrument?.symbol ?? null}
            onSearch={handleInstrumentSearch}
            onSelectInstrument={handleSelectInstrument}
          />

          <QuotePanel
            selectedInstrument={selectedInstrument}
            quote={quote}
            loading={liveMarketLoading}
            error={liveMarketError}
            onRefreshQuote={handleRefreshQuote}
            detailHref={getInstrumentDetailHref(selectedInstrument?.symbol)}
            activity={liveMarketActivity}
          />

          {quantModeEnabled ? (
            <QuantSignalPanel
              selectedInstrument={selectedInstrument}
              signal={quantSignal}
              loading={quantLoading}
              error={quantError}
              enabled={quantModeEnabled}
              onRefresh={handleRefreshQuantSignal}
            />
          ) : null}

          <MarketChartPanel
            selectedInstrument={selectedInstrument}
            candles={candles}
            quote={quote}
            loading={liveMarketLoading}
            error={liveMarketError}
            onRefresh={handleRefreshChart}
            activity={liveMarketActivity}
          />

          <OrderForm
            onSubmitOrder={handleSubmitOrder}
            submitting={submitting}
            selectedSymbol={selectedInstrument?.symbol ?? null}
            quantModeEnabled={quantModeEnabled}
            quantSignal={quantSignal}
          />

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Connection</h2>
                <p>Backend base URL defaults to localhost in local dev and the live Render backend on Vercel.</p>
              </div>
              <span className={connectionBadgeClassName}>{connectionBadgeText}</span>
            </div>
            <div className="status-stack">
              <div className="status-note">{statusText}</div>
              <div className="status-note status-note-subtle">
                Portfolio and order traffic continue to use the existing API contract and proxy wiring, while the
                selected symbol now polls the live snapshot endpoint whenever this tab is visible.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
