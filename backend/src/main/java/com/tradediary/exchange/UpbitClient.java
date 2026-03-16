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

    // [용도] 완료된 주문 내역 조회 / [호출] TradeService.syncTrades()
    public List<UpbitOrder> getClosedOrders(String accessKey, String secretKey) {
        List<UpbitOrder> allOrders = new ArrayList<>();
        int page = 1;

        while (true) {
            String queryString = "state=done&limit=100&page=" + page + "&order_by=desc";
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
                if (orders.size() < 100) break;
                page++;
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
        public String side;           // bid(매수), ask(매도)
        public String market;         // KRW-BTC
        public String executed_volume;
        public String avg_price;
        public String paid_fee;
        public String created_at;     // ISO 8601
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
            return new NormalizedTrade(
                    order.uuid,
                    order.market,
                    "bid".equals(order.side)
                            ? com.tradediary.trade.TradeSide.BUY
                            : com.tradediary.trade.TradeSide.SELL,
                    new BigDecimal(order.executed_volume),
                    new BigDecimal(order.avg_price),
                    new BigDecimal(order.paid_fee),
                    LocalDateTime.parse(order.created_at,
                            DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            );
        }
    }
}
