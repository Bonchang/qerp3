package com.qerp.application.market;

import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InMemoryMarketDataServiceTest {

    private final InMemoryMarketDataService service = new InMemoryMarketDataService();

    @Test
    void rejectsBlankQuoteSymbolsAtServiceLayer() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.getQuote("   "));

        assertThat(exception).hasMessage("symbol must not be blank");
    }

    @Test
    void rejectsMalformedQuoteSymbolsAtServiceLayer() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.getQuote("AAPL!"));

        assertThat(exception).hasMessage("symbol must match ^[A-Z0-9.]{1,15}$");
    }

    @Test
    void returnsTrailingDailyCandlesForSupportedSymbol() {
        MarketCandleSeries candles = service.getCandles("aapl", "1d", 2).orElseThrow();

        assertThat(candles.symbol()).isEqualTo("AAPL");
        assertThat(candles.interval()).isEqualTo("1D");
        assertThat(candles.items()).hasSize(2);
        assertThat(candles.items().getFirst().timestamp()).hasToString("2026-04-21T20:00:00Z");
        assertThat(candles.items().getFirst().close()).isEqualByComparingTo("178.75");
        assertThat(candles.items().getLast().timestamp()).hasToString("2026-04-22T20:00:00Z");
        assertThat(candles.items().getLast().open()).isEqualByComparingTo("178.75");
        assertThat(candles.items().getLast().close()).isEqualByComparingTo("180.00");
    }

    @Test
    void rejectsUnsupportedCandleIntervalAtServiceLayer() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.getCandles("AAPL", "1H", 30));

        assertThat(exception).hasMessage("interval must be 1D");
    }

    @Test
    void instrumentQuoteAndCandleCatalogsStayInSync() {
        Set<String> instrumentSymbols = service.supportedInstruments().stream()
                .map(Instrument::symbol)
                .collect(Collectors.toUnmodifiableSet());

        assertThat(service.getAllReferencePrices().keySet()).containsExactlyInAnyOrderElementsOf(instrumentSymbols);
        assertThat(instrumentSymbols).allSatisfy(symbol -> assertThat(service.getQuote(symbol)).isPresent());
        assertThat(instrumentSymbols).allSatisfy(symbol -> assertThat(service.getCandles(symbol, "1D", 30)).isPresent());
    }
}
