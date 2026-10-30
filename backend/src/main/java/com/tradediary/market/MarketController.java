// [파일 용도] 시세 조회 및 현재가 API 엔드포인트

package com.tradediary.market;

import com.tradediary.exchange.UpbitClient;
import com.tradediary.exchange.BybitClient;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.UpbitClient.UpbitCandle;
import com.tradediary.position.PositionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

// [클래스] 시세 정보 REST API 컨트롤러
@Slf4j
@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    // [용도] 현재가 테스트 엔드포인트
    @GetMapping("/test-ticker")
    public ResponseEntity<String> testTicker(@RequestParam String symbol) {
        try {
            String market = "KRW-" + symbol;
            List<Map<String, Object>> tickers = upbitClient.getTicker(market);

            if (tickers == null || tickers.isEmpty()) {
                return ResponseEntity.ok("No data for symbol: " + symbol);
            }

            Map<String, Object> ticker = tickers.get(0);
            return ResponseEntity.ok(String.format(
                "Symbol: %s, Price: %s, Change Rate: %s, Timestamp: %s",
                symbol, ticker.get("trade_price"), ticker.get("signed_change_rate"), ticker.get("timestamp")
            ));
        } catch (Exception e) {
            return ResponseEntity.ok("Error: " + e.getMessage());
        }
    }

    private final UpbitClient upbitClient;
    private final BybitClient bybitClient;
    private final PositionService positionService;

    // [용도] 현재 시세 조회 / [호출] 프론트엔드 현재가 표시
    @GetMapping("/ticker")
    public ResponseEntity<Map<String, Object>> getCurrentPrice(@RequestParam String symbol) {
        return getCurrentPrice("UPBIT", symbol);
    }

    // [용도] 현재 시세 조회 (거래구 지정) / [호출] 프론트엔드 현재가 표시
    @GetMapping("/ticker/{exchange}")
    public ResponseEntity<Map<String, Object>> getCurrentPrice(
            @PathVariable String exchange,
            @RequestParam String symbol) {
        // 알려진 없는 코인 목록 (업데이트 필요)
        Set<String> knownMissingCoins = Set.of("CHR", "OLD_COIN_1", "OLD_COIN_2");

        if (knownMissingCoins.contains(symbol)) {
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("symbol", symbol);
            errorResult.put("error", "COIN_NOT_FOUND");
            errorResult.put("message", "이 코인은 더 이상 상장되지 않았습니다");
            return ResponseEntity.ok(errorResult);
        }

        try {
            Map<String, Object> ticker = null;

            if ("UPBIT".equalsIgnoreCase(exchange)) {
                // Upbit 처리
                String market = "KRW-" + symbol;
                List<Map<String, Object>> tickers = upbitClient.getTicker(market);

                if (tickers != null && !tickers.isEmpty()) {
                    Map<String, Object> upbitTicker = tickers.get(0);

                    ticker = new HashMap<>();
                    ticker.put("symbol", symbol);
                    ticker.put("lastPrice", upbitTicker.get("trade_price"));
                    ticker.put("prevPrice24h", upbitTicker.get("prev_closing_price"));
                    ticker.put("price24hPcnt", upbitTicker.get("signed_change_rate"));
                    ticker.put("highPrice24h", upbitTicker.get("high_price"));
                    ticker.put("lowPrice24h", upbitTicker.get("low_price"));
                    ticker.put("timestamp", upbitTicker.get("timestamp"));
                }
            } else if ("BYBIT".equalsIgnoreCase(exchange)) {
                // Bybit 처리 - Spot 카테고리 우선
                ticker = bybitClient.getTicker("spot", symbol);

                // Spot에 없으면 Linear(USDT) 시도
                if (ticker == null) {
                    String linearSymbol = symbol + "USDT";
                    ticker = bybitClient.getTicker("linear", linearSymbol);
                }

                // Linear에도 없으면 Inverse(USD) 시도
                if (ticker == null) {
                    String inverseSymbol = symbol + "USD";
                    ticker = bybitClient.getTicker("inverse", inverseSymbol);
                }
            } else {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("symbol", symbol);
                errorResult.put("error", "UNSUPPORTED_EXCHANGE");
                errorResult.put("message", "지원하지 않는 거래소입니다: " + exchange);
                return ResponseEntity.ok(errorResult);
            }

            if (ticker == null) {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("symbol", symbol);
                errorResult.put("error", "COIN_NOT_FOUND");
                errorResult.put("message", "존재하지 않는 코인입니다");
                return ResponseEntity.ok(errorResult);
            }

            // Upbit 형식과 Bybit 형식을 통일
            Map<String, Object> result = new HashMap<>();
            result.put("symbol", symbol);
            result.put("tradePrice", ticker.get("lastPrice"));
            result.put("changeRate", ticker.get("price24hPcnt"));
            result.put("changePrice", ticker.get("changePrice"));
            result.put("highPrice", ticker.get("highPrice24h"));
            result.put("lowPrice", ticker.get("lowPrice24h"));
            result.put("timestamp", ticker.get("timestamp"));

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("[Market] 현재가 조회 실패: exchange={}, symbol={}, error={}", exchange, symbol, e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("symbol", symbol);
            errorResult.put("error", "COIN_NOT_FOUND");
            errorResult.put("message", "존재하지 않는 코인입니다: " + e.getMessage());
            return ResponseEntity.ok(errorResult);
        }
    }

    // [용도] 여러 코oin의 현재가 일괄 조회 / [호출] 배치 처리용
    @GetMapping("/tickers")
    public ResponseEntity<List<Map<String, Object>>> getCurrentPrices(@RequestParam String symbols) {
        try {
            String[] symbolArray = symbols.split(",");
            String markets = Arrays.stream(symbolArray)
                    .map(s -> "KRW-" + s.trim())
                    .collect(Collectors.joining(","));

            List<Map<String, Object>> tickers = upbitClient.getTicker(markets);

            if (tickers == null || tickers.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            // 응답에서 프론트엔드에 필요한 형식으로 변환
            List<Map<String, Object>> results = tickers.stream().map(ticker -> {
                Map<String, Object> result = new HashMap<>();
                String market = (String) ticker.get("market");
                String symbol = market.replace("KRW-", "");
                result.put("symbol", symbol);
                result.put("tradePrice", ticker.get("trade_price"));
                result.put("changeRate", ticker.get("signed_change_rate"));
                result.put("changePrice", ticker.get("signed_change_price"));
                result.put("highPrice", ticker.get("high_price"));
                result.put("lowPrice", ticker.get("low_price"));
                result.put("timestamp", ticker.get("timestamp"));
                return result;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(results);

        } catch (Exception e) {
            log.error("[Market] 현재가 일괄 조회 실패: symbols={}, error={}", symbols, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // [용도] 시간별 캔들 정보 조회 / [호출] 프론트엔드 수익률 차트
    @GetMapping("/candles")
    public ResponseEntity<List<Map<String, Object>>> getCandles(
            @RequestParam String symbol,
            @RequestParam(required = false, defaultValue = "60") String unit,
            @RequestParam(required = false, defaultValue = "48") Integer count,
            @RequestParam(required = false) String to) {

        log.info("[Market] 캔들 조회: symbol={}, unit={}, count={}", symbol, unit, count);

        try {
            String market = "KRW-" + symbol;
            List<UpbitCandle> candles = upbitClient.getCandles(market, unit, count, to);

            List<Map<String, Object>> result = candles.stream()
                .map(candle -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("candleDateTimeUTC", candle.getDateTime());
                    item.put("openingPrice", BigDecimal.valueOf(Double.parseDouble(candle.getOpen())));
                    item.put("highPrice", BigDecimal.valueOf(Double.parseDouble(candle.getHigh())));
                    item.put("lowPrice", BigDecimal.valueOf(Double.parseDouble(candle.getLow())));
                    item.put("tradePrice", BigDecimal.valueOf(Double.parseDouble(candle.getClose())));
                    item.put("candleDateTimeKst", candle.getDateTimeKst());
                    item.put("timestamp", candle.getTimestamp());
                    return item;
                })
                .collect(Collectors.toList());

            log.info("[Market] 캔들 조회 성공: symbol={}, count={}", symbol, result.size());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("[Market] 캔들 조회 실패: symbol={}, error={}", symbol, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // [용도] 포지션별 실시간 수익률 조회 / [호출] 프론트엔드 보유 자산 수익률
    @GetMapping("/profit-rate")
    public ResponseEntity<List<Map<String, Object>>> getProfitRates(
            @AuthenticationPrincipal Long userId,
            @RequestParam String exchange) {

        log.info("[Market] 수익률 조회: userId={}, exchange={}", userId, exchange);
        // This endpoint uses Upbit KRW tickers. Other exchanges require their own quote source.
        if (!"UPBIT".equalsIgnoreCase(exchange)) return ResponseEntity.badRequest().build();

        try {
            // 1. 미청산 포지션 목록 조회
            List<PositionService.OpenPositionResponse> openPositions = positionService.getOpenPositions(
                userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase()));

            // 2. 현재가 조회
            List<Map<String, Object>> result = new ArrayList<>();

            for (PositionService.OpenPositionResponse position : openPositions) {
                try {
                    // 현재가 조회
                    String market = position.symbol().startsWith("KRW-")
                            ? position.symbol() : "KRW-" + position.symbol();
                    List<Map<String, Object>> tickers = upbitClient.getTicker(market);

                    if (tickers != null && !tickers.isEmpty()) {
                        Map<String, Object> ticker = tickers.get(0);
                        BigDecimal currentPrice = new BigDecimal(ticker.get("trade_price").toString());
                        BigDecimal avgBuyPrice = position.avgBuyPrice();
                        BigDecimal qty = position.qty();
                        if (avgBuyPrice.signum() <= 0 || qty.signum() == 0) continue;

                        // 수익률 계산
                        BigDecimal profitAmount = currentPrice.subtract(avgBuyPrice).multiply(qty);
                        BigDecimal profitRate = profitAmount.divide(
                                avgBuyPrice.multiply(qty.abs()), 6, RoundingMode.HALF_UP);

                        Map<String, Object> item = new HashMap<>();
                        item.put("symbol", position.symbol());
                        item.put("currentPrice", currentPrice);
                        item.put("avgBuyPrice", avgBuyPrice);
                        item.put("profitRate", profitRate);
                        item.put("profitAmount", profitAmount);
                        item.put("qty", qty);
                        item.put("side", position.side().name());
                        item.put("timestamp", ticker.get("timestamp"));
                        result.add(item);

                        log.info("[Market] 수익률 계산 완료: symbol={}, current={}, avg={}, rate={}",
                            position.symbol(), currentPrice, avgBuyPrice, profitRate);
                    }
                } catch (Exception e) {
                    log.warn("[Market] 수익률 계산 실패: symbol={}, error={}", position.symbol(), e.getMessage());
                }
            }

            log.info("[Market] 수익률 조회 성공: userId={}, exchange={}, 결과 건수={}", userId, exchange, result.size());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("[Market] 수익률 조회 실패: userId={}, exchange={}, error={}", userId, exchange, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // [용도] 수익률 차트 데이터 생성 / [호출] 프론트엔드 차트 표시
    @GetMapping("/profit-chart")
    public ResponseEntity<Map<String, Object>> getProfitChartData(
            @AuthenticationPrincipal Long userId,
            @RequestParam String symbol,
            @RequestParam(required = false, defaultValue = "hour") String interval) {

        log.info("[Market] 수익률 차트 데이터 조회: userId={}, symbol={}, interval={}", userId, symbol, interval);

        try {
            // 1. 미청산 포지션에서 평균 매수가 조회
            List<PositionService.OpenPositionResponse> openPositions = positionService.getOpenPositions(
                userId, ExchangeKey.Exchange.UPBIT); // 현재는 UPBIT만 지원

            BigDecimal avgBuyPrice = BigDecimal.ZERO;
            boolean hasPosition = false;

            for (PositionService.OpenPositionResponse position : openPositions) {
                if (position.symbol().equals(symbol)) {
                    avgBuyPrice = position.avgBuyPrice();
                    hasPosition = true;
                    break;
                }
            }

            if (!hasPosition) {
                return ResponseEntity.notFound().build();
            }

            // 2. 캔들 데이터 조회
            String unit = "hour".equals(interval) ? "60" : "360"; // 1시간 또는 6시간
            List<Map<String, Object>> candles = getCandles(symbol, unit, 72, null).getBody(); // 3일치 데이터

            // 3. 수익률 계산 데이터 생성
            List<Map<String, Object>> data = new ArrayList<>();
            for (Map<String, Object> candle : candles) {
                Map<String, Object> point = new HashMap<>();
                point.put("time", candle.get("candleDateTimeKst"));
                BigDecimal price = (BigDecimal) candle.get("tradePrice");
                BigDecimal profitRate = price.subtract(avgBuyPrice).divide(avgBuyPrice, 6, BigDecimal.ROUND_HALF_UP);
                point.put("profitRate", profitRate.multiply(BigDecimal.valueOf(100))); // 퍼센트로 변환
                data.add(point);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("symbol", symbol);
            result.put("currentPrice", candles.get(candles.size() - 1).get("tradePrice"));
            result.put("avgBuyPrice", avgBuyPrice);
            result.put("currentProfitRate", data.get(data.size() - 1).get("profitRate"));
            result.put("data", data);

            log.info("[Market] 수익률 차트 데이터 조회 성공: symbol={}, avgBuyPrice={}", symbol, avgBuyPrice);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("[Market] 수익률 차트 데이터 조회 실패: symbol={}, error={}", symbol, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
