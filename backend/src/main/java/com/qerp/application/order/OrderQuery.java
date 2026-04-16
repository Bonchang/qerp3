package com.qerp.application.order;

import com.qerp.domain.order.OrderSide;
import com.qerp.domain.order.OrderStatus;
import com.qerp.domain.order.OrderType;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderQuery(
        String orderId,
        String symbol,
        OrderSide side,
        OrderType orderType,
        BigDecimal quantity,
        BigDecimal filledQuantity,
        BigDecimal remainingQuantity,
        BigDecimal limitPrice,
        BigDecimal avgFillPrice,
        OrderStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
