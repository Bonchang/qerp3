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
class QuoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsDeterministicQuoteForSupportedSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/quotes/{symbol}", "aapl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.price").value(180.00))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.change").value(1.25))
                .andExpect(jsonPath("$.changePercent").value(0.70))
                .andExpect(jsonPath("$.asOf").value("2026-04-22T13:30:00Z"));
    }

    @Test
    void returnsNotFoundForUnknownQuoteSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/quotes/{symbol}", "IBM"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").exists())
                .andExpect(jsonPath("$.path").value("/api/v1/market/quotes/IBM"));
    }

    @Test
    void rejectsBlankQuoteSymbolWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/quotes/{symbol}", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("symbol must not be blank"));
    }

    @Test
    void rejectsMalformedQuoteSymbolWithValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/market/quotes/{symbol}", "AAPL!"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("symbol must match ^[A-Z0-9.]{1,15}$"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/quotes/AAPL!"));
    }
}
