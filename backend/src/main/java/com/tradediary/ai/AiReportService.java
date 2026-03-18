// [파일 용도] AI 리포트 생성 비즈니스 로직

package com.tradediary.ai;

import com.tradediary.stats.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

// [클래스] 통계 데이터에서 AI 요청 DTO 조립 후 AI 서버 호출
@Service
@RequiredArgsConstructor
public class AiReportService {

    private final StatsService statsService;
    private final AiReportClient aiReportClient;

    // [용도] 사용자 거래 통계 기반 AI 분석 리포트 생성 / [호출] AiReportController.generate()
    public String generateReport(Long userId, String exchange) {
        StatsService.StatsResponse stats = statsService.getStats(userId, exchange);

        if (stats.summary().totalPositions() == 0) {
            return "포지션 데이터가 없습니다. 거래를 동기화하고 포지션을 재계산해주세요.";
        }

        // 시간대별 최고/최악 시간 추출
        Integer bestHour  = stats.hourlyStats().stream()
                .filter(h -> h.totalCount() > 0)
                .max(Comparator.comparingDouble(StatsService.StatsResponse.HourlyStats::winRate))
                .map(StatsService.StatsResponse.HourlyStats::hour)
                .orElse(null);

        Integer worstHour = stats.hourlyStats().stream()
                .filter(h -> h.totalCount() > 0)
                .min(Comparator.comparingDouble(StatsService.StatsResponse.HourlyStats::winRate))
                .map(StatsService.StatsResponse.HourlyStats::hour)
                .orElse(null);

        // 종목별 상위 5개 (손익 높은 순, 이미 정렬됨)
        List<StatsService.StatsResponse.SymbolStats> topSymbols = stats.symbolStats().stream()
                .limit(5)
                .toList();

        AiReportClient.AiReportRequest request = new AiReportClient.AiReportRequest(
                exchange,
                stats.summary(),
                topSymbols,
                stats.emotionStats(),
                bestHour,
                worstHour
        );

        return aiReportClient.analyze(request);
    }
}
