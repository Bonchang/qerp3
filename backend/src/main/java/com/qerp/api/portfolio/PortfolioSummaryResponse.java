package com.qerp.api.portfolio;

import java.math.BigDecimal;
import java.time.Instant;

public record PortfolioSummaryResponse(
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
