package com.qerp.domain.order;

import com.qerp.domain.portfolio.Portfolio;

public record OrderExecutionResult(Order order, Portfolio portfolio) {
}
