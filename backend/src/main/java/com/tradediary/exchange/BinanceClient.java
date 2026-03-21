// [파일 용도] Binance USDT-M 선물 REST API 호출 클라이언트

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

// [클래스] Binance USDT-M 선물 /fapi/v1/income + /fapi/v1/userTrades API 호출
// 1단계: income 조회로 거래된 심볼 목록 수집
// 2단계: 심볼별 userTrades 조회로 체결 내역 수집
@Slf4j
@Component
public class BinanceClient {

    private static final String BASE_URL  = "https://fapi.binance.com";
    private static final int    PAGE_SIZE = 1000;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
    private final Gson gson = new Gson();

    // [용도] 선물 체결 내역 전체 조회 / [호출] TradeService.syncBinanceTrades()
    // 1) income 엔드포인트로 거래된 심볼 파악
    // 2) 심볼별 userTrades 조회 및 합산
    public List<BinanceTrade> getTrades(String apiKey, String secretKey, LocalDateTime startTime) {
        log.info("[Binance] API Key 앞 6자리: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : apiKey);

        long startMs = startTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();

        // 1단계: income 조회로 거래된 심볼 수집
        Set<String> symbols = fetchTradedSymbols(apiKey, secretKey, startMs);
        log.info("[Binance] 거래된 심볼 수: {}개 → {}", symbols.size(), symbols);

        // 2단계: 심볼별 거래 내역 조회
        List<BinanceTrade> allTrades = new ArrayList<>();
        for (String symbol : symbols) {
            List<BinanceTrade> trades = fetchTradesForSymbol(apiKey, secretKey, symbol, startMs);
            log.info("[Binance] 심볼={} 거래 {}건", symbol, trades.size());
            allTrades.addAll(trades);
        }

        // 시간순 정렬
        allTrades.sort(Comparator.comparingLong(t -> t.time));
        log.info("[Binance] 전체 조회 완료: {}건", allTrades.size());
        return allTrades;
    }

    // [용도] income 엔드포인트로 거래된 심볼 목록 수집 / [호출] getTrades()
    private Set<String> fetchTradedSymbols(String apiKey, String secretKey, long startMs) {
        Set<String> symbols = new LinkedHashSet<>();
        long cursorMs = startMs;

        while (true) {
            String params = "startTime=" + cursorMs + "&limit=" + PAGE_SIZE;
            String url = BASE_URL + "/fapi/v1/income?" + params + "&timestamp=" + ts() + "&signature=";
            // 재조합 (timestamp 고정 필요)
            long timestamp = ts();
            String queryString = params + "&timestamp=" + timestamp;
            String sig = sign(secretKey, queryString);
            String fullUrl = BASE_URL + "/fapi/v1/income?" + queryString + "&signature=" + sig;

            Request req = new Request.Builder()
                    .url(fullUrl)
                    .header("X-MBX-APIKEY", apiKey)
                    .get().build();

            try (Response resp = httpClient.newCall(req).execute()) {
                String body = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    log.warn("[Binance] income 오류: {} {}", resp.code(), body);
                    break;
                }
                JsonArray arr = gson.fromJson(body, JsonArray.class);
                if (arr == null || arr.size() == 0) break;

                for (JsonElement el : arr) {
                    JsonObject obj = el.getAsJsonObject();
                    if (obj.has("symbol") && !obj.get("symbol").isJsonNull()) {
                        String sym = obj.get("symbol").getAsString();
                        if (!sym.isBlank()) symbols.add(sym);
                    }
                }

                if (arr.size() < PAGE_SIZE) break; // 마지막 페이지

                // 다음 페이지: 마지막 레코드 time + 1ms
                JsonObject last = arr.get(arr.size() - 1).getAsJsonObject();
                cursorMs = last.get("time").getAsLong() + 1;

            } catch (Exception e) {
                log.error("[Binance] income 조회 실패", e);
                break;
            }
        }
        return symbols;
    }

    // [용도] 심볼별 userTrades 조회 (페이지네이션) / [호출] getTrades()
    private List<BinanceTrade> fetchTradesForSymbol(String apiKey, String secretKey, String symbol, long startMs) {
        List<BinanceTrade> result = new ArrayList<>();
        Long fromId = null;

        while (true) {
            String params = "symbol=" + symbol + "&startTime=" + startMs + "&limit=" + PAGE_SIZE
                    + (fromId != null ? "&fromId=" + fromId : "");
            long timestamp = ts();
            String queryString = params + "&timestamp=" + timestamp;
            String sig = sign(secretKey, queryString);
            String fullUrl = BASE_URL + "/fapi/v1/userTrades?" + queryString + "&signature=" + sig;

            Request req = new Request.Builder()
                    .url(fullUrl)
                    .header("X-MBX-APIKEY", apiKey)
                    .get().build();

            try (Response resp = httpClient.newCall(req).execute()) {
                String body = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    log.warn("[Binance] userTrades 오류 symbol={}: {} {}", symbol, resp.code(), body);
                    break;
                }
                JsonArray arr = gson.fromJson(body, JsonArray.class);
                if (arr == null || arr.size() == 0) break;

                for (JsonElement el : arr) {
                    JsonObject obj = el.getAsJsonObject();
                    try {
                        BinanceTrade t = new BinanceTrade();
                        t.id     = obj.get("id").getAsLong();
                        t.symbol = obj.get("symbol").getAsString();
                        t.side   = obj.get("side").getAsString();   // BUY | SELL
                        t.qty    = new BigDecimal(obj.get("qty").getAsString());
                        t.price  = new BigDecimal(obj.get("price").getAsString());
                        // commission은 음수일 수 있음 → 절댓값
                        t.commission = new BigDecimal(obj.get("commission").getAsString()).abs();
                        t.time   = obj.get("time").getAsLong();
                        result.add(t);
                    } catch (Exception e) {
                        log.warn("[Binance] trade 파싱 실패: {}", obj);
                    }
                }

                if (arr.size() < PAGE_SIZE) break;

                // 다음 페이지: 마지막 id + 1
                fromId = arr.get(arr.size() - 1).getAsJsonObject().get("id").getAsLong() + 1;

            } catch (Exception e) {
                log.error("[Binance] userTrades 조회 실패 symbol={}", symbol, e);
                break;
            }
        }
        return result;
    }

    // [용도] HMAC-SHA256 서명 생성 / [호출] fetchTradedSymbols, fetchTradesForSymbol
    private String sign(String secretKey, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Binance 서명 생성 실패", e);
        }
    }

    // [용도] 현재 Unix 타임스탬프(ms) 반환 / [호출] 서명 파라미터
    private long ts() {
        return Instant.now().toEpochMilli();
    }

    // Binance 체결 내역 원본 DTO
    public static class BinanceTrade {
        public long       id;
        public String     symbol;
        public String     side;         // "BUY" | "SELL"
        public BigDecimal qty;
        public BigDecimal price;
        public BigDecimal commission;
        public long       time;         // Unix ms
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
        public static NormalizedTrade from(BinanceTrade t) {
            TradeSide side = "BUY".equalsIgnoreCase(t.side) ? TradeSide.BUY : TradeSide.SELL;
            LocalDateTime tradedAt = Instant.ofEpochMilli(t.time)
                    .atZone(ZoneId.of("Asia/Seoul")).toLocalDateTime();
            return new NormalizedTrade(
                    String.valueOf(t.id),
                    t.symbol,
                    side,
                    t.qty,
                    t.price,
                    t.commission,
                    tradedAt
            );
        }

        public boolean isValid() {
            return qty != null && qty.compareTo(BigDecimal.ZERO) > 0
                    && price != null && price.compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
