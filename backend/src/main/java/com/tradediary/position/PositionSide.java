// [파일 용도] 포지션 방향 Enum (롱/숏)

package com.tradediary.position;

// [클래스] 포지션 방향 (현물 매수 → LONG, 선물 숏 → SHORT)
public enum PositionSide {
    LONG,   // 매수 진입 후 매도 청산
    SHORT   // 매도 진입 후 매수 청산 (선물 전용)
}
