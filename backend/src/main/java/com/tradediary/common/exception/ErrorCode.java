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
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    // 사용자
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "비밀번호가 올바르지 않습니다."),

    // JWT
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "RefreshToken을 찾을 수 없습니다."),

    // 거래
    TRADE_NOT_FOUND(HttpStatus.NOT_FOUND, "거래 내역을 찾을 수 없습니다."),

    // 매매 일기
    JOURNAL_NOT_FOUND(HttpStatus.NOT_FOUND, "매매 일기를 찾을 수 없습니다."),
    TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "전략 태그를 찾을 수 없습니다."),

    // 매매 계획
    PLAN_NOT_FOUND(HttpStatus.NOT_FOUND, "매매 계획을 찾을 수 없습니다."),

    // 비밀번호 재설정
    RESET_TOKEN_NOT_FOUND(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 링크입니다."),
    RESET_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "재설정 링크가 만료되었습니다. 다시 요청해주세요."),
    RESET_TOKEN_USED(HttpStatus.BAD_REQUEST, "이미 사용된 링크입니다. 다시 요청해주세요.");

    private final HttpStatus httpStatus;
    private final String message;
}
