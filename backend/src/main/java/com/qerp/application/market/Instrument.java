package com.qerp.application.market;

public record Instrument(
        String symbol,
        String name,
        String exchange,
        String assetType,
        String currency
) {
}
