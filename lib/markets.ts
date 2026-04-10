export type MarketStatus = 'open' | 'paused' | 'closed' | 'settled' | 'unknown';

export type NormalizedMarket = {
  ticker: string;
  title: string;
  subtitle: string;
  status: MarketStatus;
  yesBidCents: number | null;
  yesAskCents: number | null;
  noBidCents: number | null;
  noAskCents: number | null;
  lastPriceCents: number | null;
  midpointCents: number | null;
  yesSpreadCents: number | null;
  closeTime: string | null;
  closeTimeLabel: string;
  timeToCloseLabel: string;
  volume24h: number | null;
  volume: number | null;
  updatedAt: string;
};

export type MarketResponseShape = {
  ticker: string;
  title?: string;
  subtitle?: string;
  yes_bid_dollars?: string | null;
  yes_ask_dollars?: string | null;
  no_bid_dollars?: string | null;
  no_ask_dollars?: string | null;
  last_price_dollars?: string | null;
  close_time?: string | null;
  status?: string | null;
  volume_24h_fp?: string | null;
  volume_fp?: string | null;
};

export const SAMPLE_MARKETS: NormalizedMarket[] = [
  {
    ticker: 'DEMO-GDP-2026',
    title: 'Will US GDP beat consensus this quarter?',
    subtitle: 'Sample market for layout preview',
    status: 'open',
    yesBidCents: 47,
    yesAskCents: 49,
    noBidCents: 51,
    noAskCents: 53,
    lastPriceCents: 48,
    midpointCents: 48,
    yesSpreadCents: 2,
    closeTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    closeTimeLabel: formatCloseTime(new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()),
    timeToCloseLabel: formatTimeToClose(new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()),
    volume24h: 18200,
    volume: 64000,
    updatedAt: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-CPI-2026',
    title: 'Will CPI print above 0.3% this month?',
    subtitle: 'Sample market for layout preview',
    status: 'open',
    yesBidCents: 58,
    yesAskCents: 61,
    noBidCents: 39,
    noAskCents: 42,
    lastPriceCents: 60,
    midpointCents: 59.5,
    yesSpreadCents: 3,
    closeTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    closeTimeLabel: formatCloseTime(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()),
    timeToCloseLabel: formatTimeToClose(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()),
    volume24h: 9200,
    volume: 28500,
    updatedAt: new Date().toISOString(),
  },
  {
    ticker: 'DEMO-RATE-2026',
    title: 'Will the Fed cut at the next meeting?',
    subtitle: 'Sample market for layout preview',
    status: 'paused',
    yesBidCents: 24,
    yesAskCents: 27,
    noBidCents: 73,
    noAskCents: 76,
    lastPriceCents: 25,
    midpointCents: 25.5,
    yesSpreadCents: 3,
    closeTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    closeTimeLabel: formatCloseTime(new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()),
    timeToCloseLabel: formatTimeToClose(new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()),
    volume24h: 5400,
    volume: 71000,
    updatedAt: new Date().toISOString(),
  },
];

export function parseDollarStringToCents(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed * 100;
}

export function normalizeStatus(value: string | null | undefined): MarketStatus {
  if (value === 'open' || value === 'paused' || value === 'closed' || value === 'settled') {
    return value;
  }

  return 'unknown';
}

export function formatCloseTime(value: string | null): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeToClose(value: string | null): string {
  if (!value) {
    return '--';
  }

  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) {
    return '--';
  }

  const diff = target - Date.now();
  if (diff <= 0) {
    return 'Closed';
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function normalizeMarket(market: MarketResponseShape): NormalizedMarket {
  const yesBidCents = parseDollarStringToCents(market.yes_bid_dollars);
  const yesAskCents = parseDollarStringToCents(market.yes_ask_dollars);
  const noBidCents = parseDollarStringToCents(market.no_bid_dollars);
  const noAskCents = parseDollarStringToCents(market.no_ask_dollars);
  const lastPriceCents = parseDollarStringToCents(market.last_price_dollars);
  const midpointCents = yesBidCents !== null && yesAskCents !== null ? (yesBidCents + yesAskCents) / 2 : null;
  const yesSpreadCents = yesBidCents !== null && yesAskCents !== null ? yesAskCents - yesBidCents : null;

  return {
    ticker: market.ticker,
    title: market.title ?? market.ticker,
    subtitle: market.subtitle ?? '',
    status: normalizeStatus(market.status),
    yesBidCents,
    yesAskCents,
    noBidCents,
    noAskCents,
    lastPriceCents,
    midpointCents,
    yesSpreadCents,
    closeTime: market.close_time ?? null,
    closeTimeLabel: formatCloseTime(market.close_time ?? null),
    timeToCloseLabel: formatTimeToClose(market.close_time ?? null),
    volume24h: market.volume_24h_fp ? Number(market.volume_24h_fp) : null,
    volume: market.volume_fp ? Number(market.volume_fp) : null,
    updatedAt: new Date().toISOString(),
  };
}

export function formatCents(value: number | null, precision = 0): string {
  if (value === null) {
    return '--';
  }

  return `${value.toFixed(precision)}¢`;
}

export function formatCompactNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function statusTone(status: MarketStatus): string {
  if (status === 'open') return 'positive';
  if (status === 'paused') return 'warn';
  if (status === 'closed' || status === 'settled') return 'muted';
  return 'muted';
}
