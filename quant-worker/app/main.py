from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from typing import Sequence

from .signals import generate_placeholder_signal



def _parse_generated_at(value: str) -> datetime:
    normalized = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)



def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a deterministic placeholder quant signal for QERP."
    )
    parser.add_argument("--symbol", required=True, help="Ticker symbol to evaluate")
    parser.add_argument(
        "--price",
        required=True,
        help="Observed current price for the symbol",
    )
    parser.add_argument(
        "--reference-price",
        required=True,
        help="Reference baseline price used to decide BUY/HOLD/SELL",
    )
    parser.add_argument(
        "--threshold-percent",
        default="2",
        help="Absolute percent band for HOLD. Default: 2",
    )
    parser.add_argument(
        "--generated-at",
        help="Optional ISO-8601 timestamp for deterministic output",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the JSON response",
    )
    return parser



def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        response = generate_placeholder_signal(
            symbol=args.symbol,
            observed_price=args.price,
            reference_price=args.reference_price,
            threshold_percent=args.threshold_percent,
            generated_at=_parse_generated_at(args.generated_at) if args.generated_at else None,
        )
    except ValueError as error:
        parser.error(str(error))

    print(
        json.dumps(
            response.to_dict(),
            ensure_ascii=False,
            indent=2 if args.pretty else None,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
