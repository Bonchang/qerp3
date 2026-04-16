package com.qerp.application.market;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

public interface MarketDataService {

    Optional<BigDecimal> getReferencePrice(String symbol);

    Map<String, BigDecimal> getAllReferencePrices();
}
