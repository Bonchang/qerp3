package com.qerp.domain.order;

import com.qerp.domain.portfolio.Portfolio;

import java.math.BigDecimal;

public class OrderSimulator {

    public OrderExecutionResult execute(Order order, Portfolio portfolio, BigDecimal referencePrice) {
        if (shouldFill(order, referencePrice)) {
            Portfolio updatedPortfolio = portfolio.applyFill(order.symbol(), order.side(), order.quantity(), referencePrice);
            return new OrderExecutionResult(order.fill(referencePrice), updatedPortfolio);
        }
        return new OrderExecutionResult(order.pending(), portfolio);
    }

    private boolean shouldFill(Order order, BigDecimal referencePrice) {
        if (order.orderType() == OrderType.MARKET) {
            return true;
        }

        return switch (order.side()) {
            case BUY -> referencePrice.compareTo(order.limitPrice()) <= 0;
            case SELL -> referencePrice.compareTo(order.limitPrice()) >= 0;
        };
    }
}
