package com.qerp.api.order;

import com.qerp.application.order.OrderListResult;
import com.qerp.application.order.OrderQuery;
import com.qerp.application.order.OrderService;
import com.qerp.domain.order.OrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/orders")
@Validated
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(@Valid @RequestBody OrderRequest request) {
        return toResponse(orderService.createOrder(
                request.symbol(),
                request.side(),
                request.orderType(),
                request.quantity(),
                request.limitPrice(),
                request.timeInForce()
        ));
    }

    @GetMapping("/{orderId}")
    public OrderResponse getOrder(@PathVariable String orderId) {
        return toResponse(orderService.getOrder(orderId));
    }

    @GetMapping
    public OrderListResponse listOrders(
            @RequestParam Optional<OrderStatus> status,
            @RequestParam Optional<String> symbol,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) String cursor
    ) {
        OrderListResult result = orderService.listOrders(status, symbol, limit, cursor);
        return new OrderListResponse(result.items().stream().map(this::toResponse).toList(), result.nextCursor());
    }

    @PostMapping("/{orderId}/cancel")
    public CancelOrderResponse cancelOrder(@PathVariable String orderId) {
        OrderQuery cancelled = orderService.cancelOrder(orderId);
        return new CancelOrderResponse(cancelled.orderId(), cancelled.status().name(), cancelled.updatedAt());
    }

    private OrderResponse toResponse(OrderQuery order) {
        return new OrderResponse(
                order.orderId(),
                order.symbol(),
                order.side().name(),
                order.orderType().name(),
                order.quantity(),
                order.filledQuantity(),
                order.remainingQuantity(),
                order.limitPrice(),
                order.avgFillPrice(),
                order.status().name(),
                order.createdAt(),
                order.updatedAt()
        );
    }
}
