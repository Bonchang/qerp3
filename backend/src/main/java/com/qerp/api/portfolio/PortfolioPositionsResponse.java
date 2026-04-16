package com.qerp.api.portfolio;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PortfolioPositionsResponse(List<PositionItem> items, Instant asOf) {

    public record PositionItem(
            String symbol,
            BigDecimal quantity,
            BigDecimal avgPrice,
            BigDecimal currentPrice,
            BigDecimal marketValue,
            BigDecimal unrealizedPnl,
            BigDecimal unrealizedPnlRate
    ) {
    }
}
