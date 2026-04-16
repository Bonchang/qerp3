package com.qerp.application.order;

import java.util.List;

public record OrderListResult(List<OrderQuery> items, String nextCursor) {
}
