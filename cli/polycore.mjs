#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

function usage() {
  console.log(`PolyCore CLI

Usage:
  node ./cli/polycore.mjs watch --tickers TICKER1,TICKER2 [--refresh 10]
  node ./cli/polycore.mjs watch --file ./watchlists/default.json [--once]
  node ./cli/polycore.mjs monitor --tickers TICKER1,TICKER2 [--refresh 8]

Flags:
  --tickers   Comma-separated Kalshi tickers
  --file      Path to a JSON file containing an array of tickers
  --refresh   Refresh interval in seconds (minimum 5)
  --once      Fetch once and exit
`);
}

function parseArgs(argv) {
  const args = { command: argv[2] ?? 'watch', tickers: '', file: '', refresh: 10, once: false };
  for (let index = 3; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === '--tickers') {
      args.tickers = next ?? '';
      index += 1;
    } else if (current === '--file') {
      args.file = next ?? '';
      index += 1;
    } else if (current === '--refresh') {
      args.refresh = Math.max(5, Number(next) || 10);
      index += 1;
    } else if (current === '--once') {
      args.once = true;
    } else if (current === '--help' || current === '-h') {
      usage();
      process.exit(0);
    }
  }
  return args;
}

function readTickers(args) {
  if (args.tickers) {
    return args.tickers.split(',').map((ticker) => ticker.trim()).filter(Boolean);
  }
  if (args.file) {
    const resolved = path.resolve(process.cwd(), args.file);
    const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    if (!Array.isArray(parsed)) {
      throw new Error('Watchlist file must be a JSON array of tickers.');
    }
    return parsed.map((ticker) => String(ticker).trim()).filter(Boolean);
  }
  throw new Error('Provide --tickers or --file.');
}

function cents(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * 100 : null;
}

function closeCountdown(value) {
  if (!value) return '--';
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function pad(value, width) {
  const stringValue = String(value);
  return stringValue.length >= width ? stringValue.slice(0, width) : stringValue + ' '.repeat(width - stringValue.length);
}

function fmtCents(value) {
  return value === null ? '--' : `${Math.round(value)}¢`;
}

function fmtTitle(value) {
  const clean = value ?? '--';
  return clean.length > 36 ? `${clean.slice(0, 33)}...` : clean;
}

async function fetchMarkets(tickers) {
  const url = `${API_BASE}/markets?tickers=${encodeURIComponent(tickers.join(','))}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Kalshi request failed with ${response.status}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.markets) ? payload.markets.map((market) => ({
    ticker: market.ticker,
    title: market.title,
    status: market.status,
    yesBid: cents(market.yes_bid_dollars),
    yesAsk: cents(market.yes_ask_dollars),
    noBid: cents(market.no_bid_dollars),
    noAsk: cents(market.no_ask_dollars),
    spread: cents(market.yes_ask_dollars) !== null && cents(market.yes_bid_dollars) !== null ? cents(market.yes_ask_dollars) - cents(market.yes_bid_dollars) : null,
    last: cents(market.last_price_dollars),
    closeTime: market.close_time,
    countdown: closeCountdown(market.close_time),
  })) : [];
}

function renderWatch(markets, refresh) {
  console.clear();
  console.log(`PolyCore watch | refresh ${refresh}s | updated ${new Date().toLocaleTimeString()} | rows ${markets.length}`);
  console.log('');
  console.log(
    [
      pad('TICKER', 22),
      pad('TITLE', 36),
      pad('STATUS', 8),
      pad('YB', 6),
      pad('YA', 6),
      pad('NB', 6),
      pad('NA', 6),
      pad('SPRD', 6),
      pad('LAST', 6),
      pad('TIME LEFT', 10),
    ].join('  '),
  );
  console.log('-'.repeat(130));
  for (const market of markets) {
    console.log([
      pad(market.ticker, 22),
      pad(fmtTitle(market.title), 36),
      pad(market.status ?? '--', 8),
      pad(fmtCents(market.yesBid), 6),
      pad(fmtCents(market.yesAsk), 6),
      pad(fmtCents(market.noBid), 6),
      pad(fmtCents(market.noAsk), 6),
      pad(fmtCents(market.spread), 6),
      pad(fmtCents(market.last), 6),
      pad(market.countdown, 10),
    ].join('  '));
  }
}

function renderMonitor(markets, refresh) {
  const widest = [...markets].sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1))[0];
  const soonest = [...markets].sort((a, b) => new Date(a.closeTime ?? 0).getTime() - new Date(b.closeTime ?? 0).getTime())[0];
  console.clear();
  console.log(`PolyCore monitor | refresh ${refresh}s | ${new Date().toLocaleTimeString()}`);
  console.log('');
  console.log(`Open rows: ${markets.filter((market) => market.status === 'open').length} | Widest spread: ${widest ? `${widest.ticker} ${fmtCents(widest.spread)}` : '--'} | Soonest close: ${soonest ? `${soonest.ticker} ${soonest.countdown}` : '--'}`);
  console.log('');
  renderWatch(markets, refresh);
}

async function run() {
  const args = parseArgs(process.argv);
  if (!['watch', 'monitor'].includes(args.command)) {
    usage();
    process.exit(1);
  }
  const tickers = readTickers(args);
  const render = args.command === 'monitor' ? renderMonitor : renderWatch;
  const loop = async () => {
    const markets = await fetchMarkets(tickers);
    render(markets, args.refresh);
  };
  if (args.once) {
    await loop();
    return;
  }
  await loop();
  setInterval(loop, args.refresh * 1000);
}

run().catch((error) => {
  console.error(`PolyCore CLI error: ${error.message}`);
  process.exit(1);
});
