package com.qerp.api.market;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.Instrument;
import com.qerp.application.market.MarketDataService;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/v1/instruments")
@Validated
public class InstrumentController {

    private final MarketDataService marketDataService;

    public InstrumentController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/search")
    public InstrumentSearchResponse searchInstruments(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "10") @Min(1) @Max(20) int limit
    ) {
        if (q == null || q.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "q must not be blank");
        }
        return new InstrumentSearchResponse(
                marketDataService.searchInstruments(q, limit).stream()
                        .map(this::toItem)
                        .toList()
        );
    }

    private InstrumentSearchResponse.InstrumentItem toItem(Instrument instrument) {
        return new InstrumentSearchResponse.InstrumentItem(
                instrument.symbol(),
                instrument.name(),
                instrument.exchange(),
                instrument.assetType(),
                instrument.currency()
        );
    }
}
