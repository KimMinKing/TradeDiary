// [파일 용도] 월별 목표 API 응답 DTO

package com.tradediary.goal;

import java.math.BigDecimal;

// [클래스] 이번 달 목표 + 현재 달성 현황 응답 데이터 구조
public record MonthlyGoalResponse(
        String yearMonth,
        BigDecimal targetWinRate,     // 목표 승률 (null이면 미설정)
        BigDecimal targetPnl,         // 목표 수익 (null이면 미설정)
        Integer targetTradeCount,     // 목표 거래 횟수 (null이면 미설정)
        double currentWinRate,        // 현재 달성 승률
        String currentPnl,            // 현재 달성 수익
        int currentTradeCount         // 현재 거래 횟수
) {}
