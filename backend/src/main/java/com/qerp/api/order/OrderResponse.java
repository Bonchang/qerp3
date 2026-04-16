package com.qerp.api.order;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderResponse(
        String orderId,
        String symbol,
        String side,
        String orderType,
        BigDecimal quantity,
        BigDecimal filledQuantity,
        BigDecimal remainingQuantity,
        BigDecimal limitPrice,
        BigDecimal avgFillPrice,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
