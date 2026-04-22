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
class InstrumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void searchesInstrumentsBySymbolOrNameCaseInsensitively() throws Exception {
        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].symbol").value("META"))
                .andExpect(jsonPath("$.items[0].name").value("Meta Platforms, Inc."))
                .andExpect(jsonPath("$.items[0].exchange").value("NASDAQ"))
                .andExpect(jsonPath("$.items[0].assetType").value("EQUITY"))
                .andExpect(jsonPath("$.items[0].currency").value("USD"));

        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "amazon"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].symbol").value("AMZN"));
    }

    @Test
    void appliesConfiguredLimitToSearchResults() throws Exception {
        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "inc")
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.items[1].symbol").value("TSLA"));
    }

    @Test
    void returnsEmptySearchResultsWhenNothingMatches() throws Exception {
        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "zzz-no-match"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void rejectsBlankSearchQueryWithContractErrorShape() throws Exception {
        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "  "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").exists())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.path").value("/api/v1/instruments/search"));
    }

    @Test
    void rejectsSearchLimitAboveMaximum() throws Exception {
        mockMvc.perform(get("/api/v1/instruments/search")
                        .param("q", "a")
                        .param("limit", "21"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.path").value("/api/v1/instruments/search"));
    }
}
