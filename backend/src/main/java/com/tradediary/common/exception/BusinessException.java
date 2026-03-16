// [파일 용도] 비즈니스 로직 예외 클래스

package com.tradediary.common.exception;

import lombok.Getter;

// [클래스] 비즈니스 로직에서 발생하는 커스텀 예외
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
