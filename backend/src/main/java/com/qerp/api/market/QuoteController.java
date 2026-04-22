package com.qerp.api.market;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.MarketDataService;
import com.qerp.application.market.MarketQuote;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/v1/market/quotes")
public class QuoteController {

    private final MarketDataService marketDataService;

    public QuoteController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/{symbol}")
    public QuoteResponse getQuote(@PathVariable String symbol) {
        MarketQuote quote = marketDataService.getQuote(symbol)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "quote not found for symbol: " + symbol.toUpperCase(Locale.ROOT)));
        return new QuoteResponse(
                quote.symbol(),
                quote.price(),
                quote.currency(),
                quote.change(),
                quote.changePercent(),
                quote.asOf()
        );
    }
}
