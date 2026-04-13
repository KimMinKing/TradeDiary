// [파일 용도] 트레이더 유형 분석 REST API 엔드포인트

package com.tradediary.trader;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// [클래스] 트레이더 유형 분석 API / [엔드포인트] GET /api/trader-type
@RestController
@RequestMapping("/api/trader-type")
@RequiredArgsConstructor
public class TraderTypeController {

    private final TraderTypeService traderTypeService;

    // [용도] 로그인 사용자의 트레이더 유형 분석 결과 조회 / [호출] GET /api/trader-type
    @GetMapping
    public ResponseEntity<TraderTypeResponse> getTraderType(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(traderTypeService.analyze(userId));
    }
}
