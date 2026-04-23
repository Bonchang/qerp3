package com.qerp.application.quant;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.MarketDataService;
import com.qerp.application.market.MarketQuote;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;

@Service
public class QuantSignalService {

    static final BigDecimal DEFAULT_THRESHOLD_PERCENT = new BigDecimal("2");

    private final MarketDataService marketDataService;
    private final QuantWorkerClient quantWorkerClient;

    public QuantSignalService(MarketDataService marketDataService, QuantWorkerClient quantWorkerClient) {
        this.marketDataService = marketDataService;
        this.quantWorkerClient = quantWorkerClient;
    }

    public QuantSignal getSignal(String symbol, String thresholdPercent) {
        BigDecimal normalizedThresholdPercent = normalizeThresholdPercent(thresholdPercent);
        MarketQuote quote = marketDataService.getQuote(symbol)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "NOT_FOUND",
                        "quote not found for symbol: " + symbol.trim().toUpperCase(Locale.ROOT)
                ));

        BigDecimal referencePrice = deriveReferencePriceFromQuote(quote);

        try {
            return quantWorkerClient.execute(new QuantWorkerRequest(
                    quote.symbol(),
                    quote.price(),
                    referencePrice,
                    normalizedThresholdPercent
            ));
        } catch (IllegalStateException error) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "QUANT_WORKER_FAILED", error.getMessage());
        }
    }

    static BigDecimal normalizeThresholdPercent(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return DEFAULT_THRESHOLD_PERCENT;
        }

        final BigDecimal parsedValue;
        try {
            parsedValue = new BigDecimal(rawValue.trim());
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("thresholdPercent must be a non-negative number.", error);
        }

        if (parsedValue.signum() < 0) {
            throw new IllegalArgumentException("thresholdPercent must be a non-negative number.");
        }

        return parsedValue;
    }

    static BigDecimal deriveReferencePriceFromQuote(MarketQuote quote) {
        BigDecimal referencePrice = quote.price().subtract(quote.change());
        if (referencePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INVALID_REFERENCE_PRICE",
                    "Unable to derive a positive reference price from the latest quote."
            );
        }
        return referencePrice;
    }
}
