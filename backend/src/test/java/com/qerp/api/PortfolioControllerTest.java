package com.qerp.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class PortfolioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsPortfolioSummaryAfterFilledOrdersOnly() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "side": "BUY",
                                  "orderType": "MARKET",
                                  "quantity": 10
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "MSFT",
                                  "side": "BUY",
                                  "orderType": "LIMIT",
                                  "quantity": 5,
                                  "limitPrice": 300.00
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(get("/api/v1/portfolio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseCurrency").value("USD"))
                .andExpect(jsonPath("$.cashBalance").value(98200.00))
                .andExpect(jsonPath("$.positionsMarketValue").value(1800.00))
                .andExpect(jsonPath("$.totalPortfolioValue").value(100000.00))
                .andExpect(jsonPath("$.unrealizedPnl").value(0.00))
                .andExpect(jsonPath("$.realizedPnl").value(0.00))
                .andExpect(jsonPath("$.returnRate").value(0.0000))
                .andExpect(jsonPath("$.asOf").exists());
    }

    @Test
    void returnsPortfolioPositionsWithDerivedMetrics() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "side": "BUY",
                                  "orderType": "MARKET",
                                  "quantity": 10
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "side": "SELL",
                                  "orderType": "LIMIT",
                                  "quantity": 4,
                                  "limitPrice": 179.00
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("FILLED"));

        mockMvc.perform(get("/api/v1/portfolio/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.items[0].quantity").value(6))
                .andExpect(jsonPath("$.items[0].avgPrice").value(180.00))
                .andExpect(jsonPath("$.items[0].currentPrice").value(180.00))
                .andExpect(jsonPath("$.items[0].marketValue").value(1080.00))
                .andExpect(jsonPath("$.items[0].unrealizedPnl").value(0.00))
                .andExpect(jsonPath("$.items[0].unrealizedPnlRate").value(0.0000))
                .andExpect(jsonPath("$.asOf").exists());
    }

    @Test
    void returnsEmptyPortfolioPositionsWhenNoHoldings() throws Exception {
        mockMvc.perform(get("/api/v1/portfolio/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.asOf").exists());
    }
}
