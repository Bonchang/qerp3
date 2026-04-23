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
  fetchCandles,
  fetchOrders,
  fetchPortfolioSummary,
  fetchPositions,
  fetchQuantSignal,
  fetchQuote,
  searchInstruments,
} from '@/lib/api';
import { createSymbolRequestGuard } from '@/lib/request-guard';
import type {
  InstrumentSearchItem,
  MarketCandleSeries,
  MarketQuote,
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
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [candles, setCandles] = useState<MarketCandleSeries | null>(null);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [candlesError, setCandlesError] = useState<string | null>(null);
  const [quantModeEnabled, setQuantModeEnabled] = useState(false);
  const [quantSignal, setQuantSignal] = useState<QuantSignal | null>(null);
  const [quantLoading, setQuantLoading] = useState(false);
  const [quantError, setQuantError] = useState<string | null>(null);
  const quoteRequestGuardRef = useRef(createSymbolRequestGuard());
  const candlesRequestGuardRef = useRef(createSymbolRequestGuard());
  const quantRequestGuardRef = useRef(createSymbolRequestGuard());

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

  const loadQuote = useCallback(async (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      quoteRequestGuardRef.current.reset();
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    const requestToken = quoteRequestGuardRef.current.begin(normalizedSymbol);

    setQuoteLoading(true);
    setQuote(null);
    setQuoteError(null);

    try {
      const nextQuote = await fetchQuote(normalizedSymbol);
      if (!quoteRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setQuote(nextQuote);
    } catch (loadError) {
      if (!quoteRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setQuote(null);
      setQuoteError(loadError instanceof Error ? loadError.message : 'Unable to load quote.');
    } finally {
      if (quoteRequestGuardRef.current.isCurrent(requestToken)) {
        setQuoteLoading(false);
      }
    }
  }, []);

  const loadCandles = useCallback(async (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      candlesRequestGuardRef.current.reset();
      setCandles(null);
      setCandlesLoading(false);
      setCandlesError(null);
      return;
    }

    const requestToken = candlesRequestGuardRef.current.begin(normalizedSymbol);

    setCandlesLoading(true);
    setCandles(null);
    setCandlesError(null);

    try {
      const nextCandles = await fetchCandles(normalizedSymbol);
      if (!candlesRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setCandles(nextCandles);
    } catch (loadError) {
      if (!candlesRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setCandles(null);
      setCandlesError(loadError instanceof Error ? loadError.message : 'Unable to load candles.');
    } finally {
      if (candlesRequestGuardRef.current.isCurrent(requestToken)) {
        setCandlesLoading(false);
      }
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

  const loadSelectedInstrumentMarketData = useCallback(async (symbol: string) => {
    await Promise.all([loadQuote(symbol), loadCandles(symbol)]);
  }, [loadCandles, loadQuote]);

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
    void loadSelectedInstrumentMarketData(instrument.symbol);
  }, [loadSelectedInstrumentMarketData]);

  const handleRefreshQuote = useCallback(() => {
    if (!selectedInstrument) {
      return;
    }

    void loadQuote(selectedInstrument.symbol);
  }, [loadQuote, selectedInstrument]);

  const handleRefreshChart = useCallback(() => {
    if (!selectedInstrument) {
      return;
    }

    void loadCandles(selectedInstrument.symbol);
  }, [loadCandles, selectedInstrument]);

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
      return 'Loading dashboard…';
    }
    if (refreshing) {
      return 'Refreshing data…';
    }
    if (error) {
      return 'Showing friendly empty state because the backend is unavailable or returned an error.';
    }
    return 'Connected to the backend API through the Next.js proxy route.';
  }, [error, loading, refreshing]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1>QERP frontend MVP shell</h1>
        <p>Minimal Next.js dashboard for portfolio visibility, market lookup, and order entry.</p>
      </header>

      <div className="layout-grid">
        <div className="stack">
          {error ? (
            <section className="panel">
              <div className="error-state">
                <strong>Backend not available</strong>
                <div>{error}</div>
              </div>
            </section>
          ) : dashboard.summary ? (
            <PortfolioSummarySection
              summary={dashboard.summary}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
            />
          ) : (
            <section className="panel">
              <div className="empty-state">Portfolio summary is not available yet.</div>
            </section>
          )}

          <PositionsTable
            positions={dashboard.positions}
            asOf={dashboard.positionsAsOf ?? undefined}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
          />

          <OrderList orders={dashboard.orders} formatCurrency={formatCurrency} formatNumber={formatNumber} />
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Mode</h2>
                <p>Enable the placeholder quant-worker experience for the selected symbol.</p>
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
                <small>Show BUY/HOLD/SELL placeholder signals derived from the latest quote.</small>
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
            loading={quoteLoading}
            error={quoteError}
            onRefreshQuote={handleRefreshQuote}
          />

          {quantModeEnabled ? (
            <QuantSignalPanel
              selectedInstrument={selectedInstrument}
              signal={quantSignal}
              loading={quantLoading}
              error={quantError}
              onRefresh={handleRefreshQuantSignal}
            />
          ) : null}

          <MarketChartPanel
            selectedInstrument={selectedInstrument}
            candles={candles}
            quote={quote}
            loading={candlesLoading}
            error={candlesError}
            onRefresh={handleRefreshChart}
          />

          <OrderForm
            onSubmitOrder={handleSubmitOrder}
            submitting={submitting}
            selectedSymbol={selectedInstrument?.symbol ?? null}
          />

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Connection</h2>
                <p>Backend base URL defaults to http://localhost:8080.</p>
              </div>
              <button className="toolbar-button" type="button" onClick={() => void loadDashboard(false)} disabled={loading || refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <div className="status-note">{statusText}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
