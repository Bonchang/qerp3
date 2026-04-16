package com.qerp.application.portfolio;

import java.math.BigDecimal;

public record PositionView(
        String symbol,
        BigDecimal quantity,
        BigDecimal avgPrice,
        BigDecimal currentPrice,
        BigDecimal marketValue,
        BigDecimal unrealizedPnl,
        BigDecimal unrealizedPnlRate
) {
}
