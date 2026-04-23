package com.qerp.application.quant;

import java.math.BigDecimal;
import java.time.Instant;

public record QuantSignal(
        String symbol,
        BigDecimal observedPrice,
        BigDecimal referencePrice,
        BigDecimal thresholdPercent,
        BigDecimal priceChangePercent,
        String signal,
        String explanation,
        Instant generatedAt,
        String source
) {
}
