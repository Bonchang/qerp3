package com.qerp.application.order;

import com.qerp.domain.order.Order;

public record OrderRecord(String orderId, Order order) {
}
