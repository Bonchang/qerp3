package com.qerp.application.market;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class InMemoryMarketDataService implements MarketDataService {

    private static final Instant QUOTE_AS_OF = Instant.parse("2026-04-22T13:30:00Z");
    private static final LocalDate DAILY_CANDLE_END_DATE = LocalDate.of(2026, 4, 22);
    private static final String DAILY_INTERVAL = "1D";
    private static final int DAILY_CANDLE_COUNT = 60;
    private static final int MAX_CANDLE_LIMIT = 60;
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("^[A-Z0-9.]{1,15}$");

    private static final List<MarketListing> MARKET_LISTINGS = List.of(
            new MarketListing("AAPL", "Apple Inc.", "NASDAQ", "EQUITY", "USD", new BigDecimal("180.00"), new BigDecimal("1.25"), new BigDecimal("0.70")),
            new MarketListing("MSFT", "Microsoft Corporation", "NASDAQ", "EQUITY", "USD", new BigDecimal("320.00"), new BigDecimal("2.40"), new BigDecimal("0.76")),
            new MarketListing("NVDA", "NVIDIA Corporation", "NASDAQ", "EQUITY", "USD", new BigDecimal("950.00"), new BigDecimal("12.50"), new BigDecimal("1.33")),
            new MarketListing("TSLA", "Tesla, Inc.", "NASDAQ", "EQUITY", "USD", new BigDecimal("175.00"), new BigDecimal("-1.80"), new BigDecimal("-1.02")),
            new MarketListing("AMZN", "Amazon.com, Inc.", "NASDAQ", "EQUITY", "USD", new BigDecimal("185.00"), new BigDecimal("0.95"), new BigDecimal("0.52")),
            new MarketListing("GOOGL", "Alphabet Inc.", "NASDAQ", "EQUITY", "USD", new BigDecimal("165.00"), new BigDecimal("1.10"), new BigDecimal("0.67")),
            new MarketListing("META", "Meta Platforms, Inc.", "NASDAQ", "EQUITY", "USD", new BigDecimal("495.00"), new BigDecimal("3.25"), new BigDecimal("0.66"))
    );

    private final List<Instrument> instruments = MARKET_LISTINGS.stream()
            .map(MarketListing::instrument)
            .toList();
    private final Map<String, MarketQuote> quotesBySymbol = buildQuotes();
    private final Map<String, List<MarketCandle>> dailyCandlesBySymbol = buildDailyCandles();
    private final Map<String, BigDecimal> referencePrices = buildReferencePrices();

    @Override
    public List<Instrument> searchInstruments(String query, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be greater than 0");
        }
        String normalizedQuery = normalizeQuery(query);
        String normalizedQueryLower = normalizedQuery.toLowerCase(Locale.ROOT);
        return instruments.stream()
                .filter(instrument -> matches(instrument, normalizedQuery, normalizedQueryLower))
                .limit(limit)
                .toList();
    }

    @Override
    public Optional<MarketQuote> getQuote(String symbol) {
        return Optional.ofNullable(quotesBySymbol.get(normalizeSymbol(symbol)));
    }

    @Override
    public Optional<MarketCandleSeries> getCandles(String symbol, String interval, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be greater than 0");
        }
        if (limit > MAX_CANDLE_LIMIT) {
            throw new IllegalArgumentException("limit must be less than or equal to 60");
        }

        String normalizedSymbol = normalizeSymbol(symbol);
        String normalizedInterval = normalizeInterval(interval);
        List<MarketCandle> candles = dailyCandlesBySymbol.get(normalizedSymbol);
        if (candles == null) {
            return Optional.empty();
        }

        int fromIndex = Math.max(0, candles.size() - limit);
        return Optional.of(new MarketCandleSeries(
                normalizedSymbol,
                normalizedInterval,
                List.copyOf(candles.subList(fromIndex, candles.size()))
        ));
    }

    @Override
    public Optional<BigDecimal> getReferencePrice(String symbol) {
        return getQuote(symbol).map(MarketQuote::price);
    }

    @Override
    public Map<String, BigDecimal> getAllReferencePrices() {
        return referencePrices;
    }

    List<Instrument> supportedInstruments() {
        return instruments;
    }

    private boolean matches(Instrument instrument, String normalizedQuery, String normalizedQueryLower) {
        return instrument.symbol().contains(normalizedQuery)
                || instrument.name().toLowerCase(Locale.ROOT).contains(normalizedQueryLower);
    }

    private Map<String, MarketQuote> buildQuotes() {
        LinkedHashMap<String, MarketQuote> quotes = new LinkedHashMap<>();
        MARKET_LISTINGS.forEach(listing -> quotes.put(listing.symbol(), listing.quote(QUOTE_AS_OF)));
        return Collections.unmodifiableMap(quotes);
    }

    private Map<String, List<MarketCandle>> buildDailyCandles() {
        LinkedHashMap<String, List<MarketCandle>> candles = new LinkedHashMap<>();
        MARKET_LISTINGS.forEach(listing -> candles.put(listing.symbol(), buildDailyCandles(listing)));
        return Collections.unmodifiableMap(candles);
    }

    private List<MarketCandle> buildDailyCandles(MarketListing listing) {
        int seed = symbolSeed(listing.symbol());
        double latestClose = listing.price().doubleValue();
        double priorClose = Math.max(1.0, latestClose - listing.change().doubleValue());
        double startClose = Math.max(1.0, latestClose - (listing.change().doubleValue() * 8.0) + ((seed % 17) - 8) * 1.15);
        double amplitude = Math.max(1.0, latestClose * (0.012 + (seed % 5) * 0.0025));
        double seasonalTail = Math.sin((DAILY_CANDLE_COUNT - 1 + seed) * 0.52);

        List<MarketCandle> candles = new ArrayList<>(DAILY_CANDLE_COUNT);
        double previousClose = startClose;

        for (int index = 0; index < DAILY_CANDLE_COUNT; index++) {
            double close;
            if (index == DAILY_CANDLE_COUNT - 2) {
                close = priorClose;
            } else if (index == DAILY_CANDLE_COUNT - 1) {
                close = latestClose;
            } else {
                double progress = (double) index / (DAILY_CANDLE_COUNT - 1);
                double trendClose = startClose + (latestClose - startClose) * progress;
                double seasonalAdjusted = amplitude * (Math.sin((index + seed) * 0.52) - seasonalTail);
                close = Math.max(1.0, trendClose + seasonalAdjusted);
            }

            double open = index == 0
                    ? Math.max(1.0, close - (listing.change().doubleValue() * 0.4))
                    : previousClose;
            double spreadBase = Math.max(0.75, Math.max(open, close) * 0.012);
            double spread = spreadBase + ((seed + index) % 4) * 0.35;
            double wickBias = 0.84 + ((seed + index) % 3) * 0.05;
            double high = Math.max(open, close) + spread;
            double low = Math.max(0.01, Math.min(open, close) - (spread * wickBias));
            long volume = 900_000L
                    + (long) (seed % 180) * 125_000L
                    + (long) index * 21_000L
                    + Math.round(Math.abs(Math.cos((index + 1) * 0.37 + seed)) * 350_000L);
            LocalDate sessionDate = DAILY_CANDLE_END_DATE.minusDays(DAILY_CANDLE_COUNT - 1L - index);

            candles.add(new MarketCandle(
                    sessionDate.atTime(20, 0).toInstant(ZoneOffset.UTC),
                    money(open),
                    money(high),
                    money(low),
                    money(close),
                    volume
            ));
            previousClose = close;
        }

        return List.copyOf(candles);
    }

    private Map<String, BigDecimal> buildReferencePrices() {
        LinkedHashMap<String, BigDecimal> prices = new LinkedHashMap<>();
        quotesBySymbol.forEach((symbol, quote) -> prices.put(symbol, quote.price()));
        return Collections.unmodifiableMap(prices);
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("query must not be blank");
        }
        return query.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        if (!SYMBOL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("symbol must match ^[A-Z0-9.]{1,15}$");
        }
        return normalized;
    }

    private String normalizeInterval(String interval) {
        if (interval == null || interval.isBlank()) {
            throw new IllegalArgumentException("interval must not be blank");
        }
        String normalized = interval.trim().toUpperCase(Locale.ROOT);
        if (!DAILY_INTERVAL.equals(normalized)) {
            throw new IllegalArgumentException("interval must be 1D");
        }
        return normalized;
    }

    private int symbolSeed(String symbol) {
        int seed = 0;
        for (char character : symbol.toCharArray()) {
            seed = (seed * 31) + character;
        }
        return Math.abs(seed);
    }

    private BigDecimal money(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private record MarketListing(
            String symbol,
            String name,
            String exchange,
            String assetType,
            String currency,
            BigDecimal price,
            BigDecimal change,
            BigDecimal changePercent
    ) {
        Instrument instrument() {
            return new Instrument(symbol, name, exchange, assetType, currency);
        }

        MarketQuote quote(Instant asOf) {
            return new MarketQuote(symbol, price, currency, change, changePercent, asOf);
        }
    }
}
