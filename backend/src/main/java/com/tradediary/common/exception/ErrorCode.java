// [파일 용도] 전역 에러 코드 정의

package com.tradediary.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

// [클래스] API 에러 코드 및 메시지 열거형
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Invalid input."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Authentication is required."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "You do not have permission to access this resource."),
    PRIVATE_RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "The requested resource was not found."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "The requested resource was not found."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred."),
    RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again shortly."),

    // 사용자
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "User not found."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "This email address is already in use."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "The password is incorrect."),

    // JWT
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid token."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "The token has expired."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "Refresh token not found."),

    // 거래
    TRADE_NOT_FOUND(HttpStatus.NOT_FOUND, "Trade not found."),

    // 매매 일기
    JOURNAL_NOT_FOUND(HttpStatus.NOT_FOUND, "Journal not found."),
    INVALID_JOURNAL_IMAGE(HttpStatus.BAD_REQUEST, "The image is unsupported or corrupted."),
    JOURNAL_IMAGE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Journal images must be 1.5 MB or smaller."),
    TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "Strategy tag not found."),

    // 매매 계획
    COMMUNITY_POST_NOT_FOUND(HttpStatus.NOT_FOUND, "Community post not found."),
    COMMUNITY_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Community comment not found."),
    INVALID_COMMUNITY_IMAGE(HttpStatus.BAD_REQUEST, "Use a PNG, JPEG or WebP image under 1.5 MB."),

    PLAN_NOT_FOUND(HttpStatus.NOT_FOUND, "Trade plan not found."),

    // 체크리스트
    CHECKLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "Checklist item not found."),
    DUPLICATE_CHECKLIST(HttpStatus.CONFLICT, "This checklist item already exists."),
    CHECKLIST_IN_USE(HttpStatus.CONFLICT, "Checklist items in use cannot be deleted."),

    // 비밀번호 재설정
    RESET_TOKEN_NOT_FOUND(HttpStatus.BAD_REQUEST, "The reset link is invalid or expired."),
    RESET_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "The reset link has expired. Request a new one."),
    RESET_TOKEN_USED(HttpStatus.BAD_REQUEST, "This reset link has already been used. Request a new one.");

    private final HttpStatus httpStatus;
    private final String message;
}
