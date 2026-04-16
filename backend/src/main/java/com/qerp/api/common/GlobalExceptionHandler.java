package com.qerp.api.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return org.springframework.http.ResponseEntity.status(ex.status())
                .body(buildError(ex.code(), ex.getMessage(), List.of(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorResponse.ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toDetail)
                .toList();
        String message = details.isEmpty() ? "validation failed" : details.get(0).field() + " " + details.get(0).reason();
        return org.springframework.http.ResponseEntity.badRequest()
                .body(buildError("VALIDATION_ERROR", message, details, request.getRequestURI()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, ConstraintViolationException.class, IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    public org.springframework.http.ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) {
        return org.springframework.http.ResponseEntity.badRequest()
                .body(buildError("VALIDATION_ERROR", extractMessage(ex), List.of(), request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildError("INTERNAL_ERROR", ex.getMessage(), List.of(), request.getRequestURI()));
    }

    private ErrorResponse buildError(String code, String message, List<ErrorResponse.ErrorDetail> details, String path) {
        return new ErrorResponse(
                new ErrorResponse.ErrorBody(code, message, details, UUID.randomUUID().toString().replace("-", "")),
                Instant.now(),
                path
        );
    }

    private ErrorResponse.ErrorDetail toDetail(FieldError error) {
        return new ErrorResponse.ErrorDetail(error.getField(), error.getDefaultMessage());
    }

    private String extractMessage(Exception ex) {
        if (ex instanceof HttpMessageNotReadableException) {
            return "malformed request";
        }
        if (ex instanceof MethodArgumentTypeMismatchException mismatchException) {
            return mismatchException.getName() + " has invalid value";
        }
        return ex.getMessage() == null ? "validation failed" : ex.getMessage();
    }
}
