// [파일 용도] Bitget REST API 호출 클라이언트

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

// [클래스] Bitget /api/mix/v1/order/historyProductType API 호출 (90일 슬라이딩 윈도우 방식)
@Slf4j
@Component
public class BitgetClient {

    private static final String BASE_URL = "https://api.bitget.com";
    // Bitget 선물: USDT 무기한 선물 (UMCBL)
    private static final String PRODUCT_TYPE = "umcbl";
    private static final int PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] Bitget 선물 거래 내역 전체 조회 (90일 슬라이딩 윈도우) / [호출] TradeService.syncBitgetTrades()
    // startTime: 초기 동기화 = 1년 전, 증분 동기화 = DB 마지막 거래 시각
    public List<BitgetOrder> getOrders(String apiKey, String secretKey, String passphrase, LocalDateTime startTime) {
        log.info("[Bitget] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        List<BitgetOrder> result = new ArrayList<>();
        LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);

        while (windowStart.isBefore(now)) {
            // Bitget 최대 조회 기간: 90일
            LocalDateTime windowEnd = windowStart.plusDays(90);
            if (windowEnd.isAfter(now)) windowEnd = now;

            long startMs = toEpochMilli(windowStart);
            long endMs = toEpochMilli(windowEnd);

            String lastEndId = null;
            boolean hasNext = true;

            while (hasNext) {
                BitgetOrderPage page;
                try {
                    page = fetchPage(apiKey, secretKey, passphrase, startMs, endMs, lastEndId);
                } catch (RuntimeException e) {
                    log.error("[Bitget] 동기화 중단: {}", e.getMessage());
                    return result;
                }

                if (page == null || page.orders.isEmpty()) break;

                result.addAll(page.orders);
                hasNext = page.nextFlag;
                lastEndId = page.endId;

                if (hasNext) {
                    try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
                }
            }

            windowStart = windowEnd;
            try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
        }

        log.info("[Bitget] 전체 조회 완료: {}건", result.size());
        return result;
    }

    // [용도] 단일 페이지 API 호출 / [호출] getOrders()
    private BitgetOrderPage fetchPage(String apiKey, String secretKey, String passphrase,
                                      long startMs, long endMs, String lastEndId) {
        StringBuilder qs = new StringBuilder();
        qs.append("productType=").append(PRODUCT_TYPE);
        qs.append("&startTime=").append(startMs);
        qs.append("&endTime=").append(endMs);
        qs.append("&pageSize=").append(PAGE_SIZE);
        if (lastEndId != null && !lastEndId.isBlank()) {
            qs.append("&lastEndId=").append(lastEndId);
        }

        String requestPath = "/api/mix/v1/order/historyProductType";
        String timestamp = String.valueOf(System.currentTimeMillis());
        String signature = sign(secretKey, timestamp, "GET", requestPath, qs.toString(), "");

        Request request = new Request.Builder()
                .url(BASE_URL + requestPath + "?" + qs)
                .get()
                .addHeader("ACCESS-KEY", apiKey)
                .addHeader("ACCESS-SIGN", signature)
                .addHeader("ACCESS-TIMESTAMP", timestamp)
                .addHeader("ACCESS-PASSPHRASE", passphrase)
                .addHeader("Content-Type", "application/json")
                .addHeader("locale", "en-US")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body().string();
            log.debug("[Bitget] status={}, body 앞 200자: {}",
                    response.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);

            JsonObject json = gson.fromJson(body, JsonObject.class);
            String code = json.has("code") ? json.get("code").getAsString() : "";

            if (!"00000".equals(code)) {
                String msg = json.has("msg") ? json.get("msg").getAsString() : "알 수 없는 오류";
                log.error("[Bitget] API 오류: code={}, msg={}", code, msg);
                throw new RuntimeException("Bitget API 오류 (code=" + code + "): " + msg);
            }

            JsonObject data = json.getAsJsonObject("data");
            boolean nextFlag = data.has("nextFlag") && data.get("nextFlag").getAsBoolean();
            String endId = data.has("endId") && !data.get("endId").isJsonNull()
                    ? data.get("endId").getAsString() : null;

            List<BitgetOrder> orders = new ArrayList<>();
            if (data.has("orderList") && !data.get("orderList").isJsonNull()) {
                for (var elem : data.getAsJsonArray("orderList")) {
                    JsonObject o = elem.getAsJsonObject();
                    // filledQty가 0인 미체결 주문 제외
                    String filledQtyStr = getStr(o, "filledQty");
                    if (filledQtyStr == null || "0".equals(filledQtyStr) || "0.0".equals(filledQtyStr)) continue;

                    BitgetOrder order = new BitgetOrder();
                    order.orderId    = getStr(o, "orderId");
                    order.symbol     = getStr(o, "symbol");
                    order.side       = getStr(o, "side");
                    order.filledQty  = filledQtyStr;
                    order.priceAvg   = getStr(o, "priceAvg");
                    order.fee        = getStr(o, "fee");
                    order.cTime      = getStr(o, "cTime");
                    orders.add(order);
                }
            }

            return new BitgetOrderPage(orders, nextFlag, endId);

        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            log.error("[Bitget] 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    // [용도] HMAC-SHA256 + Base64 서명 생성 / [호출] fetchPage()
    // 서명 문자열: timestamp + method + requestPath + "?" + queryString + body
    private String sign(String secretKey, String timestamp, String method,
                        String requestPath, String queryString, String body) {
        try {
            String preHash = timestamp + method.toUpperCase() + requestPath
                    + (queryString.isBlank() ? "" : "?" + queryString)
                    + body;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(preHash.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Bitget 서명 생성 실패", e);
        }
    }

    // [용도] LocalDateTime → 밀리초 에포크 변환 / [호출] getOrders()
    private long toEpochMilli(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
    }

    private String getStr(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    // Bitget 주문 응답 DTO
    public static class BitgetOrder {
        public String orderId;
        public String symbol;
        public String side;      // open_long, close_long, open_short, close_short
        public String filledQty;
        public String priceAvg;
        public String fee;       // 음수값 (수수료)
        public String cTime;     // 밀리초 타임스탬프 문자열
    }

    // 페이지 조회 결과 (내부용)
    private record BitgetOrderPage(List<BitgetOrder> orders, boolean nextFlag, String endId) {}

    // [용도] BitgetOrder를 공통 형식으로 변환 / [호출] TradeService.syncBitgetTrades()
    public record NormalizedTrade(
            String exchangeTradeId,
            String symbol,
            com.tradediary.trade.TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            BigDecimal fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(BitgetOrder order) {
            return new NormalizedTrade(
                    order.orderId,
                    order.symbol,
                    mapSide(order.side),
                    new BigDecimal(order.filledQty != null ? order.filledQty : "0"),
                    new BigDecimal(order.priceAvg != null ? order.priceAvg : "0"),
                    // 수수료는 음수로 전달되므로 절댓값 사용
                    new BigDecimal(order.fee != null ? order.fee : "0").abs(),
                    LocalDateTime.ofInstant(
                            Instant.ofEpochMilli(Long.parseLong(order.cTime)),
                            ZoneId.of("Asia/Seoul"))
            );
        }

        // [용도] Bitget side 문자열 → TradeSide 변환
        // open_long(롱 진입)=BUY, close_long(롱 청산)=SELL, open_short(숏 진입)=SELL, close_short(숏 청산)=BUY
        private static com.tradediary.trade.TradeSide mapSide(String side) {
            if (side == null) return com.tradediary.trade.TradeSide.BUY;
            return switch (side) {
                case "open_long", "close_short" -> com.tradediary.trade.TradeSide.BUY;
                case "close_long", "open_short" -> com.tradediary.trade.TradeSide.SELL;
                default -> com.tradediary.trade.TradeSide.BUY;
            };
        }

        // [용도] 저장 가능한 주문인지 확인 / [호출] TradeService.syncBitgetTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
