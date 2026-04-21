from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from .calculator import evaluate_side_net_ev
from .formatting import fmt_cents, parse_iso, utc_now_iso
from .models import Market, Rule, RuleEvent


UTC = timezone.utc
VALID_RULE_TYPES = {
    'yes-ask-lte',
    'no-ask-lte',
    'spread-lte',
    'spread-gte',
    'time-to-close-lte',
    'status-change',
    'yes-positive-ev',
    'no-positive-ev',
}


def _num(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def evaluate_rule(rule: Rule, market: Market, previous_status: str | None = None, *, now: datetime | None = None) -> str | None:
    threshold = _num(rule.threshold)

    if rule.type == 'yes-ask-lte':
        return f'YES ask {fmt_cents(market.yes_ask_cents)} <= {fmt_cents(threshold)}' if market.yes_ask_cents is not None and market.yes_ask_cents <= threshold else None
    if rule.type == 'no-ask-lte':
        return f'NO ask {fmt_cents(market.no_ask_cents)} <= {fmt_cents(threshold)}' if market.no_ask_cents is not None and market.no_ask_cents <= threshold else None
    if rule.type == 'spread-lte':
        return f'Spread {fmt_cents(market.yes_spread_cents)} <= {fmt_cents(threshold)}' if market.yes_spread_cents is not None and market.yes_spread_cents <= threshold else None
    if rule.type == 'spread-gte':
        return f'Spread {fmt_cents(market.yes_spread_cents)} >= {fmt_cents(threshold)}' if market.yes_spread_cents is not None and market.yes_spread_cents >= threshold else None
    if rule.type == 'time-to-close-lte':
        close_instant = parse_iso(market.close_time)
        current = now or datetime.now(tz=UTC)
        if close_instant is None:
            return None
        diff_minutes = int((close_instant - current).total_seconds() // 60)
        return f'Time to close {diff_minutes}m <= {int(threshold)}m' if 0 <= diff_minutes <= threshold else None
    if rule.type == 'status-change':
        return f'Status changed {previous_status} → {market.status}' if previous_status is not None and previous_status != market.status else None

    fair_yes = _num(rule.fair_yes, 50.0)
    custom_fee = _num(rule.custom_fee_cents)
    if rule.type == 'yes-positive-ev':
        net_ev = evaluate_side_net_ev(market.yes_ask_cents, fair_yes, rule.fee_mode, custom_fee)
        return f'YES is positive EV at {fmt_cents(market.yes_ask_cents)} ({net_ev:+.2f}¢)' if net_ev is not None and net_ev > 0 else None
    if rule.type == 'no-positive-ev':
        net_ev = evaluate_side_net_ev(market.no_ask_cents, 100.0 - fair_yes, rule.fee_mode, custom_fee)
        return f'NO is positive EV at {fmt_cents(market.no_ask_cents)} ({net_ev:+.2f}¢)' if net_ev is not None and net_ev > 0 else None
    return None


def scan_rules(rules: list[Rule], markets: list[Market], previous_status_map: dict[str, str] | None = None) -> dict[str, Any]:
    previous_status_map = previous_status_map or {}
    market_map = {market.ticker: market for market in markets}
    events: list[RuleEvent] = []
    evaluated: list[dict[str, Any]] = []
    occurred_at = utc_now_iso()

    for rule in rules:
        market = market_map.get(rule.ticker)
        if market is None:
            evaluated.append({
                'rule': asdict(rule),
                'triggered': False,
                'message': 'Ticker missing from fetched markets.',
            })
            continue

        if not rule.is_enabled:
            evaluated.append({
                'rule': asdict(rule),
                'triggered': False,
                'message': 'Rule disabled.',
                'market': market.to_dict(),
            })
            continue

        message = evaluate_rule(rule, market, previous_status_map.get(rule.ticker))
        triggered = message is not None
        record = {
            'rule': asdict(rule),
            'triggered': triggered,
            'message': message or '',
            'market': market.to_dict(),
        }
        evaluated.append(record)
        if triggered:
            events.append(RuleEvent(
                rule_id=rule.id,
                rule_name=rule.name,
                ticker=rule.ticker,
                message=message or '',
                status=market.status,
                occurred_at=occurred_at,
                market=market.to_dict(),
            ))

    return {
        'scannedAt': occurred_at,
        'rules': evaluated,
        'events': [event.to_dict() for event in events],
        'triggeredCount': len(events),
        'ruleCount': len(rules),
        'marketCount': len(markets),
    }
