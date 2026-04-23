package com.qerp.application.quant;

import java.math.BigDecimal;

public record QuantWorkerRequest(
        String symbol,
        BigDecimal observedPrice,
        BigDecimal referencePrice,
        BigDecimal thresholdPercent
) {
}
