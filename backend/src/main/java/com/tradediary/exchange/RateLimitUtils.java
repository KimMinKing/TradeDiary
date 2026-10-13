// [파일 용도] Upbit API Rate Limit 관리 유틸리티

package com.tradediary.exchange;

import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
public class RateLimitUtils {

    private static final String BASE_URL = "https://api.upbit.com/v1";
    private static final OkHttpClient httpClient = new OkHttpClient();
    private static final Gson gson = new Gson();
    private static final int TICKER_MAX_RETRIES = 3;
    private static final long TICKER_RETRY_DELAY_MS = 5000L;

    // Upbit Rate Limit: 초당 최대 10회
    private static final int REQUESTS_PER_SECOND = 5;
    private static final long MIN_REQUEST_INTERVAL_MS = 250L;

    // 마지막 요청 시간
    private static final AtomicLong lastRequestTime = new AtomicLong(0);

    // 현재 초 내 요청 카운트
    private static final AtomicInteger currentSecondRequests = new AtomicInteger(0);

    // 마지막 초 기준 시간
    private static volatile long lastSecondReset = Instant.now().getEpochSecond();

    /**
     * 다음 요청이 실행될 때까지 대기
     * 초당 10회 요청을 보장하기 위해 요청 간격을 조절
     */
    public static void waitForNextRequest() {
        long currentTime = Instant.now().getEpochSecond();

        // 초가 바뀌면 카운트 리셋
        if (currentTime != lastSecondReset) {
            lastSecondReset = currentTime;
            currentSecondRequests.set(0);
        }

        // 현재 초 내 요청 횟수 확인
        int requestsThisSecond = currentSecondRequests.get();

        if (requestsThisSecond >= REQUESTS_PER_SECOND) {
            // 초당 10회 초과 시 다음 초까지 대기
            long waitTime = 1000 - (System.currentTimeMillis() % 1000);
            log.debug("[RateLimit] 초당 제한 초과. {}ms 대기", waitTime);

            try {
                Thread.sleep(waitTime + 100); // 안전하게 100ms 추가 대기
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // 대기 후 카운트 리셋
            currentSecondRequests.set(1);
        } else {
            // 요청 횟수 증가
            currentSecondRequests.incrementAndGet();
        }

        // 요청 간 최소 간격 보장
        long lastTime = lastRequestTime.get();
        long elapsed = System.currentTimeMillis() - lastTime;

        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        lastRequestTime.set(System.currentTimeMillis());
    }

    /**
     * 여러 마켓을 한 번에 조회할 때 사용
     * @param markets 마켓 목록 (쉼표로 구분)
     * @return 티커 목록
     */
    public static List<Map<String, Object>> batchGetTicker(String markets) {
        for (int attempt = 1; attempt <= TICKER_MAX_RETRIES; attempt++) {
            waitForNextRequest();

            try {
                Request request = new Request.Builder()
                        .url(BASE_URL + "/ticker?markets=" + markets)
                        .get()
                        .addHeader("Accept", "application/json")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    String body = response.body().string();
                    log.debug("[Upbit] Batch ticker status={}, markets={}, body={}",
                            response.code(), markets, body.length() > 200 ? body.substring(0, 200) + "..." : body);

                    if (!response.isSuccessful()) {
                        if (response.code() == 429 && attempt < TICKER_MAX_RETRIES) {
                            log.warn("[Upbit] Batch ticker rate limit. markets={}, retry={}/{} after {}ms",
                                    markets, attempt, TICKER_MAX_RETRIES, TICKER_RETRY_DELAY_MS);
                            sleepTickerRetry();
                            continue;
                        }
                        throw new RuntimeException("Upbit Batch Ticker API 오류: " + body);
                    }

                    List<Map<String, Object>> result = gson.fromJson(body,
                            new TypeToken<List<Map<String, Object>>>() {}.getType());
                    return result != null ? result : Collections.emptyList();
                }
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException("Upbit Batch Ticker 호출 실패: " + e.getMessage(), e);
            }
        }

        return Collections.emptyList();
    }

    private static void sleepTickerRetry() {
        try {
            Thread.sleep(TICKER_RETRY_DELAY_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
