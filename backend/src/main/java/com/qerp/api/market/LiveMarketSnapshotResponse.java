package com.qerp.api.market;

import java.time.Instant;

public record LiveMarketSnapshotResponse(
        String symbol,
        boolean live,
        Instant generatedAt,
        QuoteResponse quote,
        CandlesResponse candles
) {
}
