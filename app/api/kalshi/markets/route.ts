import { NextRequest, NextResponse } from 'next/server';
import { normalizeMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get('tickers')?.trim() ?? '';

  if (!tickers) {
    return NextResponse.json({ markets: [] });
  }

  const endpoint = `https://api.elections.kalshi.com/trade-api/v2/markets?tickers=${encodeURIComponent(tickers)}`;

  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Kalshi request failed with ${response.status}` }, { status: 502 });
    }

    const payload = (await response.json()) as { markets?: unknown[] };
    const markets = Array.isArray(payload.markets) ? payload.markets : [];

    return NextResponse.json({
      markets: markets.map((market) => normalizeMarket(market as never)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown market data error' },
      { status: 500 },
    );
  }
}
