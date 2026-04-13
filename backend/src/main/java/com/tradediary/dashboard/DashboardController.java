// [파일 용도] 대시보드 REST API 엔드포인트

package com.tradediary.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// [클래스] 대시보드 데이터 조회 API / [엔드포인트] GET /api/dashboard
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // [용도] 대시보드 종합 데이터 조회 / [호출] GET /api/dashboard
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(dashboardService.getDashboard(userId));
    }
}
