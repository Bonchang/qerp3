import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchCandles, fetchLiveMarketSnapshot, fetchQuote } from '@/lib/api';
import { createSymbolRequestGuard } from '@/lib/request-guard';
import type { MarketCandleSeries, MarketQuote } from '@/types/api';

const LIVE_POLL_INTERVAL_MS = 5_000;

type MarketSource = 'idle' | 'live' | 'snapshot';

export interface LiveMarketActivity {
  badgeClassName: string;
  badgeText: string;
  detailText: string;
  isVisible: boolean;
  lastUpdated: string | null;
  source: MarketSource;
}

function formatLastUpdated(timestamp: string | null): string {
  if (!timestamp) {
    return 'Awaiting the first market update.';
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return `Last updated ${timestamp}`;
  }

  return `Last updated ${parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

export function useLiveMarketSnapshot(symbol: string | null, candleLimit = 30) {
  const normalizedSymbol = useMemo(() => symbol?.trim().toUpperCase() ?? '', [symbol]);
  const requestGuardRef = useRef(createSymbolRequestGuard());
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [candles, setCandles] = useState<MarketCandleSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [source, setSource] = useState<MarketSource>('idle');
  const [isVisible, setIsVisible] = useState(() => (typeof document === 'undefined' ? true : document.visibilityState === 'visible'));

  const refresh = useCallback(async (mode: 'initial' | 'manual' | 'poll' = 'manual') => {
    if (!normalizedSymbol) {
      requestGuardRef.current.reset();
      setQuote(null);
      setCandles(null);
      setLoading(false);
      setError(null);
      setLastUpdated(null);
      setSource('idle');
      return;
    }

    const requestToken = requestGuardRef.current.begin(normalizedSymbol);
    const shouldShowLoading = mode !== 'poll' || (!quote && !candles);

    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      const snapshot = await fetchLiveMarketSnapshot(normalizedSymbol, candleLimit);
      if (!requestGuardRef.current.isCurrent(requestToken)) {
        return;
      }

      setQuote(snapshot.quote);
      setCandles(snapshot.candles);
      setError(null);
      setLastUpdated(snapshot.generatedAt ?? snapshot.quote.asOf);
      setSource('live');
    } catch (liveError) {
      try {
        const [nextQuote, nextCandles] = await Promise.all([
          fetchQuote(normalizedSymbol),
          fetchCandles(normalizedSymbol, '1D', Math.min(candleLimit, 30)),
        ]);

        if (!requestGuardRef.current.isCurrent(requestToken)) {
          return;
        }

        setQuote(nextQuote);
        setCandles(nextCandles);
        setError(null);
        setLastUpdated(nextQuote.asOf);
        setSource('snapshot');
      } catch (fallbackError) {
        if (!requestGuardRef.current.isCurrent(requestToken)) {
          return;
        }

        setError(
          fallbackError instanceof Error
            ? fallbackError.message
            : liveError instanceof Error
              ? liveError.message
              : 'Unable to load market data.',
        );
      }
    } finally {
      if (requestGuardRef.current.isCurrent(requestToken) && shouldShowLoading) {
        setLoading(false);
      }
    }
  }, [candleLimit, candles, normalizedSymbol, quote]);

  useEffect(() => {
    requestGuardRef.current.reset();
    setQuote(null);
    setCandles(null);
    setLoading(Boolean(normalizedSymbol));
    setError(null);
    setLastUpdated(null);
    setSource('idle');
  }, [normalizedSymbol]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!normalizedSymbol || !isVisible) {
      return undefined;
    }

    void refresh('initial');

    const intervalId = window.setInterval(() => {
      void refresh('poll');
    }, LIVE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isVisible, normalizedSymbol, refresh]);

  const activity = useMemo<LiveMarketActivity>(() => {
    if (!normalizedSymbol) {
      return {
        badgeClassName: 'status-chip status-chip-muted',
        badgeText: 'Live idle',
        detailText: 'Select a symbol to start polling the live snapshot endpoint.',
        isVisible,
        lastUpdated,
        source: 'idle',
      };
    }

    if (error && !quote && !candles) {
      return {
        badgeClassName: 'status-chip status-chip-error',
        badgeText: 'Live unavailable',
        detailText: error,
        isVisible,
        lastUpdated,
        source,
      };
    }

    if (source === 'live') {
      return {
        badgeClassName: isVisible ? 'status-chip status-chip-live' : 'status-chip status-chip-muted',
        badgeText: isVisible ? 'LIVE' : 'LIVE paused',
        detailText: `${formatLastUpdated(lastUpdated)} · auto-refresh ${isVisible ? 'every 5s while visible' : 'resumes when the tab is visible'}.`,
        isVisible,
        lastUpdated,
        source,
      };
    }

    if (source === 'snapshot') {
      return {
        badgeClassName: 'status-chip status-chip-pending',
        badgeText: 'Snapshot fallback',
        detailText: `${formatLastUpdated(lastUpdated)} · using the existing static endpoints until live polling succeeds again.`,
        isVisible,
        lastUpdated,
        source,
      };
    }

    return {
      badgeClassName: 'status-chip status-chip-pending',
      badgeText: loading ? 'Connecting live feed' : 'Waiting for market data',
      detailText: loading ? `Loading live market data for ${normalizedSymbol}…` : 'Waiting for the first live market payload.',
      isVisible,
      lastUpdated,
      source,
    };
  }, [candles, error, isVisible, lastUpdated, loading, normalizedSymbol, quote, source]);

  return {
    activity,
    candles,
    error,
    loading,
    quote,
    refresh,
  };
}
