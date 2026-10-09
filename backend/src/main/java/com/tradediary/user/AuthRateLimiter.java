// [파일 용도] 로그인 실패와 비밀번호 재설정 요청 빈도 제한

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

// [클래스] 단일 서버용 고정 윈도우 인증 요청 제한기
@Component
public class AuthRateLimiter {

    private static final int LOGIN_FAILURE_LIMIT = 10;
    private static final long LOGIN_WINDOW_MS = Duration.ofMinutes(5).toMillis();
    private static final int PASSWORD_RESET_LIMIT = 3;
    private static final long PASSWORD_RESET_WINDOW_MS = Duration.ofHours(1).toMillis();

    private final ConcurrentHashMap<String, Window> loginFailures = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Window> passwordResetRequests = new ConcurrentHashMap<>();
    private final Clock clock;

    public AuthRateLimiter() {
        this(Clock.systemUTC());
    }

    AuthRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void assertLoginAllowed(String email) {
        Window window = loginFailures.get(normalize(email));
        if (window != null && !window.isExpired(now(), LOGIN_WINDOW_MS)
                && window.count() >= LOGIN_FAILURE_LIMIT) {
            throw rateLimitExceeded();
        }
    }

    public void recordLoginFailure(String email) {
        increment(loginFailures, normalize(email), LOGIN_WINDOW_MS);
    }

    public void clearLoginFailures(String email) {
        loginFailures.remove(normalize(email));
    }

    public void acquirePasswordReset(String email) {
        String key = normalize(email);
        Window window = increment(passwordResetRequests, key, PASSWORD_RESET_WINDOW_MS);
        if (window.count() > PASSWORD_RESET_LIMIT) {
            throw rateLimitExceeded();
        }
    }

    @Scheduled(fixedDelay = 600_000L)
    public void removeExpiredWindows() {
        long now = now();
        loginFailures.entrySet().removeIf(entry -> entry.getValue().isExpired(now, LOGIN_WINDOW_MS));
        passwordResetRequests.entrySet().removeIf(
                entry -> entry.getValue().isExpired(now, PASSWORD_RESET_WINDOW_MS));
    }

    private Window increment(ConcurrentHashMap<String, Window> windows, String key, long durationMs) {
        long now = now();
        return windows.compute(key, (ignored, current) ->
                current == null || current.isExpired(now, durationMs)
                        ? new Window(now, 1)
                        : new Window(current.startedAt(), current.count() + 1));
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private long now() {
        return clock.millis();
    }

    private BusinessException rateLimitExceeded() {
        return new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED);
    }

    private record Window(long startedAt, int count) {
        private boolean isExpired(long now, long durationMs) {
            return now - startedAt >= durationMs;
        }
    }
}
