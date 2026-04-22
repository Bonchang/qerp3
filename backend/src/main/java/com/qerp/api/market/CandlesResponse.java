package com.qerp.api.market;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CandlesResponse(
        String symbol,
        String interval,
        List<CandleItem> items
) {
    public record CandleItem(
            Instant timestamp,
            BigDecimal open,
            BigDecimal high,
            BigDecimal low,
            BigDecimal close,
            long volume
    ) {
    }
}
