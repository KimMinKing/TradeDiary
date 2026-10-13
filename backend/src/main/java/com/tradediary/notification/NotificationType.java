// [파일 용도] 알림 타입 열거형

package com.tradediary.notification;

// [클래스] 알림 타입 정의
public enum NotificationType {
    TRADE_EXECUTED,      // 거래 체결
    POSITION_OPENED,     // 포지션 개설
    POSITION_CLOSED,     // 포지션 종료
    PROFIT_TAKEN,        // 수익 실현
    LOSS_CUT,            // 손절
    EXCHANGE_CONNECTED,   // 거래소 연결 완료
    EXCHANGE_DISCONNECTED, // 거래 연결 해제
    MARGIN_WARNING,      // 마진 경고
    DAILY_SUMMARY,       // 일일 요약
    WEEKLY_SUMMARY,      // 주간 요약
    MONTHLY_SUMMARY,     // 월간 요약
    AI_REPORT_READY,      // AI 리포트 생성 완료
    NEWS_ALERT,          // 뉴스 알림
    SYSTEM_ALERT,        // 시스템 알림
    FOLLOWER_TRADE       // 팔로잉한 트레이더의 거래
}