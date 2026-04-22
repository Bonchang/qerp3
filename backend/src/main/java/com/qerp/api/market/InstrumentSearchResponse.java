package com.qerp.api.market;

import java.util.List;

public record InstrumentSearchResponse(List<InstrumentItem> items) {

    public record InstrumentItem(
            String symbol,
            String name,
            String exchange,
            String assetType,
            String currency
    ) {
    }
}
