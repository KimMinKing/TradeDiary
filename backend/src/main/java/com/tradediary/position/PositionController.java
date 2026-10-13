// [파일 용도] 포지션 조회 및 재계산 API 엔드포인트

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.user.UserService;
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
    private final PositionRebuildService positionRebuildService;
    private final UserService userService;

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
        positionRebuildService.rebuildAllPositions(userId);
        return ResponseEntity.ok().build();
    }

    // [용도] 미청산 포지션 조회 / [호출] GET /api/positions/open?exchange=UPBIT
    @GetMapping("/open")
    public ResponseEntity<?> getOpenPositions(
            @AuthenticationPrincipal Long userId,
            @RequestParam String exchange) {
        // PositionService.getOpenPositions: 미청산 포지션 상세 정보 (매수평균가 포함)
        // PositionService.getOpenWindows: 간단한 윈도우 정보 (수량만)

        // API 문서 명시를 위해 /open은 상세 정보를 반환하도록 변경
        return ResponseEntity.ok(positionService.getOpenPositions(
                userId, ExchangeKey.Exchange.valueOf(exchange.toUpperCase())));
    }

    // [용도] 특정 사용자의 공개 포지션 조회 / [호출] GET /api/positions/public/{userId}
    @GetMapping("/public/{userId}")
    public ResponseEntity<List<PositionService.PositionResponse>> getPublicPositions(
            @PathVariable Long userId) {
        // diaryPublic 검증
        userService.validatePublicSection(userId, UserService.PublicSection.POSITIONS);
        return ResponseEntity.ok(positionService.getAllPositions(userId));
    }

}
