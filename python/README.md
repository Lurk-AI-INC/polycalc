# PolyCore Python utilities

This adds a real local data layer on top of PolyCore's watchlists and rules.

## What it does

- `snapshot` — fetch current markets and write a local JSON/CSV snapshot
- `timeline` — append per-ticker jsonl history files for later analysis
- `scan` — evaluate PolyCore rules against current markets and emit triggered events
- `diff` — compare two snapshots to see what actually changed

All commands use the same watchlist and rules JSON formats already used by the web app and Node CLI.

## Examples

```bash
python3 ./python/run_polycore.py snapshot --file ./watchlists/default.json --out ./data/snapshots/latest.json --csv ./data/snapshots/latest.csv
python3 ./python/run_polycore.py timeline --file ./watchlists/default.json --dir ./data/timelines --snapshot-out ./data/snapshots/timeline-latest.json
python3 ./python/run_polycore.py scan --file ./watchlists/rules.json --demo --out ./data/alerts/scan-report.json --alerts-out ./data/alerts/triggered.json
python3 ./python/run_polycore.py diff --left ./data/snapshots/earlier.json --right ./data/snapshots/later.json
```

## Why this is useful

The UI and Node CLI are good at the present tense.

These Python utilities add:

- local history accumulation
- repeatable snapshot artifacts
- rule scans that can be piped into cron or other local automation
- a clean diff primitive for later monitor / intelligence layers

No third-party Python packages required.
