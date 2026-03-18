// [파일 용도] AI 트레이딩 리포트 생성 API 엔드포인트

package com.tradediary.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// [클래스] POST /api/ai/report - AI 분석 리포트 생성
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiReportController {

    private final AiReportService aiReportService;

    // [용도] AI 트레이딩 리포트 생성 / [호출] POST /api/ai/report?exchange=UPBIT|BYBIT
    @PostMapping("/report")
    public ResponseEntity<Map<String, String>> generate(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String exchange) {
        String report = aiReportService.generateReport(userId, exchange);
        return ResponseEntity.ok(Map.of("report", report));
    }
}
