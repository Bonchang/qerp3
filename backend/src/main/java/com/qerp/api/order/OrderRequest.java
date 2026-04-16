package com.qerp.api.order;

import com.qerp.domain.order.OrderSide;
import com.qerp.domain.order.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record OrderRequest(
        @NotBlank(message = "must not be blank")
        @Pattern(regexp = "^[A-Z0-9.]{1,15}$", message = "must match ^[A-Z0-9.]{1,15}$")
        String symbol,
        @NotNull(message = "must not be null")
        OrderSide side,
        @NotNull(message = "must not be null")
        OrderType orderType,
        @NotNull(message = "must not be null")
        @DecimalMin(value = "0.0001", inclusive = true, message = "must be > 0")
        @Digits(integer = 18, fraction = 4, message = "must have up to 4 decimal places")
        BigDecimal quantity,
        @Digits(integer = 18, fraction = 2, message = "must have up to 2 decimal places")
        BigDecimal limitPrice,
        String timeInForce
) {
}
