package com.qerp.domain.portfolio;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record Position(String symbol, BigDecimal quantity, BigDecimal averagePrice) {

    public Position {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("quantity must be greater than 0");
        }
        if (averagePrice == null || averagePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("averagePrice must be greater than 0");
        }
        averagePrice = averagePrice.setScale(2, RoundingMode.HALF_UP);
    }
}
