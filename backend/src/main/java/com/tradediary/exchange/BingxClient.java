package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.tradediary.trade.TradeSide;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class BingxClient {

    @Value("${bingx.base-url:https://open-api.bingx.com}")
    private String baseUrl = "https://open-api.bingx.com";
    private static final int PAGE_SIZE = 100;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
    private final Gson gson = new Gson();

    public List<BingxOrder> getTrades(String apiKey, String secretKey, LocalDateTime startTime) {

        long startMs = startTime.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
        List<String> symbols = fetchSymbols(apiKey, secretKey);
        List<BingxOrder> allOrders = new ArrayList<>();

        for (String symbol : symbols) {
            List<BingxOrder> orders = fetchOrdersForSymbol(apiKey, secretKey, symbol, startMs);
            if (!orders.isEmpty()) {
                allOrders.addAll(orders);
            }
        }

        allOrders.sort(Comparator.comparingLong(o -> o.updateTime));
        log.info("[BingX] trade sync fetch complete: {} orders", allOrders.size());
        return allOrders;
    }

    private List<String> fetchSymbols(String apiKey, String secretKey) {
        List<String> result = new ArrayList<>();
        TreeMap<String, String> params = new TreeMap<>();
        params.put("timestamp", String.valueOf(ts()));

        String sig = sign(secretKey, params);
        String url = baseUrl + "/openApi/swap/v2/quote/contracts?" + buildQuery(params) + "&signature=" + sig;

        Request req = new Request.Builder()
                .url(url)
                .header("X-BX-APIKEY", apiKey)
                .get()
                .build();

        try (Response resp = httpClient.newCall(req).execute()) {
            String body = resp.body() != null ? resp.body().string() : "";
            if (!resp.isSuccessful()) {
                throw new RuntimeException("BingX contracts HTTP " + resp.code() + ": " + body);
            }

            JsonObject root = gson.fromJson(body, JsonObject.class);
            if (root == null || !root.has("code") || root.get("code").getAsInt() != 0) {
                throw new RuntimeException("BingX contracts API error: " + body);
            }
            JsonArray data = root.getAsJsonArray("data");
            if (data == null) {
                throw new RuntimeException("BingX contracts response has no data array");
            }

            for (JsonElement el : data) {
                JsonObject obj = el.getAsJsonObject();
                String symbol = getString(obj, "symbol");
                if (symbol != null) {
                    result.add(symbol);
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("BingX contracts request failed", e);
        }

        return result;
    }

    private List<BingxOrder> fetchOrdersForSymbol(String apiKey, String secretKey, String symbol, long startMs) {
        List<BingxOrder> result = new ArrayList<>();
        Long lastOrderId = null;

        while (true) {
            TreeMap<String, String> params = new TreeMap<>();
            params.put("symbol", symbol);
            params.put("startTime", String.valueOf(startMs));
            params.put("limit", String.valueOf(PAGE_SIZE));
            if (lastOrderId != null) {
                params.put("orderId", String.valueOf(lastOrderId));
            }
            params.put("timestamp", String.valueOf(ts()));

            String sig = sign(secretKey, params);
            String url = baseUrl + "/openApi/swap/v2/trade/allFillOrders?" + buildQuery(params) + "&signature=" + sig;

            Request req = new Request.Builder()
                    .url(url)
                    .header("X-BX-APIKEY", apiKey)
                    .get()
                    .build();

            try (Response resp = httpClient.newCall(req).execute()) {
                String body = resp.body() != null ? resp.body().string() : "";
                if (!resp.isSuccessful()) {
                    throw new RuntimeException("BingX allFillOrders HTTP " + resp.code() + " for " + symbol + ": " + body);
                }

                JsonObject root = gson.fromJson(body, JsonObject.class);
                int code = root.has("code") ? root.get("code").getAsInt() : -1;
                if (code != 0) {
                    throw new RuntimeException("BingX allFillOrders API code=" + code + " for " + symbol);
                }

                JsonArray orders = null;
                JsonElement dataEl = root.get("data");
                if (dataEl != null && dataEl.isJsonObject()) {
                    JsonElement ordersEl = dataEl.getAsJsonObject().get("orders");
                    if (ordersEl != null && ordersEl.isJsonArray()) {
                        orders = ordersEl.getAsJsonArray();
                    }
                    JsonElement fillsEl = dataEl.getAsJsonObject().get("fillOrders");
                    if ((orders == null || orders.size() == 0) && fillsEl != null && fillsEl.isJsonArray()) {
                        orders = fillsEl.getAsJsonArray();
                    }
                } else if (dataEl != null && dataEl.isJsonArray()) {
                    orders = dataEl.getAsJsonArray();
                }

                if (orders == null) {
                    throw new RuntimeException("BingX allFillOrders response has no orders array for " + symbol);
                }
                if (orders.size() == 0) {
                    break;
                }

                long maxOrderId = lastOrderId != null ? lastOrderId : 0L;
                for (JsonElement el : orders) {
                    JsonObject obj = el.getAsJsonObject();
                    try {
                        BingxOrder order = new BingxOrder();
                        order.orderId = getLong(obj, "orderId", "tradeId", "id");
                        order.symbol = symbol;
                        order.side = firstNonBlank(obj, "side", "positionSide");
                        order.executedQty = new BigDecimal(defaultZero(firstNonBlank(obj,
                                "executedQty", "origQty", "qty", "volume")));
                        order.avgPrice = new BigDecimal(defaultZero(firstNonBlank(obj,
                                "avgPrice", "price", "avgDealPrice")));
                        order.fee = firstNonBlank(obj, "fee", "commission") != null
                                ? new BigDecimal(firstNonBlank(obj, "fee", "commission")).abs()
                                : BigDecimal.ZERO;
                        order.updateTime = getLong(obj, "updateTime", "tradeTime", "time");

                        if (order.side == null || order.executedQty.compareTo(BigDecimal.ZERO) <= 0
                                || order.avgPrice.compareTo(BigDecimal.ZERO) <= 0 || order.updateTime <= 0) {
                            continue;
                        }

                        result.add(order);
                        if (order.orderId > maxOrderId) {
                            maxOrderId = order.orderId;
                        }
                    } catch (Exception e) {
                        throw new IllegalStateException("Invalid BingX order for " + symbol, e);
                    }
                }

                if (orders.size() < PAGE_SIZE) {
                    break;
                }
                lastOrderId = maxOrderId + 1;
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException("BingX allFillOrders request failed for " + symbol, e);
            }
        }

        return result;
    }

    public List<BingxBalance> getBalance(String apiKey, String secretKey) {
        TreeMap<String, String> params = new TreeMap<>();
        params.put("timestamp", String.valueOf(ts()));

        String sig = sign(secretKey, params);
        String url = baseUrl + "/openApi/swap/v3/user/balance?" + buildQuery(params) + "&signature=" + sig;

        Request req = new Request.Builder()
                .url(url)
                .header("X-BX-APIKEY", apiKey)
                .get()
                .build();

        try (Response resp = httpClient.newCall(req).execute()) {
            String body = resp.body() != null ? resp.body().string() : "";
            log.debug("[BingX] balance status={}, body prefix={}",
                    resp.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);
            if (!resp.isSuccessful()) {
                throw new RuntimeException("status=" + resp.code());
            }

            JsonObject json = gson.fromJson(body, JsonObject.class);
            int code = json.has("code") ? json.get("code").getAsInt() : -1;
            if (code != 0) {
                String msg = getString(json, "msg");
                throw new RuntimeException("code=" + code + ": " + (msg != null ? msg : ""));
            }

            List<BingxBalance> balances = new ArrayList<>();
            JsonObject balance = extractBalanceObject(json);
            if (balance == null) {
                return balances;
            }

            BingxBalance b = new BingxBalance();
            b.asset = firstNonBlank(balance, "asset", "currency");
            if (b.asset == null) b.asset = "USDT";
            b.balance = defaultZero(firstNonBlank(balance, "balance", "walletBalance", "marginBalance"));
            b.equity = firstNonBlank(balance, "equity", "accountEquity");
            b.availableMargin = defaultZero(firstNonBlank(balance, "availableMargin", "availableBalance", "availableFunds"));
            b.usedMargin = firstNonBlank(balance, "usedMargin", "positionMargin");
            b.freezedMargin = firstNonBlank(balance, "freezedMargin", "frozenMargin");
            b.unrealizedProfit = firstNonBlank(balance, "unrealizedProfit", "unrealizedPnl");

            try {
                String total = b.equity != null ? b.equity : b.balance;
                if (new BigDecimal(total).compareTo(BigDecimal.ZERO) > 0) {
                    balances.add(b);
                }
            } catch (NumberFormatException ignored) {
            }

            return balances;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    public List<BingxPosition> getPositions(String apiKey, String secretKey) {
        TreeMap<String, String> params = new TreeMap<>();
        params.put("timestamp", String.valueOf(ts()));

        String sig = sign(secretKey, params);
        String url = baseUrl + "/openApi/swap/v2/user/positions?" + buildQuery(params) + "&signature=" + sig;

        Request req = new Request.Builder()
                .url(url)
                .header("X-BX-APIKEY", apiKey)
                .get()
                .build();

        try (Response resp = httpClient.newCall(req).execute()) {
            String body = resp.body() != null ? resp.body().string() : "";
            log.debug("[BingX] positions status={}, body prefix={}",
                    resp.code(), body.length() > 200 ? body.substring(0, 200) + "..." : body);
            if (!resp.isSuccessful()) {
                throw new RuntimeException("status=" + resp.code());
            }

            JsonObject json = gson.fromJson(body, JsonObject.class);
            int code = json.has("code") ? json.get("code").getAsInt() : -1;
            if (code != 0) {
                String msg = getString(json, "msg");
                throw new RuntimeException("code=" + code + ": " + (msg != null ? msg : ""));
            }

            List<BingxPosition> positions = new ArrayList<>();
            JsonArray items = extractPositionArray(json);
            if (items == null) {
                return positions;
            }

            for (JsonElement el : items) {
                JsonObject obj = el.getAsJsonObject();
                String size = firstNonBlank(obj, "positionAmt", "availableAmt", "positionQty");
                try {
                    if (size == null || new BigDecimal(size).compareTo(BigDecimal.ZERO) == 0) {
                        continue;
                    }
                } catch (NumberFormatException ignored) {
                    continue;
                }

                BingxPosition p = new BingxPosition();
                p.symbol = firstNonBlank(obj, "symbol");
                p.side = normalizePositionSide(firstNonBlank(obj, "positionSide", "side"));
                p.positionAmt = size;
                p.availableAmt = defaultZero(firstNonBlank(obj, "availableAmt", "positionAmt"));
                p.avgPrice = defaultZero(firstNonBlank(obj, "avgPrice", "entryPrice"));
                p.markPrice = defaultZero(firstNonBlank(obj, "markPrice"));
                p.unrealizedProfit = defaultZero(firstNonBlank(obj, "unrealizedProfit", "unrealizedPnl"));
                p.leverage = defaultZero(firstNonBlank(obj, "leverage"));
                p.marginType = firstNonBlank(obj, "marginType");
                p.liquidationPrice = defaultZero(firstNonBlank(obj, "liquidationPrice"));
                p.marginAsset = firstNonBlank(obj, "currency", "marginAsset", "asset");
                positions.add(p);
            }

            return positions;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private JsonObject extractBalanceObject(JsonObject root) {
        JsonElement dataEl = root.get("data");
        if (dataEl == null || dataEl.isJsonNull()) {
            return null;
        }
        if (dataEl.isJsonArray()) {
            JsonArray data = dataEl.getAsJsonArray();
            if (!data.isEmpty() && data.get(0).isJsonObject()) {
                return data.get(0).getAsJsonObject();
            }
            return null;
        }
        if (dataEl.isJsonObject()) {
            JsonObject data = dataEl.getAsJsonObject();
            if (data.has("balance") && data.get("balance").isJsonObject()) {
                return data.getAsJsonObject("balance");
            }
            return data;
        }
        return null;
    }

    private JsonArray extractPositionArray(JsonObject root) {
        JsonElement dataEl = root.get("data");
        if (dataEl == null || dataEl.isJsonNull()) {
            return null;
        }
        if (dataEl.isJsonArray()) {
            return dataEl.getAsJsonArray();
        }
        if (dataEl.isJsonObject()) {
            JsonObject data = dataEl.getAsJsonObject();
            if (data.has("positions") && data.get("positions").isJsonArray()) {
                return data.getAsJsonArray("positions");
            }
        }
        return null;
    }

    private String normalizePositionSide(String side) {
        if (side == null) return null;
        String upper = side.toUpperCase(Locale.ROOT);
        if (upper.contains("LONG")) return "long";
        if (upper.contains("SHORT")) return "short";
        if (upper.equals("BUY")) return "long";
        if (upper.equals("SELL")) return "short";
        return side.toLowerCase(Locale.ROOT);
    }

    private long getLong(JsonObject obj, String... keys) {
        for (String key : keys) {
            if (obj.has(key) && !obj.get(key).isJsonNull()) {
                try {
                    return obj.get(key).getAsLong();
                } catch (RuntimeException ignored) {
                }
            }
        }
        return 0L;
    }

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

    private String hmacSha256(String secretKey, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("BingX signature generation failed", e);
        }
    }

    private long ts() {
        return Instant.now().toEpochMilli();
    }

    private String getString(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    private String firstNonBlank(JsonObject obj, String... keys) {
        for (String key : keys) {
            String value = getString(obj, key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String defaultZero(String value) {
        return value != null && !value.isBlank() ? value : "0";
    }

    public static class BingxBalance {
        public String asset;
        public String balance;
        public String equity;
        public String availableMargin;
        public String usedMargin;
        public String freezedMargin;
        public String unrealizedProfit;
    }

    public static class BingxPosition {
        public String symbol;
        public String side;
        public String positionAmt;
        public String availableAmt;
        public String avgPrice;
        public String markPrice;
        public String unrealizedProfit;
        public String leverage;
        public String marginType;
        public String liquidationPrice;
        public String marginAsset;
    }

    public static class BingxOrder {
        public long orderId;
        public String symbol;
        public String side;
        public BigDecimal executedQty;
        public BigDecimal avgPrice;
        public BigDecimal fee;
        public long updateTime;
    }

    public record NormalizedTrade(
            String exchangeTradeId,
            String symbol,
            TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            BigDecimal fee,
            LocalDateTime tradedAt
    ) {
        public static NormalizedTrade from(BingxOrder o) {
            TradeSide side = "BUY".equalsIgnoreCase(o.side) ? TradeSide.BUY : TradeSide.SELL;
            LocalDateTime tradedAt = Instant.ofEpochMilli(o.updateTime)
                    .atZone(ZoneId.of("Asia/Seoul"))
                    .toLocalDateTime();
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
