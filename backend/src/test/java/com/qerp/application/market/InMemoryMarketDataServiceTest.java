package com.qerp.application.market;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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
    void returnsLiveSnapshotWithIntradayCandlesThatMoveOverTime() {
        InMemoryMarketDataService firstService = new InMemoryMarketDataService(
                Clock.fixed(Instant.parse("2026-05-01T14:30:05Z"), ZoneOffset.UTC)
        );
        InMemoryMarketDataService secondService = new InMemoryMarketDataService(
                Clock.fixed(Instant.parse("2026-05-01T14:30:11Z"), ZoneOffset.UTC)
        );

        LiveMarketSnapshot firstSnapshot = firstService.getLiveSnapshot("AAPL", 5).orElseThrow();
        LiveMarketSnapshot secondSnapshot = secondService.getLiveSnapshot("AAPL", 5).orElseThrow();

        assertThat(firstSnapshot.symbol()).isEqualTo("AAPL");
        assertThat(firstSnapshot.live()).isTrue();
        assertThat(firstSnapshot.quote().asOf()).hasToString("2026-05-01T14:30:05Z");
        assertThat(firstSnapshot.candles().interval()).isEqualTo("1m");
        assertThat(firstSnapshot.candles().items()).hasSize(5);
        assertThat(firstSnapshot.candles().items().getLast().timestamp()).hasToString("2026-05-01T14:30:00Z");
        assertThat(secondSnapshot.quote().asOf()).hasToString("2026-05-01T14:30:11Z");
        assertThat(secondSnapshot.quote().price()).isNotEqualByComparingTo(firstSnapshot.quote().price());
        assertThat(secondSnapshot.candles().items().getLast().close())
                .isNotEqualByComparingTo(firstSnapshot.candles().items().getLast().close());
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
