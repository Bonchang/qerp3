package com.qerp.api.market;

public record InstrumentDetailsResponse(
        String symbol,
        String name,
        String exchange,
        String assetType,
        String currency
) {
}
