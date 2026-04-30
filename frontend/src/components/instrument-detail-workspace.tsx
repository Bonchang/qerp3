'use client';

import Link from 'next/link';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarketChartPanel } from '@/components/market-chart-panel';
import { OrderForm } from '@/components/order-form';
import { QuantSignalPanel } from '@/components/quant-signal-panel';
import { QuotePanel } from '@/components/quote-panel';
import { createOrder, fetchCandles, fetchInstrument, fetchQuantSignal, fetchQuote } from '@/lib/api';
import { createSymbolRequestGuard } from '@/lib/request-guard';
import type { InstrumentSearchItem, MarketCandleSeries, MarketQuote, QuantSignal } from '@/types/api';

interface Props {
  symbol: string;
}

export function InstrumentDetailWorkspace({ symbol }: Props) {
  const normalizedSymbol = useMemo(() => symbol.trim().toUpperCase(), [symbol]);

  const [instrument, setInstrument] = useState<InstrumentSearchItem | null>(null);
  const [instrumentLoading, setInstrumentLoading] = useState(true);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);

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

  const [submitting, setSubmitting] = useState(false);

  const instrumentRequestGuardRef = useRef(createSymbolRequestGuard());
  const quoteRequestGuardRef = useRef(createSymbolRequestGuard());
  const candlesRequestGuardRef = useRef(createSymbolRequestGuard());
  const quantRequestGuardRef = useRef(createSymbolRequestGuard());

  const resetQuantSignal = useCallback(() => {
    quantRequestGuardRef.current.reset();
    setQuantSignal(null);
    setQuantLoading(false);
    setQuantError(null);
  }, []);

  const loadInstrument = useCallback(async (nextSymbol: string) => {
    const targetSymbol = nextSymbol.trim().toUpperCase();

    instrumentRequestGuardRef.current.reset();
    quoteRequestGuardRef.current.reset();
    candlesRequestGuardRef.current.reset();
    quantRequestGuardRef.current.reset();

    setInstrument(null);
    setInstrumentError(null);
    setQuote(null);
    setQuoteError(null);
    setQuoteLoading(false);
    setCandles(null);
    setCandlesError(null);
    setCandlesLoading(false);
    setQuantSignal(null);
    setQuantError(null);
    setQuantLoading(false);

    if (!targetSymbol) {
      setInstrumentLoading(false);
      setInstrumentError('Symbol is required.');
      return;
    }

    const requestToken = instrumentRequestGuardRef.current.begin(targetSymbol);
    setInstrumentLoading(true);

    try {
      const nextInstrument = await fetchInstrument(targetSymbol);
      if (!instrumentRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setInstrument(nextInstrument);
    } catch (loadError) {
      if (!instrumentRequestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setInstrument(null);
      setInstrumentError(loadError instanceof Error ? loadError.message : 'Unable to load instrument details.');
    } finally {
      if (instrumentRequestGuardRef.current.isCurrent(requestToken)) {
        setInstrumentLoading(false);
      }
    }
  }, []);

  const loadQuote = useCallback(async (nextSymbol: string) => {
    const targetSymbol = nextSymbol.trim().toUpperCase();

    if (!targetSymbol) {
      quoteRequestGuardRef.current.reset();
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    const requestToken = quoteRequestGuardRef.current.begin(targetSymbol);

    setQuoteLoading(true);
    setQuote(null);
    setQuoteError(null);

    try {
      const nextQuote = await fetchQuote(targetSymbol);
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

  const loadCandles = useCallback(async (nextSymbol: string) => {
    const targetSymbol = nextSymbol.trim().toUpperCase();

    if (!targetSymbol) {
      candlesRequestGuardRef.current.reset();
      setCandles(null);
      setCandlesLoading(false);
      setCandlesError(null);
      return;
    }

    const requestToken = candlesRequestGuardRef.current.begin(targetSymbol);

    setCandlesLoading(true);
    setCandles(null);
    setCandlesError(null);

    try {
      const nextCandles = await fetchCandles(targetSymbol);
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

  const loadQuantSignal = useCallback(async (nextSymbol: string) => {
    const targetSymbol = nextSymbol.trim().toUpperCase();

    if (!targetSymbol) {
      resetQuantSignal();
      return;
    }

    const requestToken = quantRequestGuardRef.current.begin(targetSymbol);

    setQuantLoading(true);
    setQuantSignal(null);
    setQuantError(null);

    try {
      const nextSignal = await fetchQuantSignal(targetSymbol);
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

  const loadSelectedInstrumentMarketData = useCallback(async (nextSymbol: string) => {
    await Promise.all([loadQuote(nextSymbol), loadCandles(nextSymbol)]);
  }, [loadCandles, loadQuote]);

  useEffect(() => {
    void loadInstrument(normalizedSymbol);
  }, [loadInstrument, normalizedSymbol]);

  useEffect(() => {
    if (!instrument) {
      return;
    }

    void loadSelectedInstrumentMarketData(instrument.symbol);
  }, [instrument, loadSelectedInstrumentMarketData]);

  useEffect(() => {
    if (!quantModeEnabled) {
      resetQuantSignal();
      return;
    }

    if (!instrument) {
      resetQuantSignal();
      return;
    }

    void loadQuantSignal(instrument.symbol);
  }, [instrument, loadQuantSignal, quantModeEnabled, resetQuantSignal]);

  const handleQuantModeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuantModeEnabled(event.target.checked);
  }, []);

  const handleRefreshAll = useCallback(() => {
    if (!instrument) {
      void loadInstrument(normalizedSymbol);
      return;
    }

    void loadSelectedInstrumentMarketData(instrument.symbol);
    if (quantModeEnabled) {
      void loadQuantSignal(instrument.symbol);
    }
  }, [instrument, loadInstrument, loadQuantSignal, loadSelectedInstrumentMarketData, normalizedSymbol, quantModeEnabled]);

  const handleRefreshQuote = useCallback(() => {
    if (!instrument) {
      return;
    }

    void loadQuote(instrument.symbol);
  }, [instrument, loadQuote]);

  const handleRefreshChart = useCallback(() => {
    if (!instrument) {
      return;
    }

    void loadCandles(instrument.symbol);
  }, [instrument, loadCandles]);

  const handleRefreshQuantSignal = useCallback(() => {
    if (!instrument || !quantModeEnabled) {
      return;
    }

    void loadQuantSignal(instrument.symbol);
  }, [instrument, loadQuantSignal, quantModeEnabled]);

  const handleSubmitOrder = useCallback(async (input: Parameters<typeof createOrder>[0]) => {
    setSubmitting(true);
    try {
      await createOrder(input);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const detailSummary = useMemo(() => {
    if (!instrument) {
      return 'Resolve the instrument first to sync quote, chart, quant, and order state.';
    }

    return `${instrument.exchange} · ${instrument.assetType} · ${instrument.currency}`;
  }, [instrument]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="page-breadcrumb">
          <Link href="/">← Back to dashboard</Link>
        </div>
        <h1>{instrument ? `${instrument.symbol} detail` : `${normalizedSymbol || 'Instrument'} detail`}</h1>
        <p>
          {instrument
            ? `${instrument.name} · ${detailSummary}`
            : 'Dedicated selected-symbol workspace for quote, chart, quant signal, and order flow.'}
        </p>
      </header>

      {instrumentLoading ? (
        <section className="panel">
          <div className="status-note">Loading instrument detail for {normalizedSymbol || 'the selected symbol'}…</div>
        </section>
      ) : null}

      {!instrumentLoading && instrumentError ? (
        <section className="panel">
          <div className="error-state">
            <strong>Instrument detail unavailable</strong>
            <div>{instrumentError}</div>
          </div>
        </section>
      ) : null}

      {!instrumentLoading && !instrumentError && instrument ? (
        <>
          <section className="panel instrument-detail-overview">
            <div className="instrument-detail-overview-main">
              <div className="instrument-detail-eyebrow">Selected instrument</div>
              <div className="quote-symbol">{instrument.symbol}</div>
              <h2>{instrument.name}</h2>
              <p>Quote, chart, quant signal, and order entry stay pinned to the same symbol state.</p>
            </div>

            <div className="instrument-detail-overview-side">
              <div className="instrument-detail-badges">
                <span className="chart-badge">{instrument.exchange}</span>
                <span className="chart-badge">{instrument.assetType}</span>
                <span className="chart-badge">{instrument.currency}</span>
              </div>
              <button className="toolbar-button" type="button" onClick={handleRefreshAll}>
                Refresh all panels
              </button>
            </div>
          </section>

          <div className="layout-grid detail-layout-grid">
            <div className="stack">
              <QuotePanel
                selectedInstrument={instrument}
                quote={quote}
                loading={quoteLoading}
                error={quoteError}
                onRefreshQuote={handleRefreshQuote}
              />

              <MarketChartPanel
                selectedInstrument={instrument}
                candles={candles}
                quote={quote}
                loading={candlesLoading}
                error={candlesError}
                onRefresh={handleRefreshChart}
              />
            </div>

            <div className="stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Quant mode</h2>
                    <p>Keep backend quant context attached to this symbol before you place an order.</p>
                  </div>
                </div>
                <label className="mode-toggle" htmlFor="detail-quant-mode-toggle">
                  <input
                    id="detail-quant-mode-toggle"
                    className="mode-toggle-input"
                    type="checkbox"
                    checked={quantModeEnabled}
                    onChange={handleQuantModeChange}
                  />
                  <span className="mode-toggle-copy">
                    <strong>Quant mode</strong>
                    <small>Safest default kept: the signal stays opt-in until you explicitly enable it.</small>
                  </span>
                </label>
              </section>

              <QuantSignalPanel
                selectedInstrument={instrument}
                signal={quantSignal}
                loading={quantLoading}
                error={quantError}
                enabled={quantModeEnabled}
                onRefresh={handleRefreshQuantSignal}
              />

              <OrderForm
                onSubmitOrder={handleSubmitOrder}
                submitting={submitting}
                selectedSymbol={instrument.symbol}
                quantModeEnabled={quantModeEnabled}
                quantSignal={quantSignal}
              />
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
