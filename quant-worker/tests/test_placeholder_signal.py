from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from datetime import UTC, datetime
from decimal import Decimal

from app.main import main
from app.signals import Signal, generate_placeholder_signal


class PlaceholderSignalTests(unittest.TestCase):
    def setUp(self) -> None:
        self.generated_at = datetime(2026, 4, 23, 13, 33, tzinfo=UTC)

    def test_generates_buy_signal_when_price_is_below_threshold(self) -> None:
        result = generate_placeholder_signal(
            symbol="aapl",
            observed_price="95",
            reference_price="100",
            threshold_percent="2",
            generated_at=self.generated_at,
        )

        self.assertEqual(result.signal, Signal.BUY)
        self.assertEqual(result.symbol, "AAPL")
        self.assertEqual(result.price_change_percent, Decimal("-5"))
        self.assertIn("BUY placeholder", result.explanation)

    def test_generates_hold_signal_inside_threshold_band(self) -> None:
        result = generate_placeholder_signal(
            symbol="msft",
            observed_price="101",
            reference_price="100",
            threshold_percent="2",
            generated_at=self.generated_at,
        )

        self.assertEqual(result.signal, Signal.HOLD)
        self.assertEqual(result.price_change_percent, Decimal("1.00"))
        self.assertIn("±2.00%", result.explanation)

    def test_generates_sell_signal_when_price_is_above_threshold(self) -> None:
        result = generate_placeholder_signal(
            symbol="nvda",
            observed_price="103",
            reference_price="100",
            threshold_percent="2",
            generated_at=self.generated_at,
        )

        self.assertEqual(result.signal, Signal.SELL)
        self.assertEqual(result.price_change_percent, Decimal("3.00"))
        self.assertIn("SELL placeholder", result.explanation)

    def test_cli_prints_contract_json(self) -> None:
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = main(
                [
                    "--symbol",
                    "tsla",
                    "--price",
                    "97",
                    "--reference-price",
                    "100",
                    "--threshold-percent",
                    "2",
                    "--generated-at",
                    "2026-04-23T13:33:00Z",
                    "--pretty",
                ]
            )

        payload = json.loads(output.getvalue())

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["symbol"], "TSLA")
        self.assertEqual(payload["signal"], "BUY")
        self.assertEqual(payload["source"], "placeholder-v1")
        self.assertEqual(payload["generatedAt"], "2026-04-23T13:33:00Z")

    def test_rejects_non_positive_reference_price(self) -> None:
        with self.assertRaisesRegex(ValueError, "reference_price"):
            generate_placeholder_signal(
                symbol="AAPL",
                observed_price="100",
                reference_price="0",
            )


if __name__ == "__main__":
    unittest.main()
