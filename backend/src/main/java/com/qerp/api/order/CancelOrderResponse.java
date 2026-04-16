package com.qerp.api.order;

import java.time.Instant;

public record CancelOrderResponse(String orderId, String status, Instant cancelledAt) {
}
