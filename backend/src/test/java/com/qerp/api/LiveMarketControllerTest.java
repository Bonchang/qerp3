package com.qerp.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class LiveMarketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsLiveSnapshotForSupportedSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/live/{symbol}", "aapl")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.live").value(true))
                .andExpect(jsonPath("$.generatedAt").exists())
                .andExpect(jsonPath("$.quote.symbol").value("AAPL"))
                .andExpect(jsonPath("$.quote.asOf").exists())
                .andExpect(jsonPath("$.candles.symbol").value("AAPL"))
                .andExpect(jsonPath("$.candles.interval").value("1m"))
                .andExpect(jsonPath("$.candles.items", hasSize(5)));
    }

    @Test
    void returnsNotFoundForUnknownLiveSnapshotSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/market/live/{symbol}", "IBM"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("live market snapshot not found for symbol: IBM"))
                .andExpect(jsonPath("$.path").value("/api/v1/market/live/IBM"));
    }
}
