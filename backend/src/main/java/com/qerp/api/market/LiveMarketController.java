package com.qerp.api.market;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.LiveMarketSnapshot;
import com.qerp.application.market.MarketCandle;
import com.qerp.application.market.MarketDataService;
import com.qerp.application.market.MarketQuote;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/v1/market/live")
@Validated
public class LiveMarketController {

    private final MarketDataService marketDataService;

    public LiveMarketController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/{symbol}")
    public LiveMarketSnapshotResponse getLiveSnapshot(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "30") @Min(1) @Max(60) int limit
    ) {
        LiveMarketSnapshot snapshot = marketDataService.getLiveSnapshot(symbol, limit)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "NOT_FOUND",
                        "live market snapshot not found for symbol: " + symbol.trim().toUpperCase(Locale.ROOT)
                ));

        return new LiveMarketSnapshotResponse(
                snapshot.symbol(),
                snapshot.live(),
                snapshot.generatedAt(),
                toQuoteResponse(snapshot.quote()),
                new CandlesResponse(
                        snapshot.candles().symbol(),
                        snapshot.candles().interval(),
                        snapshot.candles().items().stream().map(this::toCandleItem).toList()
                )
        );
    }

    private QuoteResponse toQuoteResponse(MarketQuote quote) {
        return new QuoteResponse(
                quote.symbol(),
                quote.price(),
                quote.currency(),
                quote.change(),
                quote.changePercent(),
                quote.asOf()
        );
    }

    private CandlesResponse.CandleItem toCandleItem(MarketCandle candle) {
        return new CandlesResponse.CandleItem(
                candle.timestamp(),
                candle.open(),
                candle.high(),
                candle.low(),
                candle.close(),
                candle.volume()
        );
    }
}
