'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { buildOrderFormQuantRecommendation } from '@/lib/order-form-quant';
import type { CreateOrderInput, OrderSide, OrderType, QuantSignal } from '@/types/api';

interface Props {
  onSubmitOrder: (input: CreateOrderInput) => Promise<void>;
  submitting: boolean;
  selectedSymbol?: string | null;
  quantModeEnabled: boolean;
  quantSignal: QuantSignal | null;
}

const initialState = {
  symbol: 'AAPL',
  side: 'BUY' as OrderSide,
  orderType: 'MARKET' as OrderType,
  quantity: '1',
  limitPrice: '',
};

const priceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function OrderForm({ onSubmitOrder, submitting, selectedSymbol, quantModeEnabled, quantSignal }: Props) {
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quantFeedback, setQuantFeedback] = useState<string | null>(null);

  const showLimitPrice = useMemo(() => formState.orderType === 'LIMIT', [formState.orderType]);
  const quantRecommendation = useMemo(
    () =>
      buildOrderFormQuantRecommendation({
        quantModeEnabled,
        signal: quantSignal,
        orderSymbol: formState.symbol,
      }),
    [formState.symbol, quantModeEnabled, quantSignal],
  );

  useEffect(() => {
    if (!selectedSymbol) {
      return;
    }

    setFormState((current) => ({
      ...current,
      symbol: selectedSymbol.trim().toUpperCase(),
    }));
  }, [selectedSymbol]);

  useEffect(() => {
    setQuantFeedback(null);
  }, [quantRecommendation?.signal, quantRecommendation?.symbol]);

  function handleApplyQuantSuggestion() {
    if (!quantRecommendation?.isActionable || !quantRecommendation.suggestedSide) {
      return;
    }

    const suggestedSide = quantRecommendation.suggestedSide;

    setError(null);
    setSuccess(null);
    setQuantFeedback(
      `Applied ${quantRecommendation.signal} suggestion for ${quantRecommendation.symbol}. Review the order and submit manually.`,
    );
    setFormState((current) => ({
      ...current,
      symbol: quantRecommendation.symbol,
      side: suggestedSide,
      limitPrice:
        current.orderType === 'LIMIT'
          ? quantRecommendation.suggestedLimitPrice.toFixed(2)
          : current.limitPrice,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setQuantFeedback(null);

    const quantity = Number(formState.quantity);
    const limitPrice = formState.limitPrice ? Number(formState.limitPrice) : undefined;

    if (!formState.symbol.trim()) {
      setError('Symbol is required.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (showLimitPrice && (!Number.isFinite(limitPrice) || (limitPrice ?? 0) <= 0)) {
      setError('Limit price must be greater than zero for limit orders.');
      return;
    }

    try {
      await onSubmitOrder({
        symbol: formState.symbol,
        side: formState.side,
        orderType: formState.orderType,
        quantity,
        ...(showLimitPrice && limitPrice !== undefined ? { limitPrice } : {}),
      });
      setSuccess('Order submitted successfully.');
      setFormState((current) => ({
        ...initialState,
        symbol: current.symbol.trim().toUpperCase() || initialState.symbol,
        side: current.side,
        orderType: current.orderType,
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit order.');
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Place an order</h2>
          <p>Submit a paper order to the existing backend API.</p>
        </div>
      </div>

      {quantRecommendation ? (
        <div className={`order-form-quant-card ${quantRecommendation.toneClassName}`}>
          <div className="order-form-quant-header">
            <div>
              <div className="order-form-quant-eyebrow">Quant recommendation</div>
              <strong>{quantRecommendation.title}</strong>
            </div>
            <span className={`signal-pill ${quantRecommendation.toneClassName}`}>{quantRecommendation.signal}</span>
          </div>
          <p className="order-form-quant-copy">{quantRecommendation.summary}</p>
          <p className="order-form-quant-copy">{quantSignal?.explanation}</p>
          <div className="order-form-quant-meta">
            <span>Observed price {priceFormatter.format(quantRecommendation.suggestedLimitPrice)}</span>
            <span>{quantRecommendation.actionDescription}</span>
          </div>
          {quantRecommendation.isActionable ? (
            <button className="toolbar-button order-form-quant-button" type="button" onClick={handleApplyQuantSuggestion}>
              {quantRecommendation.actionLabel}
            </button>
          ) : (
            <div className="status-note">No side will be prefilled for HOLD. Trade only if you decide to override manually.</div>
          )}
          {quantFeedback ? <div className="status-note">{quantFeedback}</div> : null}
        </div>
      ) : null}

      <form className="order-form" onSubmit={handleSubmit}>
        <label>
          <span>Symbol</span>
          <input
            name="symbol"
            value={formState.symbol}
            maxLength={15}
            onChange={(event) => setFormState((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))}
            placeholder="AAPL"
          />
        </label>

        <label>
          <span>Side</span>
          <select
            name="side"
            value={formState.side}
            onChange={(event) => setFormState((current) => ({ ...current, side: event.target.value as OrderSide }))}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>

        <label>
          <span>Order type</span>
          <select
            name="orderType"
            value={formState.orderType}
            onChange={(event) => setFormState((current) => ({ ...current, orderType: event.target.value as OrderType, limitPrice: '' }))}
          >
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
          </select>
        </label>

        <label>
          <span>Quantity</span>
          <input
            name="quantity"
            type="number"
            min="0.0001"
            step="0.0001"
            value={formState.quantity}
            onChange={(event) => setFormState((current) => ({ ...current, quantity: event.target.value }))}
          />
        </label>

        <label>
          <span>Limit price</span>
          <input
            name="limitPrice"
            type="number"
            min="0.01"
            step="0.01"
            value={formState.limitPrice}
            onChange={(event) => setFormState((current) => ({ ...current, limitPrice: event.target.value }))}
            placeholder={showLimitPrice ? 'Required for limit orders' : 'Not used for market orders'}
            disabled={!showLimitPrice}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit order'}
        </button>
      </form>

      {error ? <p className="feedback feedback-error">{error}</p> : null}
      {success ? <p className="feedback feedback-success">{success}</p> : null}
    </section>
  );
}
