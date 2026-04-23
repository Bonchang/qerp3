import {
  ApiErrorResponse,
  CreateOrderInput,
  InstrumentSearchResponse,
  MarketCandleSeries,
  MarketQuote,
  OrderListResponse,
  PortfolioPositionsResponse,
  PortfolioSummary,
  QuantSignal,
} from '@/types/api';

export const DEFAULT_API_BASE_URL = 'http://localhost:8080';
export const FRONTEND_PROXY_PREFIX = '/api/backend';
export const FRONTEND_QUANT_PREFIX = '/api/quant';

export function getApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL): string {
  const raw = value?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : DEFAULT_API_BASE_URL;
}

export function getApiErrorMessage(payload: unknown, fallback = 'Request failed'): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const typedPayload = payload as ApiErrorResponse;
  const detailMessage = typedPayload.error?.details
    ?.filter((detail) => detail.field || detail.reason)
    .map((detail) => `${detail.field ?? 'field'} ${detail.reason ?? 'is invalid'}`)
    .join(', ');

  return typedPayload.error?.message || detailMessage || fallback;
}

export function toOrderRequestBody(input: CreateOrderInput): Record<string, unknown> {
  return {
    symbol: input.symbol.trim().toUpperCase(),
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    ...(input.orderType === 'LIMIT' && input.limitPrice !== undefined
      ? { limitPrice: input.limitPrice }
      : {}),
  };
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function requestPath<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
  }

  return payload as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestPath<T>(`${FRONTEND_PROXY_PREFIX}${path}`, init);
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  return request<PortfolioSummary>('/portfolio');
}

export async function fetchPositions(): Promise<PortfolioPositionsResponse> {
  return request<PortfolioPositionsResponse>('/portfolio/positions');
}

export async function searchInstruments(query: string, limit = 10): Promise<InstrumentSearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error('Search query is required.');
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
  });

  return request<InstrumentSearchResponse>(`/instruments/search?${params.toString()}`);
}

export async function fetchQuote(symbol: string): Promise<MarketQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error('Symbol is required.');
  }

  return request<MarketQuote>(`/market/quotes/${encodeURIComponent(normalizedSymbol)}`);
}

export async function fetchCandles(symbol: string, interval = '1D', limit = 30): Promise<MarketCandleSeries> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error('Symbol is required.');
  }

  const params = new URLSearchParams({
    interval: interval.trim().toUpperCase(),
    limit: String(limit),
  });

  return request<MarketCandleSeries>(`/market/candles/${encodeURIComponent(normalizedSymbol)}?${params.toString()}`);
}

export async function fetchQuantSignal(symbol: string, thresholdPercent?: number): Promise<QuantSignal> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error('Symbol is required.');
  }

  const params = new URLSearchParams();

  if (thresholdPercent !== undefined) {
    params.set('thresholdPercent', String(thresholdPercent));
  }

  const queryString = params.toString();
  const path = `${FRONTEND_QUANT_PREFIX}/signals/${encodeURIComponent(normalizedSymbol)}${queryString ? `?${queryString}` : ''}`;

  return requestPath<QuantSignal>(path);
}

export async function fetchOrders(): Promise<OrderListResponse> {
  return request<OrderListResponse>('/orders?limit=10');
}

export async function createOrder(input: CreateOrderInput): Promise<void> {
  await request('/orders', {
    method: 'POST',
    body: JSON.stringify(toOrderRequestBody(input)),
  });
}
