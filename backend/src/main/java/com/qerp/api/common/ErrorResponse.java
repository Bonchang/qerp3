package com.qerp.api.common;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(ErrorBody error, Instant timestamp, String path) {

    public record ErrorBody(String code, String message, List<ErrorDetail> details, String traceId) {
    }

    public record ErrorDetail(String field, String reason) {
    }
}
