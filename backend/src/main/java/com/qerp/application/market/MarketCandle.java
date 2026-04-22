package com.qerp.application.market;

import java.math.BigDecimal;
import java.time.Instant;

public record MarketCandle(
        Instant timestamp,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close,
        long volume
) {
}
