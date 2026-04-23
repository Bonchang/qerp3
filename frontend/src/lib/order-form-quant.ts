import type { OrderSide, QuantSignal } from '@/types/api';

export interface OrderFormQuantRecommendation {
  symbol: string;
  signal: QuantSignal['signal'];
  title: string;
  summary: string;
  actionDescription: string;
  actionLabel: string | null;
  isActionable: boolean;
  suggestedSide: OrderSide | null;
  suggestedLimitPrice: number;
  toneClassName: 'signal-pill-buy' | 'signal-pill-hold' | 'signal-pill-sell';
}

function normalizeSymbol(symbol?: string | null) {
  return symbol?.trim().toUpperCase() ?? '';
}

export function buildOrderFormQuantRecommendation({
  quantModeEnabled,
  signal,
  orderSymbol,
}: {
  quantModeEnabled: boolean;
  signal: QuantSignal | null;
  orderSymbol?: string | null;
}): OrderFormQuantRecommendation | null {
  if (!quantModeEnabled || !signal) {
    return null;
  }

  const normalizedOrderSymbol = normalizeSymbol(orderSymbol);

  if (normalizedOrderSymbol && normalizedOrderSymbol !== signal.symbol) {
    return null;
  }

  if (signal.signal === 'BUY') {
    return {
      symbol: signal.symbol,
      signal: signal.signal,
      title: `Quant suggests a BUY setup for ${signal.symbol}`,
      summary: 'Use the signal to prefill the order side, then review size and order type before submitting.',
      actionDescription: 'Applying this suggestion sets the side to BUY and can seed the limit price when you are using a limit order.',
      actionLabel: 'Apply quant suggestion',
      isActionable: true,
      suggestedSide: 'BUY',
      suggestedLimitPrice: signal.observedPrice,
      toneClassName: 'signal-pill-buy',
    };
  }

  if (signal.signal === 'SELL') {
    return {
      symbol: signal.symbol,
      signal: signal.signal,
      title: `Quant suggests a SELL setup for ${signal.symbol}`,
      summary: 'Use the signal to prefill the order side, then confirm quantity and execution details yourself.',
      actionDescription: 'Applying this suggestion sets the side to SELL and can seed the limit price when you are using a limit order.',
      actionLabel: 'Apply quant suggestion',
      isActionable: true,
      suggestedSide: 'SELL',
      suggestedLimitPrice: signal.observedPrice,
      toneClassName: 'signal-pill-sell',
    };
  }

  return {
    symbol: signal.symbol,
    signal: signal.signal,
    title: `Quant is neutral on ${signal.symbol}`,
    summary: 'Current signal is HOLD, so the form stays manual and no trade side is suggested.',
    actionDescription: 'Treat this as informational context only. Review the quote and chart before deciding whether to trade.',
    actionLabel: null,
    isActionable: false,
    suggestedSide: null,
    suggestedLimitPrice: signal.observedPrice,
    toneClassName: 'signal-pill-hold',
  };
}
