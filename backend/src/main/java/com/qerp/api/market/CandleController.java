package com.qerp.api.market;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.MarketCandle;
import com.qerp.application.market.MarketCandleSeries;
import com.qerp.application.market.MarketDataService;
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
@RequestMapping("/api/v1/market/candles")
@Validated
public class CandleController {

    private final MarketDataService marketDataService;

    public CandleController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/{symbol}")
    public CandlesResponse getCandles(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1D") String interval,
            @RequestParam(defaultValue = "30") @Min(1) @Max(60) int limit
    ) {
        MarketCandleSeries candles = marketDataService.getCandles(symbol, interval, limit)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "NOT_FOUND",
                        "candles not found for symbol: " + symbol.trim().toUpperCase(Locale.ROOT)
                ));

        return new CandlesResponse(
                candles.symbol(),
                candles.interval(),
                candles.items().stream()
                        .map(this::toItem)
                        .toList()
        );
    }

    private CandlesResponse.CandleItem toItem(MarketCandle candle) {
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
