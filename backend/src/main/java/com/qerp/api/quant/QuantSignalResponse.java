package com.qerp.api.quant;

import com.qerp.application.quant.QuantSignal;

import java.math.BigDecimal;
import java.time.Instant;

public record QuantSignalResponse(
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
    public static QuantSignalResponse from(QuantSignal signal) {
        return new QuantSignalResponse(
                signal.symbol(),
                signal.observedPrice(),
                signal.referencePrice(),
                signal.thresholdPercent(),
                signal.priceChangePercent(),
                signal.signal(),
                signal.explanation(),
                signal.generatedAt(),
                signal.source()
        );
    }
}
