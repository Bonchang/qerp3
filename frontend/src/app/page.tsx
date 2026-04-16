'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { OrderForm } from '@/components/order-form';
import { OrderList } from '@/components/order-list';
import { PortfolioSummarySection } from '@/components/portfolio-summary';
import { PositionsTable } from '@/components/positions-table';
import { createOrder, fetchOrders, fetchPortfolioSummary, fetchPositions } from '@/lib/api';
import type { Order, PortfolioSummary, PositionItem } from '@/types/api';

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

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const handleSubmitOrder = useCallback(async (input: Parameters<typeof createOrder>[0]) => {
    setSubmitting(true);
    try {
      await createOrder(input);
      await loadDashboard(false);
    } finally {
      setSubmitting(false);
    }
  }, [loadDashboard]);

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
        <p>Minimal Next.js dashboard for portfolio visibility and order entry.</p>
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
          <OrderForm onSubmitOrder={handleSubmitOrder} submitting={submitting} />

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
