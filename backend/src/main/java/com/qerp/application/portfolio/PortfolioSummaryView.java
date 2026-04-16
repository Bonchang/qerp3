package com.qerp.application.portfolio;

import java.math.BigDecimal;
import java.time.Instant;

public record PortfolioSummaryView(
        String baseCurrency,
        BigDecimal cashBalance,
        BigDecimal positionsMarketValue,
        BigDecimal totalPortfolioValue,
        BigDecimal unrealizedPnl,
        BigDecimal realizedPnl,
        BigDecimal returnRate,
        Instant asOf
) {
}
