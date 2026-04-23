from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def _format_percent(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def build_explanation(
    *,
    symbol: str,
    signal: str,
    price_change_percent: Decimal,
    threshold_percent: Decimal,
) -> str:
    threshold_text = _format_percent(threshold_percent)

    if signal == "BUY":
        change_text = _format_percent(price_change_percent.copy_abs())
        return (
            f"{symbol} 현재가가 기준가보다 {change_text}% 낮아 "
            f"BUY placeholder 신호를 반환했습니다."
        )

    if signal == "SELL":
        change_text = _format_percent(price_change_percent.copy_abs())
        return (
            f"{symbol} 현재가가 기준가보다 {change_text}% 높아 "
            f"SELL placeholder 신호를 반환했습니다."
        )

    return (
        f"{symbol} 변동폭이 임계값 ±{threshold_text}% 이내라 "
        f"HOLD placeholder 신호를 반환했습니다."
    )
