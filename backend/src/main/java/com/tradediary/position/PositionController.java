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

    // [용도] 포지션 수동 재계산 트리거 / [호출] POST /api/positions/rebuild?exchange=UPBIT|BYBIT
    @PostMapping("/rebuild")
    public ResponseEntity<Void> rebuild(
            @AuthenticationPrincipal Long userId,
            @RequestParam String exchange) {
        positionService.rebuildPositions(userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase()));
        return ResponseEntity.ok().build();
    }
}
