package com.qerp.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class CandleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsDeterministicTrailingDailyCandlesForSupportedSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "aapl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.interval").value("1D"))
                .andExpect(jsonPath("$.items", hasSize(30)))
                .andExpect(jsonPath("$.items[0].timestamp").value("2026-03-24T20:00:00Z"))
                .andExpect(jsonPath("$.items[29].timestamp").value("2026-04-22T20:00:00Z"))
                .andExpect(jsonPath("$.items[29].open").value(178.75))
                .andExpect(jsonPath("$.items[29].close").value(180.00));
    }

    @Test
    void appliesExplicitLimitToTrailingCandles() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL")
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].timestamp").value("2026-04-21T20:00:00Z"))
                .andExpect(jsonPath("$.items[0].close").value(178.75))
                .andExpect(jsonPath("$.items[1].timestamp").value("2026-04-22T20:00:00Z"));
    }

    @Test
    void returnsNotFoundForUnknownCandleSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "IBM"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("candles not found for symbol: IBM"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/IBM"));
    }

    @Test
    void rejectsUnsupportedIntervalWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL")
                        .param("interval", "1H"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("interval must be 1D"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/AAPL"));
    }

    @Test
    void rejectsBlankIntervalWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL")
                        .param("interval", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("interval must not be blank"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/AAPL"));
    }

    @Test
    void rejectsLimitBelowMinimumWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL")
                        .param("limit", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message", containsString("must be greater than or equal to 1")))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/AAPL"));
    }

    @Test
    void rejectsLimitAboveMaximumWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL")
                        .param("limit", "61"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message", containsString("must be less than or equal to 60")))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/AAPL"));
    }

    @Test
    void rejectsBlankSymbolWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("symbol must not be blank"));
    }

    @Test
    void rejectsMalformedSymbolWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/candles/{symbol}", "AAPL!"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("symbol must match ^[A-Z0-9.]{1,15}$"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/candles/AAPL!"));
    }
}
