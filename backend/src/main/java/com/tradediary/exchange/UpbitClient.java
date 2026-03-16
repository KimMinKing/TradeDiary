// [파일 용도] Upbit REST API 호출 클라이언트

package com.tradediary.exchange;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

// [클래스] Upbit API 인증 및 데이터 조회 (주문 내역)
@Slf4j
@Component
public class UpbitClient {

    private static final String BASE_URL = "https://api.upbit.com/v1";
    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] 완료된 주문 내역 조회 (커서 기반 페이지네이션) / [호출] TradeService.syncTrades()
    public List<UpbitOrder> getClosedOrders(String accessKey, String secretKey) {
        List<UpbitOrder> allOrders = new ArrayList<>();
        String cursor = null;

        // ord_type[] 명시: market(시장가 매도), price(시장가 매수), limit(지정가) 모두 포함
        String baseQuery = "state=done&limit=100&order_by=desc"
                + "&ord_type[]=market&ord_type[]=price&ord_type[]=limit";

        while (true) {
            // cursor가 있으면 이어서 조회, 없으면 처음부터
            String queryString = cursor != null
                    ? baseQuery + "&cursor=" + cursor
                    : baseQuery;

            String jwtToken = createJwt(accessKey, secretKey, queryString);

            Request request = new Request.Builder()
                    .url(BASE_URL + "/orders/closed?" + queryString)
                    .get()
                    .addHeader("Accept", "application/json")
                    .addHeader("Authorization", "Bearer " + jwtToken)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body().string();
                if (!response.isSuccessful()) {
                    log.error("Upbit API 오류: {}", body);
                    break;
                }
                List<UpbitOrder> orders = gson.fromJson(body,
                        new TypeToken<List<UpbitOrder>>() {}.getType());
                if (orders == null || orders.isEmpty()) break;
                allOrders.addAll(orders);
                // 100건 미만이면 마지막 페이지
                if (orders.size() < 100) break;
                // 다음 페이지 커서: 마지막 항목의 created_at 사용
                cursor = orders.get(orders.size() - 1).created_at;
            } catch (Exception e) {
                log.error("Upbit API 호출 실패: {}", e.getMessage());
                break;
            }
        }
        return allOrders;
    }

    // [용도] JWT 토큰 생성 (Upbit 인증용) / [호출] getClosedOrders()
    private String createJwt(String accessKey, String secretKey, String queryString) {
        try {
            byte[] secretKeyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
            Algorithm algorithm = Algorithm.HMAC512(secretKeyBytes);

            String queryHash = sha512(queryString);

            return JWT.create()
                    .withHeader(Collections.singletonMap("alg", "HS512"))
                    .withClaim("access_key", accessKey)
                    .withClaim("nonce", UUID.randomUUID().toString())
                    .withClaim("query_hash", queryHash)
                    .withClaim("query_hash_alg", "SHA512")
                    .sign(algorithm);
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

    // Upbit 주문 응답 DTO
    public static class UpbitOrder {
        public String uuid;
        public String side;             // bid(매수), ask(매도)
        public String ord_type;         // market(시장가 매도), price(시장가 매수), limit(지정가)
        public String market;           // KRW-BTC
        public String executed_volume;  // 체결 수량
        public String avg_price;        // 평균 체결가
        public String executed_funds;   // 총 체결 금액
        public String paid_fee;         // 수수료
        public String created_at;       // ISO 8601
    }

    // [용도] UpbitOrder를 공통 형식으로 변환 / [호출] TradeService.syncTrades()
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

            // 시장가 주문은 avg_price가 null → executed_funds / executed_volume으로 평균가 계산
            BigDecimal price;
            if (order.avg_price != null && !order.avg_price.equals("0")) {
                price = new BigDecimal(order.avg_price);
            } else if (order.executed_funds != null && executedVolume.compareTo(BigDecimal.ZERO) > 0) {
                price = new BigDecimal(order.executed_funds).divide(executedVolume, 10, java.math.RoundingMode.HALF_UP);
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
                    LocalDateTime.parse(order.created_at,
                            DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            );
        }

        // [용도] 저장 가능한 체결 주문인지 확인 / [호출] TradeService.syncUpbitTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
