// [파일 용도] 트레이더 유형 AI 코칭 결과 응답 DTO

package com.tradediary.trader;

import java.time.LocalDateTime;

// [클래스] 트레이더 유형 AI 코칭 결과 응답 데이터 구조
public record TraderTypeAdviceResponse(
        String advice,               // AI 코칭 요약 전문 (마크다운)
        LocalDateTime generatedAt    // 생성(갱신) 일시 — 프론트 "최근 분석 X시간 전" 표시용
) {
    // [용도] 데이터 부족(포지션 < 5건) 시 빈 응답 / [호출] TraderTypeController.getAdvice()
    public static TraderTypeAdviceResponse empty() {
        return new TraderTypeAdviceResponse(null, null);
    }
}
