// [파일 용도] BingX USDT-M 선물 REST API 호출 클라이언트

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import com.tradediary.trade.TradeSide;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.TimeUnit;

// [클래스] BingX USDT-M 선물 거래 내역 조회
// 1단계: /openApi/swap/v2/quote/contracts 로 심볼 목록 수집
// 2단계: 심볼별 /openApi/swap/v2/trade/allOrders 로 체결 내역 수집
@Slf4j
@Component
public class BingxClient {

    private static final String BASE_URL  = "https://open-api.bingx.com";
    private static final int    PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
    private final Gson gson = new Gson();

    // [용도] 선물 체결 내역 전체 조회 / [호출] TradeService.syncBingxTrades()
    // 1) 전체 심볼 목록 조회
    // 2) 심볼별 FILLED 주문 조회 및 합산
    public List<BingxOrder> getTrades(String apiKey, String secretKey, LocalDateTime startTime) {
        log.info("[BingX] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        long startMs = startTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();

        List<String> symbols = fetchSymbols(apiKey, secretKey);
        log.info("[BingX] 심볼 목록: {}개", symbols.size());

        List<BingxOrder> allOrders = new ArrayList<>();
        for (String symbol : symbols) {
            List<BingxOrder> orders = fetchOrdersForSymbol(apiKey, secretKey, symbol, startMs);
            if (!orders.isEmpty()) {
                log.info("[BingX] 심볼={} 체결 {}건", symbol, orders.size());
                allOrders.addAll(orders);
            }
        }

        allOrders.sort(Comparator.comparingLong(o -> o.updateTime));
        log.info("[BingX] 전체 조회 완료: {}건", allOrders.size());
        return allOrders;
    }

    // [용도] 영구선물 심볼 목록 조회 / [호출] getTrades()
    private List<String> fetchSymbols(String apiKey, String secretKey) {
        List<String> result = new ArrayList<>();
        TreeMap<String, String> params = new TreeMap<>();
        params.put("timestamp", String.valueOf(ts()));

        String sig = sign(secretKey, params);
        String url = BASE_URL + "/openApi/swap/v2/quote/contracts?" + buildQuery(params) + "&signature=" + sig;

        Request req = new Request.Builder()
                .url(url)
                .header("X-BX-APIKEY", apiKey)
                .get().build();

        try (Response resp = httpClient.newCall(req).execute()) {
            String body = resp.body() != null ? resp.body().string() : "";
            if (!resp.isSuccessful()) {
                log.warn("[BingX] contracts 오류: {} {}", resp.code(), body);
                return result;
            }
            JsonObject root = gson.fromJson(body, JsonObject.class);
            JsonArray data = root.getAsJsonArray("data");
            if (data == null) return result;
            for (JsonElement el : data) {
                JsonObject obj = el.getAsJsonObject();
                if (obj.has("symbol") && !obj.get("symbol").isJsonNull()) {
                    result.add(obj.get("symbol").getAsString());
                }
            }
        } catch (Exception e) {
            log.error("[BingX] contracts 조회 실패", e);
        }
        return result;
    }

    // [용도] 심볼별 FILLED 주문 내역 페이지네이션 조회 / [호출] getTrades()
    private List<BingxOrder> fetchOrdersForSymbol(String apiKey, String secretKey, String symbol, long startMs) {
        List<BingxOrder> result = new ArrayList<>();
        Long lastOrderId = null;

        while (true) {
            TreeMap<String, String> params = new TreeMap<>();
            params.put("symbol", symbol);
            params.put("startTime", String.valueOf(startMs));
            params.put("limit", String.valueOf(PAGE_SIZE));
            if (lastOrderId != null) params.put("orderId", String.valueOf(lastOrderId));
            params.put("timestamp", String.valueOf(ts()));

            String sig = sign(secretKey, params);
            String url = BASE_URL + "/openApi/swap/v2/trade/allOrders?" + buildQuery(params) + "&signature=" + sig;

            Request req = new Request.Builder()
                    .url(url)
                    .header("X-BX-APIKEY", apiKey)
                    .get().build();

            try (Response resp = httpClient.newCall(req).execute()) {
                String body = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    log.warn("[BingX] allOrders 오류 symbol={}: {} {}", symbol, resp.code(), body);
                    break;
                }
                JsonObject root = gson.fromJson(body, JsonObject.class);
                int code = root.has("code") ? root.get("code").getAsInt() : -1;
                if (code != 0) break;

                // 응답 구조: { data: { orders: [...] } } 또는 { data: [...] }
                JsonArray orders = null;
                JsonElement dataEl = root.get("data");
                if (dataEl != null && dataEl.isJsonObject()) {
                    JsonElement ordersEl = dataEl.getAsJsonObject().get("orders");
                    if (ordersEl != null && ordersEl.isJsonArray()) orders = ordersEl.getAsJsonArray();
                } else if (dataEl != null && dataEl.isJsonArray()) {
                    orders = dataEl.getAsJsonArray();
                }

                if (orders == null || orders.size() == 0) break;

                long maxOrderId = lastOrderId != null ? lastOrderId : 0;
                for (JsonElement el : orders) {
                    JsonObject obj = el.getAsJsonObject();
                    try {
                        String status = obj.has("status") ? obj.get("status").getAsString() : "";
                        if (!"FILLED".equalsIgnoreCase(status) && !"PARTIALLY_FILLED".equalsIgnoreCase(status)) continue;

                        BingxOrder order = new BingxOrder();
                        order.orderId     = obj.get("orderId").getAsLong();
                        order.symbol      = symbol;
                        order.side        = obj.get("side").getAsString();
                        order.executedQty = new BigDecimal(obj.get("executedQty").getAsString());
                        order.avgPrice    = new BigDecimal(obj.get("avgPrice").getAsString());
                        // fee 필드: 없거나 음수일 수 있음 → abs
                        if (obj.has("fee") && !obj.get("fee").isJsonNull()) {
                            order.fee = new BigDecimal(obj.get("fee").getAsString()).abs();
                        } else {
                            order.fee = BigDecimal.ZERO;
                        }
                        order.updateTime  = obj.get("updateTime").getAsLong();

                        result.add(order);
                        if (order.orderId > maxOrderId) maxOrderId = order.orderId;
                    } catch (Exception e) {
                        log.warn("[BingX] order 파싱 실패: {}", obj);
                    }
                }

                if (orders.size() < PAGE_SIZE) break;
                lastOrderId = maxOrderId + 1;

            } catch (Exception e) {
                log.error("[BingX] allOrders 조회 실패 symbol={}", symbol, e);
                break;
            }
        }
        return result;
    }

