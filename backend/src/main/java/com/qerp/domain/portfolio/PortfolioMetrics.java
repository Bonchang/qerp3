package com.qerp.domain.portfolio;

import java.math.BigDecimal;

public record PortfolioMetrics(
        BigDecimal cashBalance,
        BigDecimal positionsMarketValue,
        BigDecimal totalPortfolioValue,
        BigDecimal unrealizedPnl,
        BigDecimal realizedPnl,
        BigDecimal returnRate
) {
}
