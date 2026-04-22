package com.qerp.api.market;

import java.math.BigDecimal;
import java.time.Instant;

public record QuoteResponse(
        String symbol,
        BigDecimal price,
        String currency,
        BigDecimal change,
        BigDecimal changePercent,
        Instant asOf
) {
}
