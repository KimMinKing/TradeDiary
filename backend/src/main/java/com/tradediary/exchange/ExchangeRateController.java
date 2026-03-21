// [파일 용도] 실시간 환율 조회 API (KRW/USDT)

package com.tradediary.exchange;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

// [클래스] 실시간 환율 조회 (KRW/CNY/JPY per USDT)
@Slf4j
@RestController
@RequestMapping("/api/exchange-rate")
public class ExchangeRateController {

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] KRW·CNY·JPY per USDT 환율 조회 / [호출] GET /api/exchange-rate
    // KRW: Upbit 공개 API / CNY·JPY: frankfurter.app 공개 API
    @GetMapping
    public ResponseEntity<Map<String, Object>> getExchangeRate() {
        BigDecimal krwPerUsdt = fetchKrwPerUsdt();
        BigDecimal cnyPerUsdt = new BigDecimal("7.2");
        BigDecimal jpyPerUsdt = new BigDecimal("150");

        try {
            Request req = new Request.Builder()
                    .url("https://api.frankfurter.app/latest?from=USD&to=CNY,JPY")
                    .get().build();
            try (Response resp = httpClient.newCall(req).execute()) {
                if (resp.isSuccessful() && resp.body() != null) {
                    JsonObject root = gson.fromJson(resp.body().string(), JsonObject.class);
                    JsonObject rates = root.getAsJsonObject("rates");
                    if (rates != null) {
                        if (rates.has("CNY")) cnyPerUsdt = rates.get("CNY").getAsBigDecimal();
                        if (rates.has("JPY")) jpyPerUsdt = rates.get("JPY").getAsBigDecimal();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("CNY/JPY 환율 조회 실패, 기본값 사용: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "krwPerUsdt", krwPerUsdt,
                "cnyPerUsdt", cnyPerUsdt,
                "jpyPerUsdt", jpyPerUsdt
        ));
    }

    // [용도] Upbit에서 KRW/USDT 환율 조회 / [호출] getExchangeRate()
    private BigDecimal fetchKrwPerUsdt() {
        try {
            Request req = new Request.Builder()
                    .url("https://api.upbit.com/v1/ticker?markets=KRW-USDT")
                    .get().addHeader("Accept", "application/json").build();
            try (Response resp = httpClient.newCall(req).execute()) {
                String body = resp.body().string();
                JsonArray arr = gson.fromJson(body, JsonArray.class);
                return arr.get(0).getAsJsonObject().get("trade_price").getAsBigDecimal();
            }
        } catch (Exception e) {
            log.error("KRW 환율 조회 실패: {}", e.getMessage());
            return new BigDecimal("1400");
        }
    }
}
