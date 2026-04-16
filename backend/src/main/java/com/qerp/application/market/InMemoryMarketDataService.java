package com.qerp.application.market;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

@Service
public class InMemoryMarketDataService implements MarketDataService {

    private final Map<String, BigDecimal> prices = Map.of(
            "AAPL", new BigDecimal("180.00"),
            "MSFT", new BigDecimal("320.00")
    );

    @Override
    public Optional<BigDecimal> getReferencePrice(String symbol) {
        return Optional.ofNullable(prices.get(symbol));
    }

    @Override
    public Map<String, BigDecimal> getAllReferencePrices() {
        return prices;
    }
}
