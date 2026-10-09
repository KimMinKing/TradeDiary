package com.tradediary.portfolio;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PublicPortfolioRateLimiter {
    private static final int MAX_REQUESTS_PER_MINUTE = 90;
    private final ConcurrentHashMap<Long, Window> windows = new ConcurrentHashMap<>();

    public void check(Long viewerId) {
        if (viewerId == null) throw new TooManyPublicRequestsException("Authentication is required.");
        long minute = Instant.now().getEpochSecond() / 60;
        Window window = windows.compute(viewerId, (key, current) -> {
            if (current == null || current.minute != minute) return new Window(minute, 1);
            return new Window(minute, current.count + 1);
        });
        if (window.count > MAX_REQUESTS_PER_MINUTE) {
            throw new TooManyPublicRequestsException("Too many portfolio requests. Please try again shortly.");
        }
        if (windows.size() > 10_000) windows.entrySet().removeIf(e -> e.getValue().minute < minute - 2);
    }

    private record Window(long minute, int count) {}
}
