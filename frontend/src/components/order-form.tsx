'use client';

import { FormEvent, useMemo, useState } from 'react';

import type { CreateOrderInput, OrderSide, OrderType } from '@/types/api';

interface Props {
  onSubmitOrder: (input: CreateOrderInput) => Promise<void>;
  submitting: boolean;
}

const initialState = {
  symbol: 'AAPL',
  side: 'BUY' as OrderSide,
  orderType: 'MARKET' as OrderType,
  quantity: '1',
  limitPrice: '',
};

export function OrderForm({ onSubmitOrder, submitting }: Props) {
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showLimitPrice = useMemo(() => formState.orderType === 'LIMIT', [formState.orderType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

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
