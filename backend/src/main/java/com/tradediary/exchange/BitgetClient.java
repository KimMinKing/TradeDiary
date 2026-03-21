// [파일 용도] Bitget REST API 호출 클라이언트 (V2 Classic Account)

package com.tradediary.exchange;

import com.google.gson.Gson;
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

// [클래스] Bitget V2 /api/v2/mix/order/fills API 호출 (Classic Account, 90일 슬라이딩 윈도우)
@Slf4j
@Component
public class BitgetClient {

    private static final String BASE_URL = "https://api.bitget.com";
    // V2 Classic Account: USDT 선물
    private static final String PRODUCT_TYPE = "USDT-FUTURES";
    private static final int PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] Bitget 선물 체결 내역 전체 조회 (90일 슬라이딩 윈도우) / [호출] TradeService.syncBitgetTrades()
    // startTime: 초기 동기화 = 1년 전, 증분 동기화 = DB 마지막 거래 시각
    public List<BitgetOrder> getOrders(String apiKey, String secretKey, String passphrase, LocalDateTime startTime) {
        log.info("[Bitget] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        // Bitget 최대 조회 범위: 90일
        LocalDateTime cutoff = now.minusDays(90);
        if (startTime.isBefore(cutoff)) {
            startTime = cutoff;
            log.info("[Bitget] startTime을 90일 전으로 조정: {}", startTime);
        }

        List<BitgetOrder> result = new ArrayList<>();
        LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);

        while (windowStart.isBefore(now)) {
            // 7일 슬라이딩 윈도우 (API rate limit 고려)
            LocalDateTime windowEnd = windowStart.plusDays(7);
            if (windowEnd.isAfter(now)) windowEnd = now;

            long startMs = toEpochMilli(windowStart);
            long endMs = toEpochMilli(windowEnd);

            String idLessThan = null;

            while (true) {
                BitgetOrderPage page;
                try {
                    page = fetchPage(apiKey, secretKey, passphrase, startMs, endMs, idLessThan);
                } catch (RuntimeException e) {
                    log.error("[Bitget] 동기화 중단: {}", e.getMessage());
                    return result;
                }

                if (page == null || page.orders().isEmpty()) break;

                result.addAll(page.orders());

                if (page.endId() == null || page.endId().isBlank()) break;

                idLessThan = page.endId();
                try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
            }

            windowStart = windowEnd;
            try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
        }

        log.info("[Bitget] 전체 조회 완료: {}건", result.size());
        return result;
    }

    // [용도] 단일 페이지 API 호출 (V2 fills) / [호출] getOrders()
    private BitgetOrderPage fetchPage(String apiKey, String secretKey, String passphrase,
                                      long startMs, long endMs, String idLessThan) {
        StringBuilder qs = new StringBuilder();
        qs.append("productType=").append(PRODUCT_TYPE);
        qs.append("&startTime=").append(startMs);
        qs.append("&endTime=").append(endMs);
        qs.append("&limit=").append(PAGE_SIZE);
        if (idLessThan != null && !idLessThan.isBlank()) {
            qs.append("&idLessThan=").append(idLessThan);
        }

        String requestPath = "/api/v2/mix/order/fills";
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
            // 디버깅용: 응답 바디 전체 로그 (오류 발생 시 필드명 확인용)
            log.info("[Bitget] HTTP {}, body: {}",
                    response.code(), body.length() > 500 ? body.substring(0, 500) + "..." : body);

            JsonObject json = gson.fromJson(body, JsonObject.class);
            String code = json.has("code") ? json.get("code").getAsString() : "";

            if (!"00000".equals(code)) {
                String msg = json.has("msg") ? json.get("msg").getAsString() : "알 수 없는 오류";
                log.error("[Bitget] API 오류: code={}, msg={}", code, msg);
                throw new RuntimeException("Bitget API 오류 (code=" + code + "): " + msg);
            }

            JsonObject data = json.getAsJsonObject("data");

            // endId: 다음 페이지 커서 (idLessThan으로 사용)
            String endId = data.has("endId") && !data.get("endId").isJsonNull()
                    ? data.get("endId").getAsString() : null;

            List<BitgetOrder> orders = new ArrayList<>();
            // list 또는 fillList 키로 응답 가능
            String listKey = data.has("fillList") ? "fillList"
                    : data.has("list") ? "list" : null;

            if (listKey != null && !data.get(listKey).isJsonNull()) {
                for (var elem : data.getAsJsonArray(listKey)) {
                    JsonObject o = elem.getAsJsonObject();

                    // 체결 수량이 0이면 제외
                    String qtyStr = firstNonNull(o, "baseVolume", "size", "qty");
                    if (qtyStr == null || new BigDecimal(qtyStr).compareTo(BigDecimal.ZERO) == 0) continue;

                    String priceStr = firstNonNull(o, "price", "fillPrice", "priceAvg");
                    if (priceStr == null) continue;

                    BitgetOrder order = new BitgetOrder();
                    order.orderId   = getStr(o, "orderId");
                    order.tradeId   = firstNonNull(o, "tradeId", "fillId");
                    order.symbol    = getStr(o, "symbol");
                    order.side      = getStr(o, "side");      // buy(롱관련) / sell(숏관련)
                    order.tradeSide = getStr(o, "tradeSide"); // open(진입) / close(청산)
                    order.filledQty = qtyStr;
                    order.priceAvg  = priceStr;
                    order.fee       = extractFee(o);
                    order.cTime     = firstNonNull(o, "cTime", "createdTime", "uTime");
                    if (order.orderId == null || order.cTime == null) continue;
                    orders.add(order);
                }
            }

            // 같은 orderId의 부분 체결(fill)을 하나의 주문으로 합산
            List<BitgetOrder> merged = mergeFills(orders);
            return new BitgetOrderPage(merged, endId);

        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            log.error("[Bitget] 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    // [용도] 여러 후보 키 중 첫 번째 non-null 값 반환 / [호출] fetchPage()
    private String firstNonNull(JsonObject obj, String... keys) {
        for (String key : keys) {
            String val = getStr(obj, key);
            if (val != null) return val;
        }
        return null;
    }

    // [용도] fee 추출 (단일 필드 또는 feeDetail 배열) / [호출] fetchPage()
    private String extractFee(JsonObject order) {
        // feeDetail 배열 방식
        if (order.has("feeDetail") && !order.get("feeDetail").isJsonNull()) {
            BigDecimal total = BigDecimal.ZERO;
            for (var elem : order.getAsJsonArray("feeDetail")) {
                JsonObject feeObj = elem.getAsJsonObject();
                // V2 fills: feeDetail[].totalFee 사용 (fee 키는 없음)
                String feeKey = feeObj.has("totalFee") ? "totalFee"
                        : feeObj.has("fee") ? "fee" : null;
                if (feeKey != null && !feeObj.get(feeKey).isJsonNull()) {
                    total = total.add(new BigDecimal(feeObj.get(feeKey).getAsString()).abs());
                }
            }
            if (total.compareTo(BigDecimal.ZERO) > 0) return total.toPlainString();
        }
        // 단일 fee 필드 방식
        String fee = firstNonNull(order, "fee", "totalFee", "tradeFee");
        return fee != null ? new BigDecimal(fee).abs().toPlainString() : "0";
    }

    // [용도] 같은 orderId의 부분 체결을 하나로 합산 (qty 합산, 가중평균 가격, fee 합산) / [호출] fetchPage()
    private List<BitgetOrder> mergeFills(List<BitgetOrder> fills) {
        // orderId 순서 보존을 위해 LinkedHashMap 사용
        java.util.LinkedHashMap<String, BitgetOrder> map = new java.util.LinkedHashMap<>();
        java.util.Map<String, BigDecimal> totalQtyMap = new java.util.HashMap<>();

        for (BitgetOrder fill : fills) {
            String key = fill.orderId;
            if (!map.containsKey(key)) {
                // 첫 fill → 그대로 등록 (tradeId 대신 orderId를 exchangeTradeId로 사용)
                BitgetOrder merged = new BitgetOrder();
                merged.orderId   = fill.orderId;
                merged.tradeId   = fill.orderId; // exchangeTradeId = orderId
                merged.symbol    = fill.symbol;
                merged.side      = fill.side;
                merged.tradeSide = fill.tradeSide;
                merged.filledQty = fill.filledQty;
                merged.priceAvg  = fill.priceAvg;
                merged.fee       = fill.fee;
                merged.cTime     = fill.cTime;
                map.put(key, merged);
                totalQtyMap.put(key, new BigDecimal(fill.filledQty));
            } else {
                // 추가 fill → qty 합산, 가중평균 가격, fee 합산
                BitgetOrder base = map.get(key);
                BigDecimal prevQty   = totalQtyMap.get(key);
                BigDecimal addQty    = new BigDecimal(fill.filledQty);
                BigDecimal prevPrice = new BigDecimal(base.priceAvg);
                BigDecimal addPrice  = new BigDecimal(fill.priceAvg);
                BigDecimal newQty    = prevQty.add(addQty);

                // 가중평균 가격
                BigDecimal newPrice = prevPrice.multiply(prevQty)
                        .add(addPrice.multiply(addQty))
                        .divide(newQty, 8, java.math.RoundingMode.HALF_UP);

                base.filledQty = newQty.toPlainString();
                base.priceAvg  = newPrice.toPlainString();
                base.fee = new BigDecimal(base.fee != null ? base.fee : "0")
                        .add(new BigDecimal(fill.fee != null ? fill.fee : "0"))
                        .toPlainString();
                totalQtyMap.put(key, newQty);
                log.info("[Bitget MERGE] orderId={} fill합산 qty={}", key, newQty);
            }
        }
        return new java.util.ArrayList<>(map.values());
    }

    // [용도] HMAC-SHA256 + Base64 서명 생성 / [호출] fetchPage()
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

    // Bitget 체결 응답 DTO
    public static class BitgetOrder {
        public String orderId;    // 주문 ID (부분 체결 합산 기준)
        public String tradeId;    // exchangeTradeId로 사용 (합산 후 = orderId)
        public String symbol;
        public String side;       // buy(롱관련) / sell(숏관련)
        public String tradeSide;  // open(진입) / close(청산)
        public String filledQty;
        public String priceAvg;
        public String fee;
        public String cTime;
    }

    // 페이지 조회 결과 (내부용)
    private record BitgetOrderPage(List<BitgetOrder> orders, String endId) {}

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
                    order.tradeId != null ? order.tradeId : order.orderId,
                    order.symbol,
                    mapSide(order.side, order.tradeSide),
                    new BigDecimal(order.filledQty != null ? order.filledQty : "0"),
                    new BigDecimal(order.priceAvg != null ? order.priceAvg : "0"),
                    new BigDecimal(order.fee != null ? order.fee : "0"),
                    LocalDateTime.ofInstant(
                            Instant.ofEpochMilli(Long.parseLong(order.cTime)),
                            ZoneId.of("Asia/Seoul"))
            );
        }

        // [용도] Bitget side + tradeSide → TradeSide 변환
        // side: buy=롱관련, sell=숏관련
        // tradeSide: open=진입, close=청산
        // buy+open=롱오픈→BUY / buy+close=롱청산→SELL
        // sell+open=숏오픈→SELL / sell+close=숏청산→BUY
        private static com.tradediary.trade.TradeSide mapSide(String side, String tradeSide) {
            if (side == null) return com.tradediary.trade.TradeSide.BUY;
            boolean isSell  = side.toLowerCase().contains("sell");
            boolean isClose = "close".equalsIgnoreCase(tradeSide);
            // open+buy=BUY, open+sell=SELL, close+buy=SELL, close+sell=BUY
            if (isSell ^ isClose) return com.tradediary.trade.TradeSide.SELL;
            return com.tradediary.trade.TradeSide.BUY;
        }

        // [용도] 저장 가능한 주문인지 확인 / [호출] TradeService.syncBitgetTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
