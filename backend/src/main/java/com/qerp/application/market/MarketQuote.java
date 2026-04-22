package com.qerp.application.market;

import java.math.BigDecimal;
import java.time.Instant;

public record MarketQuote(
        String symbol,
        BigDecimal price,
        String currency,
        BigDecimal change,
        BigDecimal changePercent,
        Instant asOf
) {
}
