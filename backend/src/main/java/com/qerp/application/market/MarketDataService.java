package com.qerp.application.market;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface MarketDataService {

    List<Instrument> searchInstruments(String query, int limit);

    Optional<Instrument> getInstrument(String symbol);

    Optional<MarketQuote> getQuote(String symbol);

    Optional<MarketCandleSeries> getCandles(String symbol, String interval, int limit);

    Optional<BigDecimal> getReferencePrice(String symbol);

    Map<String, BigDecimal> getAllReferencePrices();
}
