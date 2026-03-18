// [파일 용도] Bitget REST API 호출 클라이언트 (V3 Unified Trading Account)

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
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

// [클래스] Bitget V3 /api/v3/trade/history-orders API 호출 (30일 슬라이딩 윈도우 방식)
@Slf4j
@Component
public class BitgetClient {

    private static final String BASE_URL = "https://api.bitget.com";
    // V3 Unified Account: USDT 선물
    private static final String CATEGORY = "USDT-FUTURES";
    private static final int PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] Bitget 선물 거래 내역 전체 조회 (30일 슬라이딩 윈도우) / [호출] TradeService.syncBitgetTrades()
    // startTime: 초기 동기화 = 1년 전, 증분 동기화 = DB 마지막 거래 시각
    // Bitget V3: 1회 쿼리 최대 30일, 총 90일 이내
    public List<BitgetOrder> getOrders(String apiKey, String secretKey, String passphrase, LocalDateTime startTime) {
        log.info("[Bitget] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        // Bitget V3 최대 조회 범위: 90일
        LocalDateTime cutoff = now.minusDays(90);
        if (startTime.isBefore(cutoff)) {
            startTime = cutoff;
            log.info("[Bitget] startTime을 90일 전으로 조정: {}", startTime);
        }

        List<BitgetOrder> result = new ArrayList<>();
        LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);

        while (windowStart.isBefore(now)) {
            // V3: 1회 요청당 최대 30일
            LocalDateTime windowEnd = windowStart.plusDays(30);
            if (windowEnd.isAfter(now)) windowEnd = now;

            long startMs = toEpochMilli(windowStart);
            long endMs = toEpochMilli(windowEnd);

            // cursor 기반 페이지네이션
            String cursor = null;

            while (true) {
                BitgetOrderPage page;
                try {
                    page = fetchPage(apiKey, secretKey, passphrase, startMs, endMs, cursor);
                } catch (RuntimeException e) {
                    log.error("[Bitget] 동기화 중단: {}", e.getMessage());
                    return result;
                }

                if (page == null || page.orders().isEmpty()) break;

                result.addAll(page.orders());

                // cursor가 없으면 마지막 페이지
                if (page.cursor() == null || page.cursor().isBlank()) break;

                cursor = page.cursor();
                try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
            }

            windowStart = windowEnd;
            try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
        }

        log.info("[Bitget] 전체 조회 완료: {}건", result.size());
        return result;
    }

    // [용도] 단일 페이지 API 호출 (V3) / [호출] getOrders()
    private BitgetOrderPage fetchPage(String apiKey, String secretKey, String passphrase,
                                      long startMs, long endMs, String cursor) {
        StringBuilder qs = new StringBuilder();
        qs.append("category=").append(CATEGORY);
        qs.append("&startTime=").append(startMs);
        qs.append("&endTime=").append(endMs);
        qs.append("&limit=").append(PAGE_SIZE);
        if (cursor != null && !cursor.isBlank()) {
            qs.append("&cursor=").append(cursor);
        }

        // V3 엔드포인트
        String requestPath = "/api/v3/trade/history-orders";
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

            // V3 페이지네이션: cursor (다음 요청에 cursor 파라미터로 사용)
            String nextCursor = data.has("cursor") && !data.get("cursor").isJsonNull()
                    ? data.get("cursor").getAsString() : null;

            List<BitgetOrder> orders = new ArrayList<>();
            if (data.has("list") && !data.get("list").isJsonNull()) {
                for (var elem : data.getAsJsonArray("list")) {
                    JsonObject o = elem.getAsJsonObject();

                    // filled 상태인 주문만 처리
                    String status = getStr(o, "orderStatus");
                    if (!"filled".equals(status)) continue;

                    // 체결 수량이 0이면 제외
                    String execQtyStr = getStr(o, "cumExecQty");
                    if (execQtyStr == null || new BigDecimal(execQtyStr).compareTo(BigDecimal.ZERO) == 0) continue;

                    BitgetOrder order = new BitgetOrder();
                    order.orderId   = getStr(o, "orderId");
                    order.symbol    = getStr(o, "symbol");
                    // V3: side = buy/sell (단순 매핑)
                    order.side      = getStr(o, "side");
                    order.filledQty = execQtyStr;
                    order.priceAvg  = getStr(o, "avgPrice");
                    // feeDetail 배열의 fee 합산
                    order.fee       = sumFeeDetail(o);
                    order.cTime     = getStr(o, "createdTime");
                    orders.add(order);
                }
            }

            return new BitgetOrderPage(orders, nextCursor);

        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            log.error("[Bitget] 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    // [용도] feeDetail 배열의 fee 합산 (절댓값) / [호출] fetchPage()
    private String sumFeeDetail(JsonObject order) {
        if (!order.has("feeDetail") || order.get("feeDetail").isJsonNull()) return "0";
        JsonArray feeDetail = order.getAsJsonArray("feeDetail");
        BigDecimal total = BigDecimal.ZERO;
        for (var elem : feeDetail) {
            JsonObject feeObj = elem.getAsJsonObject();
            if (feeObj.has("fee") && !feeObj.get("fee").isJsonNull()) {
                total = total.add(new BigDecimal(feeObj.get("fee").getAsString()).abs());
            }
        }
        return total.toPlainString();
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
        public String side;      // V3: buy / sell
        public String filledQty; // cumExecQty
        public String priceAvg;  // avgPrice
        public String fee;       // feeDetail 합산값 (절댓값)
        public String cTime;     // createdTime (밀리초 타임스탬프 문자열)
    }

    // 페이지 조회 결과 (내부용)
    private record BitgetOrderPage(List<BitgetOrder> orders, String cursor) {}

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
                    // V3: buy→BUY, sell→SELL (단순 매핑)
                    "buy".equals(order.side)
                            ? com.tradediary.trade.TradeSide.BUY
                            : com.tradediary.trade.TradeSide.SELL,
                    new BigDecimal(order.filledQty != null ? order.filledQty : "0"),
                    new BigDecimal(order.priceAvg != null ? order.priceAvg : "0"),
                    new BigDecimal(order.fee != null ? order.fee : "0"),
                    LocalDateTime.ofInstant(
                            Instant.ofEpochMilli(Long.parseLong(order.cTime)),
                            ZoneId.of("Asia/Seoul"))
            );
        }

        // [용도] 저장 가능한 주문인지 확인 / [호출] TradeService.syncBitgetTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
