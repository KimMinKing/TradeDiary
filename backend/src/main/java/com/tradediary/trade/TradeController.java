// [파일 용도] 거래 내역 동기화 및 조회 API 엔드포인트

package com.tradediary.trade;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// [클래스] 거래 내역 REST API 컨트롤러
@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    // [용도] Upbit 거래 내역 동기화 / [호출] POST /api/trades/sync/upbit
    @PostMapping("/sync/upbit")
    public ResponseEntity<Map<String, Integer>> syncUpbitTrades(
            @AuthenticationPrincipal Long userId) {
        int count = tradeService.syncUpbitTrades(userId);
        return ResponseEntity.ok(Map.of("savedCount", count));
    }

    // [용도] 전체 거래 목록 조회 / [호출] GET /api/trades
    @GetMapping
    public ResponseEntity<List<TradeService.TradeResponse>> getTrades(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(tradeService.getTrades(userId));
    }
}
