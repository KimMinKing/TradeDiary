package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.tradediary.trade.TradeSide;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class KrakenClient {
    private static final String BASE_URL = "https://api.kraken.com";
    private static final String BALANCE_PATH = "/0/private/Balance";
    private static final String TRADES_PATH = "/0/private/TradesHistory";
    private static final int PAGE_SIZE = 50;

    private final AtomicLong lastNonce = new AtomicLong();
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();

    public List<KrakenBalance> getBalance(String apiKey, String secretKey) {
        JsonObject result = privatePost(BALANCE_PATH, apiKey, secretKey, Map.of());
        List<KrakenBalance> balances = new ArrayList<>();
        for (Map.Entry<String, JsonElement> entry : result.entrySet()) {
            BigDecimal amount = entry.getValue().getAsBigDecimal();
            if (amount.signum() != 0) balances.add(new KrakenBalance(entry.getKey(), amount));
        }
        return balances;
    }

    public List<KrakenTrade> getTrades(String apiKey, String secretKey, LocalDateTime startTime) {
        List<KrakenTrade> trades = new ArrayList<>();
        int offset = 0;
        long startSeconds = startTime.atZone(ZoneId.of("Asia/Seoul")).toEpochSecond();
        while (true) {
            JsonObject result = privatePost(TRADES_PATH, apiKey, secretKey,
                    Map.of("start", String.valueOf(startSeconds), "ofs", String.valueOf(offset)));
            JsonObject page = result.getAsJsonObject("trades");
            if (page == null || page.size() == 0) break;
            for (Map.Entry<String, JsonElement> entry : page.entrySet()) {
                JsonObject value = entry.getValue().getAsJsonObject();
                trades.add(new KrakenTrade(
                        entry.getKey(), value.get("pair").getAsString(),
                        "buy".equalsIgnoreCase(value.get("type").getAsString()) ? TradeSide.BUY : TradeSide.SELL,
                        value.get("vol").getAsBigDecimal(), value.get("price").getAsBigDecimal(),
                        value.get("fee").getAsBigDecimal().abs(),
                        LocalDateTime.ofInstant(Instant.ofEpochMilli(value.get("time").getAsBigDecimal()
                                .multiply(BigDecimal.valueOf(1000)).longValue()), ZoneId.of("Asia/Seoul"))
                ));
            }
            offset += page.size();
            int total = result.has("count") ? result.get("count").getAsInt() : offset;
            if (page.size() < PAGE_SIZE || offset >= total) break;
        }
        return trades;
    }

    private JsonObject privatePost(String path, String apiKey, String secretKey, Map<String, String> parameters) {
        long nonce = nextNonce();
        FormBody.Builder form = new FormBody.Builder().add("nonce", String.valueOf(nonce));
        StringBuilder encoded = new StringBuilder("nonce=").append(nonce);
        parameters.forEach((key, value) -> {
            form.add(key, value);
            encoded.append('&').append(key).append('=').append(value);
        });
        RequestBody body = form.build();
        Request request = new Request.Builder().url(BASE_URL + path)
                .header("API-Key", apiKey)
                .header("API-Sign", sign(path, encoded.toString(), nonce, secretKey))
                .post(body).build();
        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body() == null ? "" : response.body().string();
            if (!response.isSuccessful()) throw new IllegalStateException("Kraken HTTP " + response.code());
            JsonObject root = gson.fromJson(responseBody, JsonObject.class);
            if (root.has("error") && root.getAsJsonArray("error").size() > 0) {
                throw new IllegalStateException("Kraken API: " + root.getAsJsonArray("error"));
            }
            return root.getAsJsonObject("result");
        } catch (Exception e) {
            if (e instanceof IllegalStateException state) throw state;
            throw new IllegalStateException("Kraken request failed", e);
        }
    }

    String sign(String path, String postData, long nonce, String secretKey) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((nonce + postData).getBytes(StandardCharsets.UTF_8));
            byte[] pathBytes = path.getBytes(StandardCharsets.UTF_8);
            byte[] message = new byte[pathBytes.length + hash.length];
            System.arraycopy(pathBytes, 0, message, 0, pathBytes.length);
            System.arraycopy(hash, 0, message, pathBytes.length, hash.length);
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(Base64.getDecoder().decode(secretKey), "HmacSHA512"));
            return Base64.getEncoder().encodeToString(mac.doFinal(message));
        } catch (Exception e) {
            throw new IllegalStateException("Kraken signature failed", e);
        }
    }

    private long nextNonce() {
        return lastNonce.updateAndGet(previous -> Math.max(System.currentTimeMillis() * 1000, previous + 1));
    }

    public record KrakenBalance(String asset, BigDecimal balance) {}
    public record KrakenTrade(String id, String symbol, TradeSide side, BigDecimal qty,
                              BigDecimal price, BigDecimal fee, LocalDateTime tradedAt) {}
}
