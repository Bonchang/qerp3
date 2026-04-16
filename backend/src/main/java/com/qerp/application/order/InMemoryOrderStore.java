package com.qerp.application.order;

import com.qerp.domain.order.Order;
import com.qerp.domain.portfolio.Portfolio;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class InMemoryOrderStore {

    private static final BigDecimal INITIAL_EQUITY = new BigDecimal("100000.00");

    private final AtomicLong sequence = new AtomicLong(1);
    private final Map<String, Order> orders = new LinkedHashMap<>();
    private Portfolio portfolio = Portfolio.create(INITIAL_EQUITY);

    public synchronized OrderRecord save(Order order) {
        String orderId = "ord_" + sequence.getAndIncrement();
        orders.put(orderId, order);
        return new OrderRecord(orderId, order);
    }

    public synchronized OrderRecord update(String orderId, Order order) {
        orders.put(orderId, order);
        return new OrderRecord(orderId, order);
    }

    public synchronized Optional<OrderRecord> findById(String orderId) {
        return Optional.ofNullable(orders.get(orderId))
                .map(order -> new OrderRecord(orderId, order));
    }

    public synchronized List<OrderRecord> findAll() {
        List<OrderRecord> items = new ArrayList<>();
        for (Map.Entry<String, Order> entry : orders.entrySet()) {
            items.add(new OrderRecord(entry.getKey(), entry.getValue()));
        }
        items.sort(Comparator.comparing((OrderRecord record) -> record.order().createdAt()).reversed()
                .thenComparing(OrderRecord::orderId, Comparator.reverseOrder()));
        return items;
    }

    public synchronized Portfolio getPortfolio() {
        return portfolio;
    }

    public synchronized void updatePortfolio(Portfolio portfolio) {
        this.portfolio = portfolio;
    }
}
