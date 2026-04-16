package com.qerp.domain.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

public record Order(
        String symbol,
        OrderSide side,
        OrderType orderType,
        BigDecimal quantity,
        BigDecimal limitPrice,
        OrderStatus status,
        BigDecimal filledQuantity,
        BigDecimal remainingQuantity,
        BigDecimal avgFillPrice,
        Instant createdAt,
        Instant updatedAt
) {

    public Order {
        symbol = requireSymbol(symbol);
        side = Objects.requireNonNull(side, "side must not be null");
        orderType = Objects.requireNonNull(orderType, "orderType must not be null");
        status = Objects.requireNonNull(status, "status must not be null");
        quantity = requirePositive(quantity, "quantity");
        filledQuantity = requireNonNegative(defaultIfNull(filledQuantity), "filledQuantity");
        remainingQuantity = requireNonNegative(defaultIfNull(remainingQuantity), "remainingQuantity");
        createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        updatedAt = Objects.requireNonNull(updatedAt, "updatedAt must not be null");

        if (orderType == OrderType.MARKET) {
            if (limitPrice != null) {
                throw new IllegalArgumentException("market order must not have limitPrice");
            }
        } else {
            limitPrice = money(requirePositive(limitPrice, "limitPrice"));
        }

        if (avgFillPrice != null) {
            avgFillPrice = money(requirePositive(avgFillPrice, "avgFillPrice"));
        }

        if (filledQuantity.add(remainingQuantity).compareTo(quantity) != 0) {
            throw new IllegalArgumentException("filledQuantity + remainingQuantity must equal quantity");
        }
    }

    public static Order market(String symbol, OrderSide side, BigDecimal quantity) {
        Instant now = Instant.now();
        return new Order(symbol, side, OrderType.MARKET, quantity, null, OrderStatus.PENDING,
                BigDecimal.ZERO, quantity, null, now, now);
    }

    public static Order limit(String symbol, OrderSide side, BigDecimal quantity, BigDecimal limitPrice) {
        Instant now = Instant.now();
        return new Order(symbol, side, OrderType.LIMIT, quantity, limitPrice, OrderStatus.PENDING,
                BigDecimal.ZERO, quantity, null, now, now);
    }

    public Order fill(BigDecimal fillPrice) {
        Instant now = Instant.now();
        return new Order(symbol, side, orderType, quantity, limitPrice, OrderStatus.FILLED,
                quantity, BigDecimal.ZERO, fillPrice, createdAt, now);
    }

    public Order pending() {
        Instant now = Instant.now();
        return new Order(symbol, side, orderType, quantity, limitPrice, OrderStatus.PENDING,
                filledQuantity, remainingQuantity, avgFillPrice, createdAt, now);
    }

    private static String requireSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        return symbol;
    }

    private static BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
        return value;
    }

    private static BigDecimal requireNonNegative(BigDecimal value, String fieldName) {
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(fieldName + " must not be negative");
        }
        return value;
    }

    private static BigDecimal defaultIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
