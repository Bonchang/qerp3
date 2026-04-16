package com.qerp.application.order;

import com.qerp.api.common.ApiException;
import com.qerp.application.market.MarketDataService;
import com.qerp.application.portfolio.PortfolioService;
import com.qerp.domain.order.Order;
import com.qerp.domain.order.OrderExecutionResult;
import com.qerp.domain.order.OrderSide;
import com.qerp.domain.order.OrderSimulator;
import com.qerp.domain.order.OrderStatus;
import com.qerp.domain.order.OrderType;
import com.qerp.domain.portfolio.Portfolio;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class OrderService {

    private final InMemoryOrderStore orderStore;
    private final PortfolioService portfolioService;
    private final MarketDataService marketDataService;
    private final OrderSimulator simulator = new OrderSimulator();

    public OrderService(InMemoryOrderStore orderStore, PortfolioService portfolioService, MarketDataService marketDataService) {
        this.orderStore = orderStore;
        this.portfolioService = portfolioService;
        this.marketDataService = marketDataService;
    }

    public synchronized OrderQuery createOrder(String symbol, OrderSide side, OrderType orderType, BigDecimal quantity, BigDecimal limitPrice, String timeInForce) {
        validateCreateOrderRequest(orderType, limitPrice, timeInForce);

        BigDecimal referencePrice = marketDataService.getReferencePrice(symbol)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "MARKET_DATA_UNAVAILABLE", "market data unavailable for symbol: " + symbol));

        Portfolio currentPortfolio = portfolioService.currentPortfolio();
        Order newOrder = orderType == OrderType.MARKET
                ? Order.market(symbol, side, quantity)
                : Order.limit(symbol, side, quantity, limitPrice);

        try {
            OrderExecutionResult result = simulator.execute(newOrder, currentPortfolio, referencePrice);
            OrderRecord saved = orderStore.save(result.order());
            portfolioService.updatePortfolio(result.portfolio());
            return toQuery(saved);
        } catch (IllegalStateException ex) {
            throw translateStateException(ex);
        }
    }

    public OrderQuery getOrder(String orderId) {
        return orderStore.findById(orderId)
                .map(this::toQuery)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "order not found: " + orderId));
    }

    public OrderListResult listOrders(Optional<OrderStatus> status, Optional<String> symbol, int limit, String cursor) {
        List<OrderQuery> filteredItems = orderStore.findAll().stream()
                .map(this::toQuery)
                .filter(item -> status.map(orderStatus -> item.status() == orderStatus).orElse(true))
                .filter(item -> symbol.map(value -> item.symbol().equalsIgnoreCase(value)).orElse(true))
                .toList();

        int offset = parseCursor(cursor);
        if (offset > filteredItems.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "cursor is invalid");
        }

        List<OrderQuery> pageItems = filteredItems.stream()
                .skip(offset)
                .limit(limit)
                .toList();

        String nextCursor = offset + pageItems.size() < filteredItems.size()
                ? Integer.toString(offset + pageItems.size())
                : null;

        return new OrderListResult(pageItems, nextCursor);
    }

    public synchronized OrderQuery cancelOrder(String orderId) {
        OrderRecord existing = orderStore.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "order not found: " + orderId));

        if (existing.order().status() != OrderStatus.PENDING && existing.order().status() != OrderStatus.PARTIALLY_FILLED) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE", "order is not cancellable: " + orderId);
        }

        Instant now = Instant.now();
        Order cancelled = new Order(
                existing.order().symbol(),
                existing.order().side(),
                existing.order().orderType(),
                existing.order().quantity(),
                existing.order().limitPrice(),
                OrderStatus.CANCELLED,
                existing.order().filledQuantity(),
                existing.order().remainingQuantity(),
                existing.order().avgFillPrice(),
                existing.order().createdAt(),
                now
        );
        return toQuery(orderStore.update(orderId, cancelled));
    }

    private void validateCreateOrderRequest(OrderType orderType, BigDecimal limitPrice, String timeInForce) {
        if (orderType == null) {
            return;
        }
        if (orderType == OrderType.MARKET && limitPrice != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "limitPrice must not be provided for MARKET orders");
        }
        if (orderType == OrderType.LIMIT) {
            if (limitPrice == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "limitPrice must be provided for LIMIT orders");
            }
            if (limitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "limitPrice must be greater than 0");
            }
        }
        if (timeInForce != null && !"GTC".equals(timeInForce)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "timeInForce must be GTC");
        }
    }

    private int parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            int offset = Integer.parseInt(cursor);
            if (offset < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "cursor is invalid");
            }
            return offset;
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "cursor is invalid");
        }
    }

    private ApiException translateStateException(IllegalStateException ex) {
        return switch (ex.getMessage()) {
            case "INSUFFICIENT_CASH" -> new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_CASH", "not enough cash to place order");
            case "INSUFFICIENT_POSITION_QUANTITY" -> new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_POSITION_QUANTITY", "not enough position quantity to place order");
            default -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", ex.getMessage());
        };
    }

    private OrderQuery toQuery(OrderRecord record) {
        Order order = record.order();
        return new OrderQuery(
                record.orderId(),
                order.symbol(),
                order.side(),
                order.orderType(),
                order.quantity(),
                order.filledQuantity(),
                order.remainingQuantity(),
                order.limitPrice(),
                order.avgFillPrice(),
                order.status(),
                order.createdAt(),
                order.updatedAt()
        );
    }
}
