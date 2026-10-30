// [파일 용도] 월별 목표 API 응답 DTO

package com.tradediary.goal;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

// [클래스] 이번 달 목표 + 현재 달성 현황 응답 데이터 구조
public record MonthlyGoalResponse(
        @JsonProperty("year_month") String yearMonth,
        @JsonProperty("target_win_rate") BigDecimal targetWinRate,     // 목표 승률 (null이면 미설정)
        @JsonProperty("target_pnl") BigDecimal targetPnl,         // 목표 수익 (null이면 미설정)
        @JsonProperty("target_trade_count") Integer targetTradeCount,     // 목표 거래 횟수 (null이면 미설정)
        @JsonProperty("current_win_rate") double currentWinRate,        // 현재 달성 승률
        @JsonProperty("current_pnl") String currentPnl,            // 현재 달성 수익
        @JsonProperty("current_trade_count") int currentTradeCount         // 현재 거래 횟수
) {}
