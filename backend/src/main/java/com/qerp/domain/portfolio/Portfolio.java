package com.qerp.domain.portfolio;

import com.qerp.domain.order.OrderSide;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

public record Portfolio(
        BigDecimal initialEquity,
        BigDecimal cashBalance,
        BigDecimal realizedPnl,
        Map<String, Position> positions
) {

    public Portfolio {
        initialEquity = money(requirePositive(initialEquity, "initialEquity"));
        cashBalance = money(requireNonNegative(cashBalance, "cashBalance"));
        realizedPnl = money(defaultIfNull(realizedPnl));
        positions = positions == null ? Map.of() : Map.copyOf(positions);
    }

    public static Portfolio create(BigDecimal initialEquity) {
        BigDecimal normalizedInitialEquity = money(requirePositive(initialEquity, "initialEquity"));
        return new Portfolio(normalizedInitialEquity, normalizedInitialEquity, money(BigDecimal.ZERO), Map.of());
    }

    public Portfolio applyFill(String symbol, OrderSide side, BigDecimal quantity, BigDecimal fillPrice) {
        requireSymbol(symbol);
        if (side == null) {
            throw new IllegalArgumentException("side must not be null");
        }
        quantity = requirePositive(quantity, "quantity");
        fillPrice = money(requirePositive(fillPrice, "fillPrice"));

        return switch (side) {
            case BUY -> applyBuy(symbol, quantity, fillPrice);
            case SELL -> applySell(symbol, quantity, fillPrice);
        };
    }

    public Position position(String symbol) {
        return positions.get(symbol);
    }

    public boolean hasPosition(String symbol) {
        return positions.containsKey(symbol);
    }

    public PortfolioMetrics calculateMetrics(Map<String, BigDecimal> referencePrices) {
        BigDecimal positionsMarketValue = money(BigDecimal.ZERO);
        BigDecimal unrealizedPnl = money(BigDecimal.ZERO);

        for (Position position : positions.values()) {
            BigDecimal referencePrice = referencePrices.get(position.symbol());
            if (referencePrice == null) {
                continue;
            }
            BigDecimal normalizedReferencePrice = money(requirePositive(referencePrice, "referencePrice"));
            BigDecimal marketValue = money(position.quantity().multiply(normalizedReferencePrice));
            BigDecimal cost = money(position.quantity().multiply(position.averagePrice()));
            positionsMarketValue = money(positionsMarketValue.add(marketValue));
            unrealizedPnl = money(unrealizedPnl.add(marketValue.subtract(cost)));
        }

        BigDecimal totalPortfolioValue = money(cashBalance.add(positionsMarketValue));
        BigDecimal returnRate = totalPortfolioValue.subtract(initialEquity)
                .divide(initialEquity, 4, RoundingMode.HALF_UP);

        return new PortfolioMetrics(cashBalance, positionsMarketValue, totalPortfolioValue, unrealizedPnl, realizedPnl, returnRate);
    }

    private Portfolio applyBuy(String symbol, BigDecimal quantity, BigDecimal fillPrice) {
        BigDecimal cost = money(quantity.multiply(fillPrice));
        if (cashBalance.compareTo(cost) < 0) {
            throw new IllegalStateException("INSUFFICIENT_CASH");
        }

        Map<String, Position> updatedPositions = new HashMap<>(positions);
        Position existing = updatedPositions.get(symbol);
        BigDecimal newQuantity = existing == null ? quantity : existing.quantity().add(quantity);
        BigDecimal newAveragePrice;
        if (existing == null) {
            newAveragePrice = money(fillPrice);
        } else {
            BigDecimal totalCost = existing.quantity().multiply(existing.averagePrice())
                    .add(quantity.multiply(fillPrice));
            newAveragePrice = totalCost.divide(newQuantity, 2, RoundingMode.HALF_UP);
        }
        updatedPositions.put(symbol, new Position(symbol, newQuantity, newAveragePrice));
        return new Portfolio(initialEquity, money(cashBalance.subtract(cost)), realizedPnl, updatedPositions);
    }

    private Portfolio applySell(String symbol, BigDecimal quantity, BigDecimal fillPrice) {
        Position existing = positions.get(symbol);
        if (existing == null || existing.quantity().compareTo(quantity) < 0) {
            throw new IllegalStateException("INSUFFICIENT_POSITION_QUANTITY");
        }

        BigDecimal proceeds = money(quantity.multiply(fillPrice));
        BigDecimal salePnl = money(fillPrice.subtract(existing.averagePrice()).multiply(quantity));
        BigDecimal remainingQuantity = existing.quantity().subtract(quantity);

        Map<String, Position> updatedPositions = new HashMap<>(positions);
        if (remainingQuantity.compareTo(BigDecimal.ZERO) == 0) {
            updatedPositions.remove(symbol);
        } else {
            updatedPositions.put(symbol, new Position(symbol, remainingQuantity, existing.averagePrice()));
        }

        return new Portfolio(
                initialEquity,
                money(cashBalance.add(proceeds)),
                money(realizedPnl.add(salePnl)),
                updatedPositions
        );
    }

    private static String requireSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        return symbol;
    }

    private static BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
        return value;
    }

    private static BigDecimal requireNonNegative(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(fieldName + " must not be negative");
        }
        return value;
    }

    private static BigDecimal defaultIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
