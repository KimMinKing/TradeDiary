// [파일 용도] 대시보드 API 응답 DTO

package com.tradediary.dashboard;

import java.util.List;

// [클래스] 대시보드 응답 데이터 구조
public record DashboardResponse(
        String nickname,
        PeriodStats thisMonth,
        PeriodStats lastMonth,
        OverallStats overall,
        List<RecentPosition> recentPositions,
        List<Insight> insights
) {
    // 기간별 통계 (이번 달 / 지난 달)
    public record PeriodStats(
            int totalCount,
            int winCount,
            double winRate,
            String totalPnl
    ) {}

    // 전체 통계 요약
    public record OverallStats(
            int totalPositions,
            double winRate,
            String totalPnl
    ) {}

    // 최근 포지션 요약
    public record RecentPosition(
            String symbol,
            String exchange,
            String side,
            String pnl,
            String closedAt
    ) {}

    // 규칙 기반 인사이트
    public record Insight(
            String type,    // "good" | "warning" | "info"
            String message
    ) {}
}
