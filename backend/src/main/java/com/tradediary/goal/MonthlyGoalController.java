// [파일 용도] 월별 거래 목표 REST API 엔드포인트

package com.tradediary.goal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// [클래스] 월별 목표 조회 및 설정 API / [엔드포인트] /api/goals/monthly
@RestController
@RequestMapping("/api/goals/monthly")
@RequiredArgsConstructor
public class MonthlyGoalController {

    private final MonthlyGoalService goalService;

    // [용도] 이번 달 목표 및 현재 달성 현황 조회 / [호출] GET /api/goals/monthly
    @GetMapping
    public ResponseEntity<MonthlyGoalResponse> getGoal(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(goalService.getGoal(userId));
    }

    // [용도] 이번 달 목표 설정 또는 수정 / [호출] PUT /api/goals/monthly
    @PutMapping
    public ResponseEntity<MonthlyGoalResponse> saveGoal(
            @AuthenticationPrincipal Long userId,
            @RequestBody MonthlyGoalService.MonthlyGoalRequest request) {
        return ResponseEntity.ok(goalService.saveGoal(userId, request));
    }
}
