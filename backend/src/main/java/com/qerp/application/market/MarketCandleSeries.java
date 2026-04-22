package com.qerp.application.market;

import java.util.List;

public record MarketCandleSeries(
        String symbol,
        String interval,
        List<MarketCandle> items
) {
}
