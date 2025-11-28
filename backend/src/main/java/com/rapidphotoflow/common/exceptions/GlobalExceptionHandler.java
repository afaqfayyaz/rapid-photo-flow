package com.rapidphotoflow.common.exceptions;

import com.rapidphotoflow.common.querydto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Global exception handler for REST controllers.
 * 
 * <p>Provides consistent error responses across all endpoints,
 * mapping exceptions to appropriate HTTP status codes and ApiResponse format.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFoundException(NotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiResponse<Object> response = new ApiResponse<>(
            false,
            ex.getMessage(),
            HttpStatus.NOT_FOUND.value(),
            null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        ApiResponse<Object> response = new ApiResponse<>(
            false,
            ex.getMessage(),
            HttpStatus.BAD_REQUEST.value(),
            null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        
        log.warn("Validation error: {}", errorMessage);
        ApiResponse<Object> response = new ApiResponse<>(
            false,
            "Validation failed: " + errorMessage,
            HttpStatus.BAD_REQUEST.value(),
            null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        ApiResponse<Object> response = new ApiResponse<>(
            false,
            ex.getMessage(),
            HttpStatus.BAD_REQUEST.value(),
            null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        log.error("Unexpected error", ex);
        String errorMessage = "An unexpected error occurred";
        if (ex.getMessage() != null && !ex.getMessage().isEmpty()) {
            errorMessage = ex.getMessage();
        } else if (ex.getCause() != null && ex.getCause().getMessage() != null) {
            errorMessage = ex.getCause().getMessage();
        }
        ApiResponse<Object> response = new ApiResponse<>(
            false,
            errorMessage,
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}

