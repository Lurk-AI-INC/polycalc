from __future__ import annotations

from typing import Any

from .models import Market, Snapshot


FIELDS = [
    ('status', 'status'),
    ('yes_bid_cents', 'yesBid'),
    ('yes_ask_cents', 'yesAsk'),
    ('no_bid_cents', 'noBid'),
    ('no_ask_cents', 'noAsk'),
    ('last_price_cents', 'lastPrice'),
    ('yes_spread_cents', 'yesSpread'),
    ('volume24h', 'volume24h'),
    ('close_time', 'closeTime'),
]


def _market_map(markets: list[Market]) -> dict[str, Market]:
    return {market.ticker: market for market in markets}


def diff_snapshots(left: Snapshot, right: Snapshot) -> dict[str, Any]:
    left_map = _market_map(left.markets)
    right_map = _market_map(right.markets)

    added = sorted([ticker for ticker in right_map if ticker not in left_map])
    removed = sorted([ticker for ticker in left_map if ticker not in right_map])

    changed: list[dict[str, Any]] = []
    for ticker in sorted(set(left_map) & set(right_map)):
        previous = left_map[ticker]
        current = right_map[ticker]
        field_changes: dict[str, dict[str, Any]] = {}
        for field_name, label in FIELDS:
            before = getattr(previous, field_name)
            after = getattr(current, field_name)
            if before != after:
                field_changes[label] = {'before': before, 'after': after}
        if field_changes:
            changed.append({
                'ticker': ticker,
                'title': current.title or previous.title,
                'changes': field_changes,
            })

    return {
        'leftCapturedAt': left.captured_at,
        'rightCapturedAt': right.captured_at,
        'leftSource': left.source,
        'rightSource': right.source,
        'leftCount': len(left.markets),
        'rightCount': len(right.markets),
        'added': added,
        'removed': removed,
        'changed': changed,
        'changedCount': len(changed),
    }
