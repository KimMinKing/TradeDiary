// [파일 용도] API 응답 공통 DTO

package com.tradediary.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    private LocalDateTime timestamp;

    // 성공 응답 (데이터 없음)
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(true, null, "Success", LocalDateTime.now());
    }

    // 성공 응답 (데이터 있음)
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, "Success", LocalDateTime.now());
    }

    // 성공 응답 (데이터 + 메시지)
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message, LocalDateTime.now());
    }

    // 실패 응답
    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, null, message, LocalDateTime.now());
    }

    // 실패 응답 (데이터 있음)
    public static <T> ApiResponse<T> fail(T data, String message) {
        return new ApiResponse<>(false, data, message, LocalDateTime.now());
    }
}