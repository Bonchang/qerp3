package com.qerp.api.order;

import java.util.List;

public record OrderListResponse(List<OrderResponse> items, String nextCursor) {
}
