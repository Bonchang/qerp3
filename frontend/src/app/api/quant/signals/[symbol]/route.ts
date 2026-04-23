import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl, getApiErrorMessage } from '@/lib/api';
import { deriveReferencePriceFromQuote, normalizeQuantThresholdPercent, runQuantWorker } from '@/lib/quant-worker';
import type { ApiErrorResponse, MarketQuote } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseJsonSafely(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function fetchQuote(symbol: string): Promise<MarketQuote> {
  const upstreamUrl = new URL(`${getApiBaseUrl()}/api/v1/market/quotes/${encodeURIComponent(symbol)}`);
  const response = await fetch(upstreamUrl, { cache: 'no-store' }).catch(() => null);

  if (!response) {
    throw {
      status: 503,
      body: {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Backend API is unavailable. Start the backend service and try again.',
        },
      } satisfies ApiErrorResponse,
    };
  }

  const text = await response.text();
  const payload = parseJsonSafely(text);

  if (!response.ok) {
    throw {
      status: response.status,
      body: {
        error: {
          code: 'QUOTE_UNAVAILABLE',
          message: getApiErrorMessage(payload, `Quote request failed with status ${response.status}`),
        },
      } satisfies ApiErrorResponse,
    };
  }

  if (!payload || typeof payload !== 'object') {
    throw {
      status: 502,
      body: {
        error: {
          code: 'INVALID_QUOTE_RESPONSE',
          message: 'Backend quote response was not valid JSON.',
        },
      } satisfies ApiErrorResponse,
    };
  }

  return payload as MarketQuote;
}

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_SYMBOL',
          message: 'Symbol is required.',
        },
      } satisfies ApiErrorResponse,
      { status: 400 },
    );
  }

  let thresholdPercent: number;

  try {
    thresholdPercent = normalizeQuantThresholdPercent(request.nextUrl.searchParams.get('thresholdPercent'));
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_THRESHOLD_PERCENT',
          message: error instanceof Error ? error.message : 'thresholdPercent is invalid.',
        },
      } satisfies ApiErrorResponse,
      { status: 400 },
    );
  }

  let quote: MarketQuote;

  try {
    quote = await fetchQuote(normalizedSymbol);
  } catch (error) {
    const routeError = error as { status?: number; body?: ApiErrorResponse };
    return NextResponse.json(routeError.body ?? { error: { message: 'Unable to load quote.' } }, {
      status: routeError.status ?? 500,
    });
  }

  let referencePrice: number;

  try {
    referencePrice = deriveReferencePriceFromQuote(quote);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_REFERENCE_PRICE',
          message: error instanceof Error ? error.message : 'Unable to derive reference price.',
        },
      } satisfies ApiErrorResponse,
      { status: 502 },
    );
  }

  try {
    const signal = await runQuantWorker({
      symbol: normalizedSymbol,
      observedPrice: quote.price,
      referencePrice,
      thresholdPercent,
    });

    return NextResponse.json(signal);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'QUANT_WORKER_FAILED',
          message: error instanceof Error ? error.message : 'quant-worker execution failed.',
        },
      } satisfies ApiErrorResponse,
      { status: 500 },
    );
  }
}
