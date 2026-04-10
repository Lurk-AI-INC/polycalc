# PolyCore

Open-source binary market toolkit by Lurk.

## What is in here

- **Calculator** — advanced YES / NO pricing, target entry, reverse calculator, slippage, fee presets, and sizing.
- **Watchlist** — load a list of Kalshi tickers, see a clean live board, and launch any row into the calculator.
- **Monitor** — denser live board mode with pulse metrics, selection detail, and feed logs.
- **CLI** — terminal-native watch and monitor commands in the same repo.

## Product shape

- `/` overview
- `/calculator`
- `/watchlist`
- `/monitor`

CLI:
- `node ./cli/polycore.mjs watch --tickers ...`
- `node ./cli/polycore.mjs monitor --tickers ...`

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## CLI examples

```bash
npm run cli:watch -- --tickers KXHIGHNY-EXAMPLE,FED-EXAMPLE --once
npm run cli:monitor -- --file ./watchlists/default.json --refresh 8
```

## Notes

The watchlist and monitor use Kalshi's public market data endpoints. The overview and calculator still work without live data.

Replace the example watchlist tickers with real Kalshi market tickers before using the CLI.
