// [파일 용도] 통계 API 엔드포인트

package com.tradediary.stats;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// [클래스] GET /api/stats - 포지션 기반 성과 통계 조회
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    // [용도] 통계 전체 조회 / [호출] StatsPage.jsx
    @GetMapping
    public ResponseEntity<StatsService.StatsResponse> getStats(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String exchange
    ) {
        return ResponseEntity.ok(statsService.getStats(userId, exchange));
    }
}