    // [용도] BingX HMAC-SHA256 서명 생성 (TreeMap 정렬 기반) / [호출] fetchSymbols, fetchOrdersForSymbol
    private String sign(String secretKey, TreeMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (!first) sb.append('&');
            first = false;
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        return hmacSha256(secretKey, sb.toString());
    }

    // [용도] 파라미터 맵으로 쿼리스트링 생성 / [호출] fetchSymbols, fetchOrdersForSymbol
    private String buildQuery(TreeMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (!first) sb.append('&');
            first = false;
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        return sb.toString();
    }

    // [용도] HMAC-SHA256 계산 후 소문자 hex 반환 / [호출] sign()
    private String hmacSha256(String secretKey, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("BingX 서명 생성 실패", e);
        }
    }

    // [용도] 현재 Unix 타임스탬프(ms) 반환 / [호출] 서명 파라미터
    private long ts() {
        return Instant.now().toEpochMilli();
    }

    // BingX 주문 원본 DTO
    public static class BingxOrder {
        public long       orderId;
        public String     symbol;
        public String     side;         // "BUY" | "SELL"
        public BigDecimal executedQty;
        public BigDecimal avgPrice;
        public BigDecimal fee;
        public long       updateTime;   // Unix ms
    }

    // [용도] 정규화된 거래 DTO / [호출] TradeService
    public record NormalizedTrade(
            String        exchangeTradeId,
            String        symbol,
            TradeSide     side,
            BigDecimal    qty,
            BigDecimal    price,
            BigDecimal    fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(BingxOrder o) {
            TradeSide side = "BUY".equalsIgnoreCase(o.side) ? TradeSide.BUY : TradeSide.SELL;
            LocalDateTime tradedAt = Instant.ofEpochMilli(o.updateTime)
                    .atZone(ZoneId.of("Asia/Seoul")).toLocalDateTime();
            return new NormalizedTrade(
                    String.valueOf(o.orderId),
                    o.symbol,
                    side,
                    o.executedQty,
                    o.avgPrice,
                    o.fee,
                    tradedAt
            );
        }

        public boolean isValid() {
            return qty != null && qty.compareTo(BigDecimal.ZERO) > 0
                    && price != null && price.compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
