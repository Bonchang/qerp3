from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from enum import StrEnum
from typing import Any

from .explanations import build_explanation


class Signal(StrEnum):
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"


@dataclass(frozen=True)
class PlaceholderSignal:
    symbol: str
    observed_price: Decimal
    reference_price: Decimal
    threshold_percent: Decimal
    price_change_percent: Decimal
    signal: Signal
    explanation: str
    generated_at: datetime
    source: str = "placeholder-v1"

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "observedPrice": float(self.observed_price),
            "referencePrice": float(self.reference_price),
            "thresholdPercent": float(self.threshold_percent),
            "priceChangePercent": float(self.price_change_percent),
            "signal": self.signal.value,
            "explanation": self.explanation,
            "generatedAt": self.generated_at.astimezone(UTC)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "source": self.source,
        }


def _to_decimal(value: Decimal | float | int | str, *, field_name: str) -> Decimal:
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{field_name} must be a valid decimal value") from error

    if decimal_value.is_nan() or decimal_value.is_infinite():
        raise ValueError(f"{field_name} must be a finite decimal value")

    return decimal_value



def _normalize_symbol(symbol: str) -> str:
    normalized = symbol.strip().upper()
    if not normalized:
        raise ValueError("symbol must not be blank")
    return normalized



def generate_placeholder_signal(
    *,
    symbol: str,
    observed_price: Decimal | float | int | str,
    reference_price: Decimal | float | int | str,
    threshold_percent: Decimal | float | int | str = Decimal("2"),
    generated_at: datetime | None = None,
) -> PlaceholderSignal:
    normalized_symbol = _normalize_symbol(symbol)
    observed_decimal = _to_decimal(observed_price, field_name="observed_price")
    reference_decimal = _to_decimal(reference_price, field_name="reference_price")
    threshold_decimal = _to_decimal(threshold_percent, field_name="threshold_percent")

    if observed_decimal <= 0:
        raise ValueError("observed_price must be greater than zero")
    if reference_decimal <= 0:
        raise ValueError("reference_price must be greater than zero")
    if threshold_decimal < 0:
        raise ValueError("threshold_percent must be zero or greater")

    price_change_percent = ((observed_decimal - reference_decimal) / reference_decimal) * Decimal("100")

    if price_change_percent <= -threshold_decimal:
        signal = Signal.BUY
    elif price_change_percent >= threshold_decimal:
        signal = Signal.SELL
    else:
        signal = Signal.HOLD

    explanation = build_explanation(
        symbol=normalized_symbol,
        signal=signal.value,
        price_change_percent=price_change_percent,
        threshold_percent=threshold_decimal,
    )

    if generated_at is None:
        timestamp = datetime.now(UTC)
    elif generated_at.tzinfo is None:
        timestamp = generated_at.replace(tzinfo=UTC)
    else:
        timestamp = generated_at.astimezone(UTC)

    return PlaceholderSignal(
        symbol=normalized_symbol,
        observed_price=observed_decimal,
        reference_price=reference_decimal,
        threshold_percent=threshold_decimal,
        price_change_percent=price_change_percent,
        signal=signal,
        explanation=explanation,
        generated_at=timestamp,
    )
