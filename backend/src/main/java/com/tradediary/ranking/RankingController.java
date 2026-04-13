// [파일 용도] 월별 랭킹 REST API 엔드포인트

package com.tradediary.ranking;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// [클래스] 월별 트레이더 랭킹 조회 API / [엔드포인트] GET /api/ranking/monthly
@RestController
@RequestMapping("/api/ranking")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    // [용도] 이번 달 승률 기준 랭킹 조회 / [호출] GET /api/ranking/monthly
    @GetMapping("/monthly")
    public ResponseEntity<RankingResponse> getMonthlyRanking(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(rankingService.getRanking(userId));
    }
}
