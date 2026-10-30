// [파일 용도] 인증 요청 빈도 제한 경계 단위 테스트

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// [클래스] 로그인 실패 및 비밀번호 재설정 요청 제한 검증
class AuthRateLimiterTest {

    @Test
    void blocksLoginAfterTenFailuresAndClearsAfterSuccess() {
        AuthRateLimiter limiter = new AuthRateLimiter();
        for (int i = 0; i < 10; i++) {
            limiter.recordLoginFailure("User@Example.com");
        }

        BusinessException error = assertThrows(BusinessException.class,
                () -> limiter.assertLoginAllowed(" user@example.com "));
        assertEquals(ErrorCode.RATE_LIMIT_EXCEEDED, error.getErrorCode());

        limiter.clearLoginFailures("USER@example.com");
        assertDoesNotThrow(() -> limiter.assertLoginAllowed("user@example.com"));
    }

    @Test
    void allowsThreePasswordResetRequestsAndBlocksTheFourth() {
        AuthRateLimiter limiter = new AuthRateLimiter();
        for (int i = 0; i < 3; i++) {
            assertDoesNotThrow(() -> limiter.acquirePasswordReset("user@example.com"));
        }

        BusinessException error = assertThrows(BusinessException.class,
                () -> limiter.acquirePasswordReset("user@example.com"));
        assertEquals(ErrorCode.RATE_LIMIT_EXCEEDED, error.getErrorCode());
    }
}
