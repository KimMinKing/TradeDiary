// [파일 용도] 트레이더 유형 분석 및 AI 코칭 REST API 엔드포인트

package com.tradediary.trader;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// [클래스] 트레이더 유형 분석 API / [엔드포인트] GET/POST /api/trader-type
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

    // [용도] 로그인 사용자의 AI 코칭 결과 조회 (캐시 우선) / [호출] GET /api/trader-type/advice
    //        데이터 부족(포지션 < 5건) 시 advice == null 로 응답 → 프론트 카드 미표시
    @GetMapping("/advice")
    public ResponseEntity<TraderTypeAdviceResponse> getAdvice(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(traderTypeService.getAdvice(userId));
    }

    // [용도] AI 코칭 강제 재생성 (새로고침 버튼) / [호출] POST /api/trader-type/advice/refresh
    @PostMapping("/advice/refresh")
    public ResponseEntity<TraderTypeAdviceResponse> refreshAdvice(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(traderTypeService.refreshAdvice(userId));
    }
}
