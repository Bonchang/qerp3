'use client';

import Link from 'next/link';
import React, { FormEvent, useState } from 'react';

import { getInstrumentDetailHref } from '@/lib/instrument-detail-route';
import type { InstrumentSearchItem } from '@/types/api';

interface Props {
  results: InstrumentSearchItem[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  selectedSymbol?: string | null;
  onSearch: (query: string) => Promise<void>;
  onSelectInstrument: (instrument: InstrumentSearchItem) => void;
}

export function InstrumentSearch({
  results,
  loading,
  error,
  hasSearched,
  selectedSymbol,
  onSearch,
  onSelectInstrument,
}: Props) {
  const [query, setQuery] = useState('AAPL');
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setLocalError('Enter a symbol or company name to search.');
      return;
    }

    setLocalError(null);
    await onSearch(normalizedQuery);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Instrument search</h2>
          <p>Find a supported symbol, then load its quote into the dashboard.</p>
        </div>
      </div>

      <form className="instrument-search-form" onSubmit={handleSubmit}>
        <label>
          <span>Search</span>
          <input
            name="instrumentQuery"
            value={query}
            maxLength={50}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="AAPL or Apple"
          />
        </label>

        <button className="toolbar-button" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {localError ? <p className="feedback feedback-error">{localError}</p> : null}
      {!localError && error ? <p className="feedback feedback-error">{error}</p> : null}

      {loading ? <div className="status-note">Searching market catalog…</div> : null}

      {!loading && hasSearched && results.length === 0 && !error ? (
        <div className="empty-state">No instruments matched that search.</div>
      ) : null}

      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((instrument) => {
            const isSelected = instrument.symbol === selectedSymbol;
            const detailHref = getInstrumentDetailHref(instrument.symbol);

            return (
              <li key={instrument.symbol} className="search-result-card">
                <button
                  className={`search-result-button${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  onClick={() => onSelectInstrument(instrument)}
                >
                  <div className="search-result-topline">
                    <strong>{instrument.symbol}</strong>
                    <span>{instrument.exchange}</span>
                  </div>
                  <div className="search-result-name">{instrument.name}</div>
                  <div className="search-result-meta">
                    <span>{instrument.assetType}</span>
                    <span>{instrument.currency}</span>
                    {isSelected ? <span>Selected</span> : null}
                  </div>
                </button>

                {detailHref ? (
                  <div className="search-result-actions">
                    <Link className="toolbar-link search-result-link" href={detailHref}>
                      Open detail
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
