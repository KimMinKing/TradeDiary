// [파일 용도] Bybit REST API 호출 클라이언트

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import com.tradediary.trade.TradeSide;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

// [클래스] Bybit /v5/execution/list API 호출 (7일 슬라이딩 윈도우 방식)
@Slf4j
@Component
public class BybitClient {

    private static final String RECV_WINDOW    = "10000";
    // 로컬 시계가 Bybit 서버보다 약간 앞서는 경우 10002 오류 방지 (500ms 보정)
    private static final long   TIMESTAMP_OFFSET = 500L;
    // 각 카테고리별로 거래 내역 조회 (spot=현물, linear=USDT선물, inverse=코인선물)
    private static final String[] CATEGORIES = {"linear", "inverse"};

    @Value("${bybit.base-url:https://api.bybit.com}")
    private String baseUrl;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] 체결 내역 전체 조회 (3개 카테고리 병렬 × 7일 슬라이딩 윈도우) / [호출] TradeService.syncBybitTrades()
    // startTime: 초기 동기화 = 1년 전, 증분 동기화 = DB 마지막 거래 시각
    public List<BybitExecution> getExecutions(String apiKey, String secretKey, LocalDateTime startTime) {
        // 시스템 기본 시간대(Docker = UTC)에 의존하지 않고 KST 기준으로 명시
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul"));

        // spot / linear / inverse 3개 카테고리 병렬 조회 (순차 대비 ~3배 빠름)
        List<CompletableFuture<List<BybitExecution>>> futures = Arrays.stream(CATEGORIES)
                .map(category -> CompletableFuture.supplyAsync(() ->
                        fetchCategory(apiKey, secretKey, category, startTime, now)))
                .collect(Collectors.toList());

        return futures.stream()
                .flatMap(f -> f.join().stream())
                .collect(Collectors.toList());
    }

    // [용도] 특정 카테고리의 7일 슬라이딩 윈도우 조회 / [호출] getExecutions()
    private List<BybitExecution> fetchCategory(String apiKey, String secretKey,
                                                String category, LocalDateTime startTime, LocalDateTime now) {
        List<BybitExecution> result = new ArrayList<>();
        LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);

        while (windowStart.isBefore(now)) {
            LocalDateTime windowEnd = windowStart.plusDays(7);
            if (windowEnd.isAfter(now)) windowEnd = now;

            long startMs = toEpochMilli(windowStart);
            long endMs = toEpochMilli(windowEnd);

            // 같은 윈도우 내 커서 페이지네이션
            String cursor = null;
            do {
                BybitExecutionPage page = fetchPage(apiKey, secretKey, category, startMs, endMs, cursor);
                result.addAll(page.executions);
                cursor = page.nextCursor;

                if (cursor != null && !cursor.isEmpty()) {
                    try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
                }
            } while (cursor != null && !cursor.isEmpty());
            windowStart = windowEnd;
            try { TimeUnit.MILLISECONDS.sleep(50); } catch (InterruptedException ignored) {}
        }
        return result;
    }

    // [용도] 단일 페이지 API 호출 / [호출] fetchCategory()
    private BybitExecutionPage fetchPage(String apiKey, String secretKey,
                                          String category, long startMs, long endMs, String cursor) {
        StringBuilder qs = new StringBuilder();
        qs.append("category=").append(category);
        qs.append("&execType=Trade");
        qs.append("&startTime=").append(startMs);
        qs.append("&endTime=").append(endMs);
        qs.append("&limit=100");
        if (cursor != null && !cursor.isEmpty()) {
            qs.append("&cursor=").append(cursor);
        }

        String queryString = qs.toString();
        String timestamp = String.valueOf(System.currentTimeMillis() - TIMESTAMP_OFFSET);
        String signature = sign(apiKey, secretKey, timestamp, queryString);

        Request request = new Request.Builder()
                .url(baseUrl + "/v5/execution/list?" + queryString)
                .get()
                .addHeader("X-BAPI-API-KEY", apiKey)
                .addHeader("X-BAPI-SIGN", signature)
                .addHeader("X-BAPI-SIGN-TYPE", "2")
                .addHeader("X-BAPI-TIMESTAMP", timestamp)
                .addHeader("X-BAPI-RECV-WINDOW", RECV_WINDOW)
                .addHeader("Accept", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            log.debug("[Bybit] status={}, body 앞 200자: {}",
                    response.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);

            if (!response.isSuccessful()) {
                String traceId = response.header("Traceid");
                if (response.code() == 401) {
                    throw new RuntimeException("HTTP 401: Bybit authentication failed"
                            + " (possible causes: wrong key/secret, expired or revoked key, IP whitelist mismatch, demo key used against mainnet)"
                            + (traceId != null ? ", traceId=" + traceId : ""));
                }
                throw new RuntimeException("HTTP " + response.code() + ": " + body
                        + (traceId != null ? " (traceId=" + traceId + ")" : ""));
            }
            if (body.isBlank()) {
                throw new RuntimeException("empty response body");
            }

            JsonObject json = gson.fromJson(body, JsonObject.class);
            if (json == null || !json.has("retCode")) {
                throw new RuntimeException("invalid json response: " + body);
            }
            int retCode = json.get("retCode").getAsInt();

            if (retCode != 0) {
                String retMsg = json.get("retMsg").getAsString();
                log.error("[Bybit] API 오류 category={}: retCode={}, msg={}", category, retCode, retMsg);
                // IP 차단, 인증 실패 등 모든 API 오류 시 예외를 던져 동기화 즉시 중단
                throw new RuntimeException("Bybit API 오류 (retCode=" + retCode + "): " + retMsg);
            }

            JsonObject resultObj = json.getAsJsonObject("result");
            String nextCursor = resultObj.has("nextPageCursor")
                    ? resultObj.get("nextPageCursor").getAsString() : "";

            List<BybitExecution> executions = new ArrayList<>();
            if (resultObj.has("list") && !resultObj.get("list").isJsonNull()) {
                for (var elem : resultObj.getAsJsonArray("list")) {
                    JsonObject exec = elem.getAsJsonObject();
                    BybitExecution e = new BybitExecution();
                    e.execId    = getStr(exec, "execId");
                    e.symbol    = getStr(exec, "symbol");
                    e.side      = getStr(exec, "side");
                    e.execQty   = getStr(exec, "execQty");
                    e.execPrice = getStr(exec, "execPrice");
                    e.execFee   = getStr(exec, "execFee");
                    e.execTime  = getStr(exec, "execTime");
                    e.execType  = getStr(exec, "execType");
                    e.category  = category;
                    executions.add(e);
                }
            }
            return new BybitExecutionPage(executions, nextCursor.isEmpty() ? null : nextCursor);

        } catch (RuntimeException e) {
            log.error("[Bybit] 호출 실패 category={}: {}", category, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("[Bybit] 호출 실패 category={}: {}", category, e.getMessage());
            throw new RuntimeException("Bybit execution request failed for " + category, e);
        }
    }

    // [용도] HMAC-SHA256 서명 생성 / [호출] fetchPage()
    // 서명 대상: timestamp + apiKey + recvWindow + queryString
    private String sign(String apiKey, String secretKey, String timestamp, String queryString) {
        try {
            String message = timestamp + apiKey + RECV_WINDOW + queryString;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(message.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Bybit 서명 생성 실패", e);
        }
    }

    // [용도] LocalDateTime → 밀리초 에포크 변환 / [호출] fetchCategory()
    private long toEpochMilli(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
    }

    private String getStr(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    // [용도] 현재 보유 자산 조회 (UNIFIED 계정) / [호출] BalanceService.getBybitBalance()
    public List<BybitBalance> getBalance(String apiKey, String secretKey) {
        String queryString = "accountType=UNIFIED";
        String timestamp = String.valueOf(System.currentTimeMillis() - TIMESTAMP_OFFSET);
        String signature = sign(apiKey, secretKey, timestamp, queryString);

        Request request = new Request.Builder()
                .url(baseUrl + "/v5/account/wallet-balance?" + queryString)
                .get()
                .addHeader("X-BAPI-API-KEY", apiKey)
                .addHeader("X-BAPI-SIGN", signature)
                .addHeader("X-BAPI-SIGN-TYPE", "2")
                .addHeader("X-BAPI-TIMESTAMP", timestamp)
                .addHeader("X-BAPI-RECV-WINDOW", RECV_WINDOW)
                .addHeader("Accept", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body().string();
            log.info("[Bybit] 잔고 조회 status={}, body 앞 200자: {}",
                    response.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);

            JsonObject json = gson.fromJson(body, JsonObject.class);
            int retCode = json.get("retCode").getAsInt();
            if (retCode != 0) {
                throw new RuntimeException("retCode=" + retCode + ": " + json.get("retMsg").getAsString());
            }

            List<BybitBalance> balances = new ArrayList<>();
            JsonObject result = json.getAsJsonObject("result");
            if (result.has("list") && result.getAsJsonArray("list").size() > 0) {
                JsonObject account = result.getAsJsonArray("list").get(0).getAsJsonObject();
                String totalAvailableBalance = getStr(account, "totalAvailableBalance");
                String totalWalletBalance = getStr(account, "totalWalletBalance");
                String totalMarginBalance = getStr(account, "totalMarginBalance");
                if (account.has("coin") && !account.get("coin").isJsonNull()) {
                    for (var elem : account.getAsJsonArray("coin")) {
                        JsonObject coin = elem.getAsJsonObject();
                        String walletBalance = getStr(coin, "walletBalance");
                        if (walletBalance == null) continue;
                        try {
                            if (new BigDecimal(walletBalance).compareTo(BigDecimal.ZERO) == 0) continue;
                        } catch (NumberFormatException ignored) { continue; }
                        BybitBalance b = new BybitBalance();
                        b.coin = getStr(coin, "coin");
                        b.walletBalance = walletBalance;
                        b.equity = getStr(coin, "equity");
                        b.availableToWithdraw = getStr(coin, "availableToWithdraw");
                        b.totalOrderIM = getStr(coin, "totalOrderIM");
                        b.totalPositionIM = getStr(coin, "totalPositionIM");
                        b.locked = getStr(coin, "locked");
                        b.bonus = getStr(coin, "bonus");
                        b.usdValue = getStr(coin, "usdValue");
                        b.totalAvailableBalance = totalAvailableBalance;
                        b.totalWalletBalance = totalWalletBalance;
                        b.totalMarginBalance = totalMarginBalance;
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

    // [용도] 티커 정보 조회 / [호출] MarketController.getCurrentPrice()
    public Map<String, Object> getTicker(String category, String symbol) {
        try {
            String timestamp = String.valueOf(System.currentTimeMillis() - TIMESTAMP_OFFSET);
            String queryString = "category=" + category;
            if (symbol != null && !symbol.isEmpty()) {
                queryString += "&symbol=" + symbol;
            }
            String signature = sign("", "", timestamp, queryString);

            Request request = new Request.Builder()
                    .url(baseUrl + "/v5/market/tickers?" + queryString)
                    .get()
                    .addHeader("X-BAPI-API-KEY", "") // 티커 조회는 인증 필요 없음
                    .addHeader("X-BAPI-SIGN", signature)
                    .addHeader("X-BAPI-TIMESTAMP", timestamp)
                    .addHeader("X-BAPI-RECV-WINDOW", RECV_WINDOW)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body().string();

                if (response.code() != 200) {
                    log.error("[Bybit] 티컈 조회 실패: category={}, symbol={}, status={}, body={}",
                            category, symbol, response.code(), body);
                    return null;
                }

                JsonObject json = gson.fromJson(body, JsonObject.class);
                int retCode = json.get("retCode").getAsInt();

                if (retCode != 0) {
                    log.error("[Bybit] 티커 API 오류: category={}, symbol={}, retCode={}, msg={}",
                            category, symbol, retCode, json.get("retMsg").getAsString());
                    return null;
                }

                JsonObject result = json.getAsJsonObject("result");
                if (!result.has("list") || result.get("list").getAsJsonArray().size() == 0) {
                    return null;
                }

                JsonObject ticker = result.get("list").getAsJsonArray().get(0).getAsJsonObject();
                Map<String, Object> data = new HashMap<>();

                data.put("symbol", symbol != null ? symbol : ticker.get("symbol").getAsString());
                data.put("lastPrice", ticker.get("lastPrice").getAsString());
                data.put("prevPrice24h", ticker.get("prevPrice24h").getAsString());
                data.put("price24hPcnt", ticker.get("price24hPcnt").getAsString());
                data.put("highPrice24h", ticker.get("highPrice24h").getAsString());
                data.put("lowPrice24h", ticker.get("lowPrice24h").getAsString());
                data.put("volume24h", ticker.get("volume24h").getAsString());
                data.put("turnover24h", ticker.get("turnover24h").getAsString());

                // 타임스탬프 (millisecond -> second)
                if (ticker.has("time")) {
                    data.put("timestamp", String.valueOf(Long.parseLong(ticker.get("time").getAsString()) / 1000));
                }

                return data;

            } catch (Exception e) {
                log.error("[Bybit] 티커 호출 실패: category={}, symbol={}, error={}",
                        category, symbol, e.getMessage());
                return null;
            }
        } catch (Exception e) {
            log.error("[Bybit] 티커 조회 실패: category={}, symbol={}, error={}",
                    category, symbol, e.getMessage());
            return null;
        }
    }

    // Bybit 잔고 응답 DTO
    public static class BybitBalance {
        public String coin;
        public String walletBalance;
        public String equity;
        public String availableToWithdraw;
        public String totalOrderIM;
        public String totalPositionIM;
        public String locked;
        public String bonus;
        public String usdValue;
        public String totalAvailableBalance;
        public String totalWalletBalance;
        public String totalMarginBalance;
    }

    // Bybit 체결 응답 DTO
    public static class BybitExecution {
        public String execId;
        public String symbol;
        public String side;      // Buy, Sell
        public String execQty;
        public String execPrice;
        public String execFee;
        public String execTime;  // 밀리초 타임스탬프 문자열
        public String execType;  // Trade, Funding 등
        public String category;  // spot, linear, inverse
    }

    // 페이지 조회 결과 (내부용)
    private record BybitExecutionPage(List<BybitExecution> executions, String nextCursor) {}

    // [용도] BybitExecution을 공통 형식으로 변환 / [호출] TradeService.syncBybitTrades()
    public record NormalizedTrade(
            String exchangeTradeId,
            String symbol,
            com.tradediary.trade.TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            BigDecimal fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(BybitExecution exec) {
            return new NormalizedTrade(
                    exec.execId,
                    exec.symbol,
                    "Buy".equals(exec.side)
                            ? com.tradediary.trade.TradeSide.BUY
                            : com.tradediary.trade.TradeSide.SELL,
                    new BigDecimal(exec.execQty != null ? exec.execQty : "0"),
                    new BigDecimal(exec.execPrice != null ? exec.execPrice : "0"),
                    new BigDecimal(exec.execFee != null ? exec.execFee : "0"),
                    LocalDateTime.ofInstant(
                            Instant.ofEpochMilli(Long.parseLong(exec.execTime)),
                            ZoneId.of("Asia/Seoul"))
            );
        }

        // [용도] 저장 가능한 체결인지 확인 / [호출] TradeService.syncBybitTrades()
        public boolean isValid() {
            return qty().compareTo(BigDecimal.ZERO) > 0
                    && price().compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
