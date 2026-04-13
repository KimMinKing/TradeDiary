// [파일 용도] 랭킹 API 응답 DTO

package com.tradediary.ranking;

import java.util.List;

// [클래스] 월별 랭킹 응답 데이터 구조
public record RankingResponse(
        String yearMonth,
        List<RankEntry> entries,
        MyRank myRank
) {
    // 랭킹 항목
    public record RankEntry(
            int rank,
            String nickname,
            int tradeCount,
            double winRate,
            String totalPnl,
            boolean isMe
    ) {}

    // 내 랭킹 정보 (집계 기준 미달 시 null)
    public record MyRank(
            Integer rank,       // null = 집계 기준 미달
            int tradeCount,
            double winRate,
            String totalPnl,
            String notice       // null = 정상, "최소 5건 필요" 등
    ) {}
}
