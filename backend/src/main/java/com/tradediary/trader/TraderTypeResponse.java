// [파일 용도] 트레이더 유형 분석 API 응답 DTO

package com.tradediary.trader;

// [클래스] 트레이더 유형 분석 결과 응답 데이터 구조
public record TraderTypeResponse(
        String typeCode,       // SCALPER | DAY_TRADER | SWING_TRADER | POSITION_TRADER | FOCUSED | DIVERSIFIED
        String typeName,       // 한국어 유형명
        String icon,           // 이모지 아이콘
        String description,    // 유형 설명
        String strength,       // 강점
        String weakness,       // 약점
        Stats stats            // 분석에 사용된 통계
) {
    public record Stats(
            int totalPositions,
            double avgHoldHours,
            int uniqueSymbols,
            double winRate,
            double avgPnlPerTrade
    ) {}
}
