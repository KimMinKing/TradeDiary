// [파일 용도] Python AI 서버 호출 HTTP 클라이언트

package com.tradediary.ai;

import com.tradediary.stats.StatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

// [클래스] Python FastAPI AI 서버의 /report/analyze 엔드포인트 호출
@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportClient {

    @Value("${ai-server.url}")
    private String aiServerUrl;

    // [용도] 통계 데이터를 AI 서버에 전송 후 분석 리포트 수신 / [호출] AiReportService.generateReport()
    public String analyze(AiReportRequest request) {
        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(aiServerUrl)
                    .build();

            AiReportResponse response = restClient.post()
                    .uri("/report/analyze")
                    .body(request)
                    .retrieve()
                    .body(AiReportResponse.class);

            return response != null ? response.report() : "AI 분석 결과를 가져올 수 없습니다.";
        } catch (Exception e) {
            log.error("[AI] 리포트 생성 실패: {}", e.getMessage());
            throw new RuntimeException("AI 서버 연결 실패: " + e.getMessage());
        }
    }

    // AI 서버 요청 DTO (Python models.py 의 ReportRequest 와 매핑)
    public record AiReportRequest(
            String exchange,
            StatsService.StatsResponse.SummaryStats summary,
            List<StatsService.StatsResponse.SymbolStats> topSymbols,
            List<StatsService.StatsResponse.EmotionStats> emotionStats,
            Integer bestHour,
            Integer worstHour
    ) {}

    // AI 서버 응답 DTO
    public record AiReportResponse(String report) {}
}
