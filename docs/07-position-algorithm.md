# 07 — 포지션 묶기 알고리즘

완료일: 2026-03-18

---

## 개요

개별 거래 원본 데이터(`trades`)를 하나의 완결된 포지션(`positions`)으로 묶는 핵심 알고리즘 구현.
순수량(Net Position) = 0 기준으로 포지션 종료를 판단하며, LONG/SHORT 방향, 가중평균 진입/청산가, PnL, 손익률을 자동 계산한다.

---

## 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `backend/src/main/java/com/tradediary/position/Position.java` | 포지션 JPA 엔티티 (exchange, symbol, side, entryPrice, exitPrice, qty, pnl, pnlRate, openedAt, closedAt) |
| `backend/src/main/java/com/tradediary/position/PositionSide.java` | LONG / SHORT enum |
| `backend/src/main/java/com/tradediary/position/PositionRepository.java` | 포지션 저장/삭제/조회 JPA Repository |
| `backend/src/main/java/com/tradediary/position/PositionService.java` | 핵심 알고리즘 + 조회 서비스 |
| `backend/src/main/java/com/tradediary/position/PositionController.java` | REST API (GET /api/positions, POST /api/positions/rebuild) |
| `frontend/src/pages/PositionListPage.jsx` | 포지션 목록 화면 (탭 필터, 수동 재계산, 테이블/카드 이중 뷰) |
| `frontend/src/api/exchangeApi.js` | `getPositions()`, `rebuildPositions()` API 함수 추가 |
| `database/migrations/V3__positions_side.sql` | 기존 DB `positions.side` 컬럼 추가 마이그레이션 |

---

## 알고리즘 설명

### 핵심 원리: 순수량(Net Position) = 0 기준

```
매수 거래 = +qty
매도 거래 = -qty
누적 합산하다가 0이 되면 포지션 종료
```

### 부동소수점 처리

```java
private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.000001");
if (netPosition.abs().compareTo(ZERO_THRESHOLD) < 0) {
    // 포지션 종료
}
```

### LONG / SHORT 판별

- **최초 진입 방향**으로 결정
  - 첫 거래가 BUY → LONG 포지션
  - 첫 거래가 SELL → SHORT 포지션

### PnL 계산 공식

```
LONG:  (청산가 - 진입가) × 수량 - 수수료 합계
SHORT: (진입가 - 청산가) × 수량 - 수수료 합계
```

### 진입/청산가 계산

```
진입 가중평균가 = Σ(price × qty) / Σqty
청산 가중평균가 = Σ(price × qty) / Σqty
```

### 미청산 포지션 처리

- 순수량이 0이 되지 않은 채로 거래 목록이 끝나면 **저장하지 않음** (오픈 포지션)

---

## API 명세

### 포지션 목록 조회

```
GET /api/positions?exchange=UPBIT|BYBIT
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "exchange": "UPBIT",
    "symbol": "KRW-BTC",
    "side": "LONG",
    "entry_price": "50000000.00",
    "exit_price": "52000000.00",
    "qty": "0.01",
    "pnl": "19800.00",
    "pnl_rate": "3.9600",
    "opened_at": "2026-03-01T09:10:00",
    "closed_at": "2026-03-01T14:30:00"
  }
]
```

### 포지션 수동 재계산

```
POST /api/positions/rebuild?exchange=UPBIT|BYBIT
Authorization: Bearer {token}

Response 200: (빈 응답)
```

---

## 동기화 연동

거래 동기화(`/api/trades/sync/upbit`, `/sync/bybit`) 호출 시 **신규 거래가 저장되면 자동으로** `rebuildPositions()` 가 실행된다.

```java
// TradeService.syncUpbitTrades() — 마지막 부분
if (savedCount > 0) {
    positionService.rebuildPositions(userId, ExchangeKey.Exchange.UPBIT);
}
```

---

## DB 스키마

```sql
CREATE TABLE positions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange    VARCHAR(20)    NOT NULL,
    symbol      VARCHAR(30)    NOT NULL,
    side        VARCHAR(5)     NOT NULL DEFAULT 'LONG',
    entry_price DECIMAL(30,10) NOT NULL,
    exit_price  DECIMAL(30,10) NOT NULL,
    qty         DECIMAL(30,10) NOT NULL,
    pnl         DECIMAL(30,10) NOT NULL,
    pnl_rate    DECIMAL(10,4)  NOT NULL,
    opened_at   TIMESTAMP      NOT NULL,
    closed_at   TIMESTAMP      NOT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW()
);
```
