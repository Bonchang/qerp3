package com.qerp.application.order;

import com.qerp.domain.order.Order;

import java.util.List;
import java.util.Optional;

public interface OrderStore {

    OrderRecord save(Order order);

    OrderRecord update(String orderId, Order order);

    Optional<OrderRecord> findById(String orderId);

    List<OrderRecord> findAll();
}