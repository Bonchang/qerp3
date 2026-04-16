import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl, getApiErrorMessage } from '@/lib/api';

export const dynamic = 'force-dynamic';

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const upstreamUrl = new URL(`${getApiBaseUrl()}/api/v1/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });
  return upstreamUrl;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(request, path);
  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('content-type') ?? 'application/json',
    },
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Backend API is unavailable. Start the backend service and try again.',
        },
      },
      { status: 503 },
    );
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? 'application/json';

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': contentType,
    },
    statusText: response.ok ? response.statusText : getApiErrorMessage(text, response.statusText),
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}
