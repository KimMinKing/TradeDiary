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

// [클래스] Upbit 공개 API로 KRW-USDT 환율 조회 (인증 불필요)
@Slf4j
@RestController
@RequestMapping("/api/exchange-rate")
public class ExchangeRateController {

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    // [용도] 현재 KRW/USDT 환율 조회 / [호출] GET /api/exchange-rate
    // Upbit 공개 ticker API 사용 (로그인 불필요)
    @GetMapping
    public ResponseEntity<Map<String, Object>> getExchangeRate() {
        try {
            Request request = new Request.Builder()
                    .url("https://api.upbit.com/v1/ticker?markets=KRW-USDT")
                    .get()
                    .addHeader("Accept", "application/json")
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body().string();
                JsonArray arr = gson.fromJson(body, JsonArray.class);
                JsonObject ticker = arr.get(0).getAsJsonObject();
                BigDecimal rate = ticker.get("trade_price").getAsBigDecimal();

                log.debug("환율 조회 완료: 1 USDT = {} KRW", rate);
                return ResponseEntity.ok(Map.of("krwPerUsdt", rate));
            }
        } catch (Exception e) {
            log.error("환율 조회 실패: {}", e.getMessage());
            // 조회 실패 시 기본값 반환
            return ResponseEntity.ok(Map.of("krwPerUsdt", new BigDecimal("1400")));
        }
    }
}
