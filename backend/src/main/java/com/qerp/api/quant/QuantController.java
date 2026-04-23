package com.qerp.api.quant;

import com.qerp.application.quant.QuantSignalService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/quant/signals")
public class QuantController {

    private final QuantSignalService quantSignalService;

    public QuantController(QuantSignalService quantSignalService) {
        this.quantSignalService = quantSignalService;
    }

    @GetMapping("/{symbol}")
    public QuantSignalResponse getSignal(@PathVariable String symbol,
                                         @RequestParam(required = false) String thresholdPercent) {
        return QuantSignalResponse.from(quantSignalService.getSignal(symbol, thresholdPercent));
    }
}
