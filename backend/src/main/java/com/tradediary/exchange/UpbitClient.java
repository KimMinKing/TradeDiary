// [파일 용도] Upbit REST API 호출 클라이언트

package com.tradediary.exchange;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.TimeUnit;

// [클래스] Upbit /v1/orders/closed API 호출 (7일 슬라이딩 윈도우 방식)
@Slf4j
@Component
public class UpbitClient {

    private static final String BASE_URL = "https://api.upbit.com/v1";
    // /v1/orders/closed 최대 조회 기간: 7일 / 최대 limit: 1000
    private static final int WINDOW_DAYS = 7;
    private static final int PAGE_LIMIT = 1000;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] 체결 완료 주문 목록 조회 (7일 슬라이딩 윈도우) / [호출] TradeService.syncUpbitTrades()
    // startTime: 초기 동기화 = 1년 전, 증분 동기화 = DB 마지막 거래 시각
    public List<UpbitOrder> getClosedOrders(String accessKey, String secretKey, LocalDateTime startTime) {
        // 복호화된 Key 앞 6자리만 로그 (검증용)
        log.info("[Upbit] Access Key 앞 6자리: {}...", accessKey.length() > 6 ? accessKey.substring(0, 6) : accessKey);

        List<UpbitOrder> allOrders = new ArrayList<>();
        LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);
        // 시스템 기본 시간대(Docker = UTC)에 의존하지 않고 KST 기준으로 명시
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).truncatedTo(ChronoUnit.SECONDS);

        log.info("[Upbit] 조회 구간: {} ~ {}", windowStart, now);

        while (windowStart.isBefore(now)) {
            LocalDateTime windowEnd = windowStart.plusDays(WINDOW_DAYS);
            if (windowEnd.isAfter(now)) windowEnd = now;

            List<UpbitOrder> windowOrders = fetchWindow(accessKey, secretKey, windowStart, windowEnd);
            allOrders.addAll(windowOrders);

            log.info("[Upbit] 윈도우 {} ~ {}: {}건 (누적 {}건)",
                    windowStart, windowEnd, windowOrders.size(), allOrders.size());

            windowStart = windowEnd;

            // rate limit 방지: 윈도우 이동 시 200ms 딜레이
            if (windowStart.isBefore(now)) {
                try { TimeUnit.MILLISECONDS.sleep(200); } catch (InterruptedException ignored) {}
            }
        }

        log.info("[Upbit] 전체 조회 완료: {}건", allOrders.size());
        return allOrders;
    }

    // [용도] 특정 7일 윈도우 내 주문 조회 / [호출] getClosedOrders()
    private List<UpbitOrder> fetchWindow(String accessKey, String secretKey,
                                          LocalDateTime windowStart, LocalDateTime windowEnd) {
        // state 미지정 → 기본값 done+cancel 모두 반환
        // cancel 포함 이유: 시장가 매수(ord_type=price)는 소수점 잔량으로 인해 state=cancel로 끝날 수 있음
        // 실제 체결 여부는 executed_volume > 0 으로 판단 (TradeService에서 필터링)
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("start_time", toIso(windowStart));
        params.put("end_time", toIso(windowEnd));
        params.put("limit", String.valueOf(PAGE_LIMIT));
        params.put("order_by", "asc");

        String hashQueryString = buildQueryString(params, false);
        String urlQueryString = buildQueryString(params, true);

        log.debug("[Upbit] 요청: {}", hashQueryString);

        String jwtToken = createJwt(accessKey, secretKey, hashQueryString);

        Request request = new Request.Builder()
                .url(BASE_URL + "/orders/closed?" + urlQueryString)
                .get()
                .addHeader("Accept", "application/json")
                .addHeader("Authorization", "Bearer " + jwtToken)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body().string();
            log.info("[Upbit] status={}, body 앞 200자: {}",
                    response.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);

            if (!response.isSuccessful()) {
                log.error("[Upbit] API 오류: {}", body);
                return Collections.emptyList();
            }

            List<UpbitOrder> orders = gson.fromJson(body,
                    new TypeToken<List<UpbitOrder>>() {}.getType());
            return orders != null ? orders : Collections.emptyList();

        } catch (Exception e) {
            log.error("[Upbit] 호출 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // [용도] LocalDateTime → KST ISO 형식 (초 단위) / [호출] fetchWindow()
    private String toIso(LocalDateTime dateTime) {
        return dateTime.atOffset(ZoneOffset.ofHours(9))
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    // [용도] 쿼리스트링 빌드 / [호출] fetchWindow()
    // encodeValues=false: hash 계산용, encodeValues=true: URL용
    private String buildQueryString(Map<String, Object> params, boolean encodeValues) {
        List<String> components = new ArrayList<>();
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (value == null) continue;

            List<Object> values = (value instanceof List)
                    ? (List<Object>) value
                    : Collections.singletonList(value);

            for (Object val : values) {
                String paramKey = (value instanceof List)
                        ? URLEncoder.encode(key, StandardCharsets.UTF_8) + "[]"
                        : URLEncoder.encode(key, StandardCharsets.UTF_8);
                String paramVal = encodeValues
                        ? URLEncoder.encode(String.valueOf(val), StandardCharsets.UTF_8)
                        : String.valueOf(val);
                components.add(paramKey + "=" + paramVal);
            }
        }
        return String.join("&", components);
    }

    // [용도] JWT 토큰 생성 (Upbit 인증용) / [호출] fetchWindow()
    private String createJwt(String accessKey, String secretKey, String queryString) {
        try {
            Algorithm algorithm = Algorithm.HMAC512(secretKey.getBytes(StandardCharsets.UTF_8));

            JWTCreator.Builder builder = JWT.create()
                    .withHeader(Collections.singletonMap("alg", "HS512"))
                    .withClaim("access_key", accessKey)
                    .withClaim("nonce", UUID.randomUUID().toString());

            if (queryString != null && !queryString.isEmpty()) {
                builder.withClaim("query_hash", sha512(queryString));
                builder.withClaim("query_hash_alg", "SHA512");
            }
            return builder.sign(algorithm);
        } catch (Exception e) {
            throw new RuntimeException("Upbit JWT 생성 실패", e);
        }
    }

    // [용도] 문자열 SHA-512 해시 / [호출] createJwt()
    private String sha512(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-512");
        md.update(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(md.digest());
    }

    // Upbit /v1/orders/closed 응답 DTO
    public static class UpbitOrder {
        public String uuid;
        public String side;             // bid(매수), ask(매도)
        public String ord_type;         // market, price, limit
        public String market;           // KRW-BTC
        public String state;            // done, cancel
        public String executed_volume;  // 체결 수량
        public String avg_price;        // 평균 체결가
        public String executed_funds;   // 총 체결 금액
        public String paid_fee;         // 수수료
        public String created_at;       // ISO 8601 +09:00
    }

    // [용도] UpbitOrder를 공통 형식으로 변환 / [호출] TradeService.syncUpbitTrades()
    public record NormalizedTrade(
            String exchangeTradeId,
            String symbol,
            com.tradediary.trade.TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            BigDecimal fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(UpbitOrder order) {
            BigDecimal executedVolume = new BigDecimal(
                    order.executed_volume != null ? order.executed_volume : "0");

            // 시장가 주문은 avg_price null → executed_funds / executed_volume으로 계산
            BigDecimal price;
            if (order.avg_price != null && !order.avg_price.equals("0")) {
                price = new BigDecimal(order.avg_price);
            } else if (order.executed_funds != null && executedVolume.compareTo(BigDecimal.ZERO) > 0) {
                price = new BigDecimal(order.executed_funds)
                        .divide(executedVolume, 10, java.math.RoundingMode.HALF_UP);
            } else {
                price = BigDecimal.ZERO;
            }

            return new NormalizedTrade(
                    order.uuid,
                    order.market,
                    "bid".equals(order.side)
                            ? com.tradediary.trade.TradeSide.BUY
                            : com.tradediary.trade.TradeSide.SELL,
                    executedVolume,
                    price,
                    new BigDecimal(order.paid_fee != null ? order.paid_fee : "0"),
                    LocalDateTime.parse(order.created_at, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            );
        }

        // [용도] 저장 가능한 체결 주문인지 확인 / [호출] TradeService.syncUpbitTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
