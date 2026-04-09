// [파일 용도] OKX REST API 호출 클라이언트 (V5)

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

// [클래스] OKX V5 /api/v5/trade/orders-history-archive API 호출 (최대 3개월)
@Slf4j
@Component
public class OkxClient {

    private static final String BASE_URL = "https://www.okx.com";
    private static final String PATH     = "/api/v5/trade/orders-history-archive";
    private static final int    PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] OKX 선물 체결 내역 전체 조회 (SWAP + FUTURES) / [호출] TradeService.syncOkxTrades()
    // startTime: 초기 동기화 = 90일 전, 증분 동기화 = DB 마지막 거래 시각
    public List<OkxOrder> getOrders(String apiKey, String secretKey, String passphrase, LocalDateTime startTime) {
        log.info("[OKX] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        LocalDateTime cutoff = now.minusDays(90);
        if (startTime.isBefore(cutoff)) {
            startTime = cutoff;
            log.info("[OKX] startTime을 90일 전으로 조정: {}", startTime);
        }

        long beginMs = startTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
        List<OkxOrder> result = new ArrayList<>();

        // SWAP(영구선물)과 FUTURES(기한부) 모두 조회
        for (String instType : List.of("SWAP", "FUTURES")) {
            result.addAll(fetchAllPages(apiKey, secretKey, passphrase, instType, beginMs));
        }

        log.info("[OKX] 전체 조회 완료: {}건", result.size());
        return result;
    }

    // [용도] 단일 instType 전체 페이지 순회 조회 / [호출] getOrders()
    private List<OkxOrder> fetchAllPages(String apiKey, String secretKey, String passphrase,
                                         String instType, long beginMs) {
        List<OkxOrder> result = new ArrayList<>();
        String after = null; // 이전 페이지 마지막 ordId (오래된 데이터 요청용 커서)

        while (true) {
            List<OkxOrder> page;
            try {
                page = fetchPage(apiKey, secretKey, passphrase, instType, beginMs, after);
            } catch (RuntimeException e) {
                log.error("[OKX] {} 동기화 중단: {}", instType, e.getMessage());
                break;
            }

            if (page == null || page.isEmpty()) break;
            result.addAll(page);

            if (page.size() < PAGE_SIZE) break; // 마지막 페이지

            // 다음 페이지 커서: 현재 페이지 마지막 항목의 ordId
            after = page.get(page.size() - 1).orderId;
            try { TimeUnit.MILLISECONDS.sleep(100); } catch (InterruptedException ignored) {}
        }

        return result;
    }

    // [용도] 단일 페이지 API 호출 / [호출] fetchAllPages()
    private List<OkxOrder> fetchPage(String apiKey, String secretKey, String passphrase,
                                     String instType, long beginMs, String after) {
        StringBuilder qs = new StringBuilder();
        qs.append("instType=").append(instType);
        qs.append("&state=filled");
        qs.append("&begin=").append(beginMs);
        qs.append("&limit=").append(PAGE_SIZE);
        if (after != null && !after.isBlank()) {
            qs.append("&after=").append(after);
        }

        // OKX GET 요청: requestPath = path + "?" + queryString
        String requestPath = PATH + "?" + qs;
        // OKX 타임스탬프: ISO 8601 UTC (밀리초 단위), 예: 2020-12-08T09:08:57.715Z
        String timestamp = Instant.now().truncatedTo(ChronoUnit.MILLIS).toString();
        String signature = sign(secretKey, timestamp, "GET", requestPath, "");

        Request request = new Request.Builder()
                .url(BASE_URL + requestPath)
                .get()
                .addHeader("OK-ACCESS-KEY", apiKey)
                .addHeader("OK-ACCESS-SIGN", signature)
                .addHeader("OK-ACCESS-TIMESTAMP", timestamp)
                .addHeader("OK-ACCESS-PASSPHRASE", passphrase)
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body().string();
            log.info("[OKX] HTTP {}, body: {}", response.code(),
                    body.length() > 500 ? body.substring(0, 500) + "..." : body);

            JsonObject json = gson.fromJson(body, JsonObject.class);
            String code = json.has("code") ? json.get("code").getAsString() : "";

            if (!"0".equals(code)) {
                String msg = json.has("msg") ? json.get("msg").getAsString() : "알 수 없는 오류";
                log.error("[OKX] API 오류: code={}, msg={}", code, msg);
                throw new RuntimeException("OKX API 오류 (code=" + code + "): " + msg);
            }

            JsonArray dataArr = json.has("data") && !json.get("data").isJsonNull()
                    ? json.getAsJsonArray("data") : new JsonArray();

            List<OkxOrder> orders = new ArrayList<>();
            for (var elem : dataArr) {
                JsonObject o = elem.getAsJsonObject();

                // 체결 수량 확인
                String qtyStr = getStr(o, "accFillSz");
                if (qtyStr == null || new BigDecimal(qtyStr).compareTo(BigDecimal.ZERO) == 0) continue;

                String avgPx = getStr(o, "avgPx");
                if (avgPx == null || avgPx.isBlank() || "0".equals(avgPx)) continue;

                OkxOrder order = new OkxOrder();
                order.orderId = getStr(o, "ordId");
                order.instId  = getStr(o, "instId");   // 예: BTC-USDT-SWAP
                order.side    = getStr(o, "side");     // buy / sell
                order.qty     = qtyStr;
                order.price   = avgPx;
                order.fee     = extractFee(o);
                order.cTime   = getStr(o, "cTime");    // 밀리초 에포크

                if (order.orderId == null || order.cTime == null) continue;
                orders.add(order);
            }

            return orders;

        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            log.error("[OKX] 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    // [용도] fee 추출 (OKX fee는 음수이므로 절댓값 처리) / [호출] fetchPage()
    private String extractFee(JsonObject order) {
        String fee = getStr(order, "fee");
        if (fee == null || fee.isBlank()) return "0";
        try {
            return new BigDecimal(fee).abs().toPlainString();
        } catch (NumberFormatException e) {
            return "0";
        }
    }

    // [용도] HMAC-SHA256 + Base64 서명 생성 / [호출] fetchPage()
    // OKX 서명: timestamp + METHOD + requestPath(쿼리 포함) + body
    private String sign(String secretKey, String timestamp, String method,
                        String requestPath, String body) {
        try {
            String preHash = timestamp + method.toUpperCase() + requestPath + body;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(preHash.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("OKX 서명 생성 실패", e);
        }
    }

    private String getStr(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    // [용도] 현재 보유 자산 조회 (UNIFIED 계정) / [호출] BalanceService.getOkxBalance()
    public List<OkxBalance> getBalance(String apiKey, String secretKey, String passphrase) {
        String requestPath = "/api/v5/account/balance";
        String timestamp = Instant.now().truncatedTo(ChronoUnit.MILLIS).toString();
        String signature = sign(secretKey, timestamp, "GET", requestPath, "");

        Request request = new Request.Builder()
                .url(BASE_URL + requestPath)
                .get()
                .addHeader("OK-ACCESS-KEY", apiKey)
                .addHeader("OK-ACCESS-SIGN", signature)
                .addHeader("OK-ACCESS-TIMESTAMP", timestamp)
                .addHeader("OK-ACCESS-PASSPHRASE", passphrase != null ? passphrase : "")
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body().string();
            log.info("[OKX] 잔고 조회 status={}, body 앞 200자: {}",
                    response.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);

            JsonObject json = gson.fromJson(body, JsonObject.class);
            String code = json.has("code") ? json.get("code").getAsString() : "";
            if (!"0".equals(code)) {
                String msg = json.has("msg") ? json.get("msg").getAsString() : "";
                throw new RuntimeException("code=" + code + ": " + msg);
            }

            List<OkxBalance> balances = new ArrayList<>();
            if (json.has("data") && !json.get("data").isJsonNull()
                    && json.getAsJsonArray("data").size() > 0) {
                JsonObject account = json.getAsJsonArray("data").get(0).getAsJsonObject();
                if (account.has("details") && !account.get("details").isJsonNull()) {
                    for (var elem : account.getAsJsonArray("details")) {
                        JsonObject detail = elem.getAsJsonObject();
                        String eq = getStr(detail, "eq");
                        if (eq == null) continue;
                        try {
                            if (new BigDecimal(eq).compareTo(BigDecimal.ZERO) == 0) continue;
                        } catch (NumberFormatException ignored) { continue; }
                        OkxBalance b = new OkxBalance();
                        b.currency = getStr(detail, "ccy");
                        b.available = getStr(detail, "availEq");
                        b.frozen = getStr(detail, "frozenBal");
                        b.usdValue = getStr(detail, "eqUsd");
                        balances.add(b);
                    }
                }
            }
            return balances;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    // OKX 잔고 응답 DTO
    public static class OkxBalance {
        public String currency;
        public String available;
        public String frozen;
        public String usdValue;
    }

    // OKX 주문 응답 DTO
    public static class OkxOrder {
        public String orderId;  // ordId
        public String instId;   // 예: BTC-USDT-SWAP
        public String side;     // buy / sell
        public String qty;      // accFillSz (체결 수량)
        public String price;    // avgPx (평균 체결가)
        public String fee;      // fee 절댓값
        public String cTime;    // 생성 시각 (밀리초 에포크)
    }

    // [용도] OkxOrder를 공통 형식으로 변환 / [호출] TradeService.syncOkxTrades()
    public record NormalizedTrade(
            String exchangeTradeId,
            String symbol,
            com.tradediary.trade.TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            BigDecimal fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(OkxOrder order) {
            return new NormalizedTrade(
                    order.orderId,
                    order.instId,
                    mapSide(order.side),
                    new BigDecimal(order.qty  != null ? order.qty  : "0"),
                    new BigDecimal(order.price != null ? order.price : "0"),
                    new BigDecimal(order.fee  != null ? order.fee  : "0"),
                    LocalDateTime.ofInstant(
                            Instant.ofEpochMilli(Long.parseLong(order.cTime)),
                            ZoneId.of("Asia/Seoul"))
            );
        }

        // [용도] OKX side → TradeSide 변환
        // buy=BUY, sell=SELL (hedge/net 모드 모두 side 필드로 충분)
        private static com.tradediary.trade.TradeSide mapSide(String side) {
            if (side == null) return com.tradediary.trade.TradeSide.BUY;
            return "sell".equalsIgnoreCase(side)
                    ? com.tradediary.trade.TradeSide.SELL
                    : com.tradediary.trade.TradeSide.BUY;
        }

        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
