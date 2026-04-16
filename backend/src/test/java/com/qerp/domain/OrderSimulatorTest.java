package com.qerp.domain;

import com.qerp.domain.order.Order;
import com.qerp.domain.order.OrderExecutionResult;
import com.qerp.domain.order.OrderSide;
import com.qerp.domain.order.OrderSimulator;
import com.qerp.domain.order.OrderStatus;
import com.qerp.domain.order.OrderType;
import com.qerp.domain.portfolio.Portfolio;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrderSimulatorTest {

    private final OrderSimulator simulator = new OrderSimulator();

    @Test
    void marketBuyFillsImmediatelyAtReferencePrice() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));
        Order order = Order.market("AAPL", OrderSide.BUY, new BigDecimal("10"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("10"), result.order().filledQuantity());
        assertEquals(new BigDecimal("0"), result.order().remainingQuantity());
        assertEquals(new BigDecimal("180.00"), result.order().avgFillPrice());
        assertEquals(new BigDecimal("98200.00"), result.portfolio().cashBalance());
        assertEquals(new BigDecimal("10"), result.portfolio().position("AAPL").quantity());
        assertEquals(new BigDecimal("180.00"), result.portfolio().position("AAPL").averagePrice());
    }

    @Test
    void marketSellFillsImmediatelyAtReferencePriceAndBooksRealizedPnl() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));
        Order order = Order.market("AAPL", OrderSide.SELL, new BigDecimal("4"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("200.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("99000.00"), result.portfolio().cashBalance());
        assertEquals(new BigDecimal("6"), result.portfolio().position("AAPL").quantity());
        assertEquals(new BigDecimal("180.00"), result.portfolio().position("AAPL").averagePrice());
        assertEquals(new BigDecimal("80.00"), result.portfolio().realizedPnl());
    }

    @Test
    void limitBuyFillsWhenReferencePriceIsAtOrBelowLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));
        Order order = Order.limit("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("181.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("180.00"), result.order().avgFillPrice());
        assertEquals(new BigDecimal("98200.00"), result.portfolio().cashBalance());
    }

    @Test
    void limitBuyFillsWhenReferencePriceEqualsLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));
        Order order = Order.limit("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("180.00"), result.order().avgFillPrice());
    }

    @Test
    void limitBuyRemainsPendingWhenReferencePriceIsAboveLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"));
        Order order = Order.limit("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("179.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.PENDING, result.order().status());
        assertEquals(new BigDecimal("0"), result.order().filledQuantity());
        assertEquals(new BigDecimal("10"), result.order().remainingQuantity());
        assertEquals(new BigDecimal("100000.00"), result.portfolio().cashBalance());
    }

    @Test
    void limitSellFillsWhenReferencePriceIsAtOrAboveLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));
        Order order = Order.limit("AAPL", OrderSide.SELL, new BigDecimal("5"), new BigDecimal("179.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("99100.00"), result.portfolio().cashBalance());
        assertEquals(new BigDecimal("5"), result.portfolio().position("AAPL").quantity());
        assertEquals(new BigDecimal("0.00"), result.portfolio().realizedPnl());
    }

    @Test
    void limitSellFillsWhenReferencePriceEqualsLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));
        Order order = Order.limit("AAPL", OrderSide.SELL, new BigDecimal("5"), new BigDecimal("180.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.FILLED, result.order().status());
        assertEquals(new BigDecimal("5"), result.portfolio().position("AAPL").quantity());
    }

    @Test
    void limitSellRemainsPendingWhenReferencePriceIsBelowLimit() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("10"), new BigDecimal("180.00"));
        Order order = Order.limit("AAPL", OrderSide.SELL, new BigDecimal("5"), new BigDecimal("181.00"));

        OrderExecutionResult result = simulator.execute(order, portfolio, new BigDecimal("180.00"));

        assertEquals(OrderStatus.PENDING, result.order().status());
        assertEquals(new BigDecimal("0"), result.order().filledQuantity());
        assertEquals(new BigDecimal("98200.00"), result.portfolio().cashBalance());
        assertEquals(new BigDecimal("10"), result.portfolio().position("AAPL").quantity());
    }

    @Test
    void marketBuyThrowsWhenCashIsInsufficient() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("1000.00"));
        Order order = Order.market("MSFT", OrderSide.BUY, new BigDecimal("10"));

        assertThrows(IllegalStateException.class,
                () -> simulator.execute(order, portfolio, new BigDecimal("320.00")));
    }

    @Test
    void marketSellThrowsWhenPositionQuantityIsInsufficient() {
        Portfolio portfolio = Portfolio.create(new BigDecimal("100000.00"))
                .applyFill("AAPL", OrderSide.BUY, new BigDecimal("2"), new BigDecimal("180.00"));
        Order order = Order.market("AAPL", OrderSide.SELL, new BigDecimal("5"));

        assertThrows(IllegalStateException.class,
                () -> simulator.execute(order, portfolio, new BigDecimal("180.00")));
    }

    @Test
    void marketOrderRejectsNonPositiveQuantity() {
        assertThrows(IllegalArgumentException.class,
                () -> Order.market("AAPL", OrderSide.BUY, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> Order.market("AAPL", OrderSide.BUY, new BigDecimal("-1")));
    }

    @Test
    void limitOrderRejectsMissingLimitPriceWhenConstructedDirectly() {
        Instant now = Instant.parse("2026-04-16T00:00:00Z");

        assertThrows(IllegalArgumentException.class, () -> new Order(
                "AAPL",
                OrderSide.BUY,
                OrderType.LIMIT,
                new BigDecimal("10"),
                null,
                OrderStatus.PENDING,
                BigDecimal.ZERO,
                new BigDecimal("10"),
                null,
                now,
                now
        ));
    }
}
