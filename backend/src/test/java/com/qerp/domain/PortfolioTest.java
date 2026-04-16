package com.qerp.domain;

import com.qerp.domain.order.OrderSide;
import com.qerp.domain.portfolio.Portfolio;
import com.qerp.domain.portfolio.PortfolioMetrics;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PortfolioTest {

    @Test
    void firstBuyCreatesPositionAndReducesCash() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));

        Portfolio updated = portfolio.applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));

        assertEquals(new BigDecimal("98200.00"), updated.cashBalance());
        assertEquals(new BigDecimal("10"), updated.position("AAPL").quantity());
        assertEquals(new BigDecimal("180.00"), updated.position("AAPL").averagePrice());
    }

    @Test
    void additionalBuyRecalculatesAveragePrice() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));

        Portfolio updated = portfolio.applyFill("AAPL", OrderSide.BUY, new BigDecimal("20"), new BigDecimal("210.00"));

        assertEquals(new BigDecimal("30"), updated.position("AAPL").quantity());
        assertEquals(new BigDecimal("200.00"), updated.position("AAPL").averagePrice());
        assertEquals(new BigDecimal("94000.00"), updated.cashBalance());
    }

    @Test
    void fullSellRemovesPositionAndAddsRealizedPnl() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("20"), new BigDecimal("210.00"));

        Portfolio updated = portfolio.applyFill("AAPL", OrderSide.SELL, new BigDecimal("30"), new BigDecimal("205.00"));

        assertFalse(updated.hasPosition("AAPL"));
        assertEquals(new BigDecimal("100150.00"), updated.cashBalance());
        assertEquals(new BigDecimal("150.00"), updated.realizedPnl());
    }

    @Test
    void partialSellKeepsAveragePriceAndAccumulatesRealizedPnl() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("20"), new BigDecimal("210.00"));

        Portfolio updated = portfolio.applyFill("AAPL", OrderSide.SELL, new BigDecimal("10"), new BigDecimal("205.00"));

        assertEquals(new BigDecimal("20"), updated.position("AAPL").quantity());
        assertEquals(new BigDecimal("200.00"), updated.position("AAPL").averagePrice());
        assertEquals(new BigDecimal("50.00"), updated.realizedPnl());
        assertEquals(new BigDecimal("96050.00"), updated.cashBalance());
    }

    @Test
    void portfolioMetricsIncludeUnrealizedPnlTotalValueAndReturnRate() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("20"), new BigDecimal("210.00"))
                .applyFill("AAPL", OrderSide.SELL, new BigDecimal("10"), new BigDecimal("205.00"));

        PortfolioMetrics metrics = portfolio.calculateMetrics(Map.of("AAPL", new BigDecimal("210.00")));

        assertEquals(new BigDecimal("4200.00"), metrics.positionsMarketValue());
        assertEquals(new BigDecimal("200.00"), metrics.unrealizedPnl());
        assertEquals(new BigDecimal("50.00"), metrics.realizedPnl());
        assertEquals(new BigDecimal("100250.00"), metrics.totalPortfolioValue());
        assertEquals(new BigDecimal("0.0025"), metrics.returnRate());
    }

    @Test
    void realizedPnlAccumulatesAcrossMultipleSales() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("20"), new BigDecimal("210.00"))
                .applyFill("AAPL", OrderSide.SELL, new BigDecimal("10"), new BigDecimal("205.00"));

        Portfolio updated = portfolio.applyFill("AAPL", OrderSide.SELL, new BigDecimal("5"), new BigDecimal("190.00"));

        assertEquals(new BigDecimal("0.00"), updated.realizedPnl());
        assertEquals(new BigDecimal("15"), updated.position("AAPL").quantity());
        assertEquals(new BigDecimal("200.00"), updated.position("AAPL").averagePrice());
    }

    @Test
    void createRejectsNonPositiveInitialEquity() {
        assertThrows(IllegalArgumentException.class,
                () -> Portfolio.create(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> Portfolio.create(new BigDecimal("-1.00")));
    }

    @Test
    void applyFillRejectsNonPositiveQuantity() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));

        assertThrows(IllegalArgumentException.class,
                () -> portfolio.applyFill("AAPL", OrderSide.BUY, BigDecimal.ZERO, new BigDecimal("180.00")));
        assertThrows(IllegalArgumentException.class,
                () -> portfolio.applyFill("AAPL", OrderSide.BUY, new BigDecimal("-1"), new BigDecimal("180.00")));
    }

    @Test
    void applyFillRejectsNonPositivePrice() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));

        assertThrows(IllegalArgumentException.class,
                () -> portfolio.applyFill("AAPL", OrderSide.BUY, new BigDecimal("1"), BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> portfolio.applyFill("AAPL", OrderSide.BUY, new BigDecimal("1"), new BigDecimal("-1.00")));
    }
}
