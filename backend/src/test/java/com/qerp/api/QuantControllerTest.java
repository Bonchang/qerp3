package com.qerp.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class QuantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsPlaceholderSignalForSupportedSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/quant/signals/{symbol}", "aapl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.observedPrice").value(180.00))
                .andExpect(jsonPath("$.referencePrice").value(178.75))
                .andExpect(jsonPath("$.thresholdPercent").value(2))
                .andExpect(jsonPath("$.signal").value("HOLD"))
                .andExpect(jsonPath("$.explanation").value("AAPL 변동폭이 임계값 ±2.00% 이내라 HOLD placeholder 신호를 반환했습니다."))
                .andExpect(jsonPath("$.generatedAt").isNotEmpty())
                .andExpect(jsonPath("$.source").value("placeholder-v1"));
    }

    @Test
    void forwardsThresholdPercentToWorker() throws Exception {
        mockMvc.perform(get("/api/v1/quant/signals/{symbol}", "aapl")
                        .queryParam("thresholdPercent", "0.5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.thresholdPercent").value(0.5))
                .andExpect(jsonPath("$.signal").value("SELL"));
    }

    @Test
    void returnsNotFoundForUnknownQuantSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/quant/signals/{symbol}", "IBM"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("quote not found for symbol: IBM"))
                .andExpect(jsonPath("$.path").value("/api/v1/quant/signals/IBM"));
    }

    @Test
    void rejectsNegativeThresholdPercent() throws Exception {
        mockMvc.perform(get("/api/v1/quant/signals/{symbol}", "AAPL")
                        .queryParam("thresholdPercent", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("thresholdPercent must be a non-negative number."));
    }
}
