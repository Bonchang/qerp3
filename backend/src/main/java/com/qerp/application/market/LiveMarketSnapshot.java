package com.qerp.application.market;

import java.time.Instant;

public record LiveMarketSnapshot(
        String symbol,
        boolean live,
        Instant generatedAt,
        MarketQuote quote,
        MarketCandleSeries candles
) {
}
