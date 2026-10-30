// [파일 용도] 전역 예외 처리 핸들러

package com.tradediary.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import com.tradediary.portfolio.TooManyPublicRequestsException;

import java.util.Map;

// [클래스] 컨트롤러 전역 예외 처리 / [호출] Spring MVC 자동 감지
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TooManyPublicRequestsException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(TooManyPublicRequestsException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", e.getMessage()));
    }

    // [용도] 비즈니스 예외 처리 / [호출] BusinessException 발생 시 자동 호출
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, String>> handleBusinessException(BusinessException e) {
        log.warn("BusinessException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(Map.of("message", e.getMessage()));
    }

    // [용도] 입력값 검증 예외 처리 / [호출] @Valid 검증 실패 시 자동 호출
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("입력값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleInvalidOperation(RuntimeException e) {
        log.warn("Invalid operation: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", e.getMessage() == null ? "The request could not be completed." : e.getMessage()));
    }

    // [용도] 예상치 못한 예외 처리 / [호출] 처리되지 않은 예외 발생 시 자동 호출
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error: ", e);
        return ResponseEntity.internalServerError()
                .body(Map.of("message", "서버 내부 오류가 발생했습니다."));
    }
}
