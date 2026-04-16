package com.qerp.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class PersistenceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void persistsOrdersAndPortfolioStateAcrossRequests() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "side": "BUY",
                                  "orderType": "MARKET",
                                  "quantity": 10
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("FILLED"));

        Integer orderCount = jdbcTemplate.queryForObject("select count(*) from orders", Integer.class);
        assertThat(orderCount).isEqualTo(1);

        BigDecimal cashBalance = jdbcTemplate.queryForObject(
                "select cash_balance from portfolio_state where portfolio_id = 1",
                BigDecimal.class
        );
        assertThat(cashBalance).isEqualByComparingTo("98200.00");

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "side": "SELL",
                                  "orderType": "MARKET",
                                  "quantity": 4
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("FILLED"));

        BigDecimal persistedQuantity = jdbcTemplate.queryForObject(
                "select quantity from portfolio_positions where symbol = 'AAPL'",
                BigDecimal.class
        );
        assertThat(persistedQuantity).isEqualByComparingTo("6.000000");

        mockMvc.perform(get("/api/v1/portfolio/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.items[0].quantity").value(6));
    }
}
