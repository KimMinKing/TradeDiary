// [파일 용도] 포지션 조회 및 재계산 API 엔드포인트

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 포지션 REST API 컨트롤러
@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    // [용도] 포지션 목록 조회 / [호출] GET /api/positions?exchange=UPBIT|BYBIT
    @GetMapping
    public ResponseEntity<List<PositionService.PositionResponse>> getPositions(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String exchange) {
        return ResponseEntity.ok(positionService.getPositions(userId, exchange));
    }

    // [용도] 특정 거래소 포지션 수동 재계산 / [호출] POST /api/positions/rebuild?exchange=UPBIT|BYBIT
    @PostMapping("/rebuild")
    public ResponseEntity<Void> rebuild(
            @AuthenticationPrincipal Long userId,
            @RequestParam String exchange) {
        positionService.rebuildPositions(userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase()));
        return ResponseEntity.ok().build();
    }

    // [용도] 등록된 모든 거래소 포지션 일괄 재계산 / [호출] POST /api/positions/rebuild/all
    @PostMapping("/rebuild/all")
    public ResponseEntity<Void> rebuildAll(@AuthenticationPrincipal Long userId) {
        positionService.rebuildAllPositions(userId);
        return ResponseEntity.ok().build();
    }

    // [용도] 미청산(오픈) 포지션 윈도우 조회 / [호출] GET /api/positions/open?exchange=UPBIT
    @GetMapping("/open")
    public ResponseEntity<List<PositionService.OpenWindowResponse>> getOpenWindows(
            @AuthenticationPrincipal Long userId,
            @RequestParam String exchange) {
        return ResponseEntity.ok(positionService.getOpenWindows(
                userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase())));
    }
}
