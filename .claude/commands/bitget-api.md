# Bitget API 레퍼런스 (V3 Unified Trading Account)

## 인증 정보
- **3가지 자격증명 필요**: apiKey, secretKey, passphrase
- Base URL: `https://api.bitget.com`

## 요청 헤더 (모든 인증 API)
```
ACCESS-KEY: {apiKey}
ACCESS-SIGN: {서명}
ACCESS-TIMESTAMP: {밀리초 타임스탬프}
ACCESS-PASSPHRASE: {passphrase}
Content-Type: application/json
locale: en-US
```

## 서명 방법 (HMAC-SHA256 + Base64)

### 서명 문자열 조합
- queryString이 없을 때: `timestamp + method.toUpperCase() + requestPath + body`
- queryString이 있을 때: `timestamp + method.toUpperCase() + requestPath + "?" + queryString + body`

### Java 예시
```java
String preHash = timestamp + "GET" + "/api/v3/trade/history-orders" + "?" + queryString;
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secretKey.getBytes("UTF-8"), "HmacSHA256"));
String sign = Base64.getEncoder().encodeToString(mac.doFinal(preHash.getBytes("UTF-8")));
```

---

## 거래 내역 조회 (핵심)

### GET /api/v3/trade/history-orders
- 최대 조회 기간: **90일** (단, 1회 요청당 최대 30일)
- 최대 limit: 100

**Request 파라미터:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| category | String | Y | `USDT-FUTURES` |
| symbol | String | N | 심볼명 (예: BTCUSDT) |
| startTime | String | N | 밀리초 타임스탬프 |
| endTime | String | N | 밀리초 타임스탬프 (startTime~endTime ≤ 30일) |
| limit | String | N | 기본 100, 최대 100 |
| cursor | String | N | 페이지네이션 커서 (이전 응답의 cursor 사용) |

**Response:**
```json
{
  "code": "00000",
  "msg": "success",
  "data": {
    "list": [
      {
        "orderId": "111111111111111111",
        "symbol": "BTCUSDT",
        "side": "sell",
        "posSide": "long",
        "orderStatus": "filled",
        "cumExecQty": "0.429",
        "avgPrice": "49534.4",
        "feeDetail": [
          { "feeCoin": "USDT", "fee": "4.2500586" }
        ],
        "createdTime": "1730181468493"
      }
    ],
    "cursor": "1233319323918499840"
  }
}
```

**성공 코드:** `"00000"` (문자열)

---

## Side 매핑 (포지션 알고리즘용)

V3는 단순히 `side` 필드만 사용:

| side 값 | TradeSide |
|---------|-----------|
| `buy`  | BUY |
| `sell` | SELL |

---

## 응답 필드 매핑

| Bitget 필드 | 설명 | Trade 엔티티 필드 |
|------------|------|-----------------|
| `orderId` | 주문 고유 ID | `exchangeTradeId` |
| `symbol` | 종목 (예: BTCUSDT) | `symbol` |
| `side` | buy/sell | `side` |
| `cumExecQty` | 체결 수량 (base coin) | `qty` |
| `avgPrice` | 평균 체결가 | `price` |
| `feeDetail[].fee` 합산 | 수수료 | `fee` |
| `createdTime` | 체결 시각 (밀리초) | `tradedAt` |

- `orderStatus != "filled"` 인 주문 제외 (취소/미체결)

---

## 페이지네이션

- 첫 요청: cursor 파라미터 없이 호출
- 응답에 `cursor` 있으면 다음 페이지 존재
- 다음 요청에 이전 응답의 `cursor` 값 사용
- 30일 슬라이딩 윈도우 × 3회 = 90일 전체 커버

---

## 주의사항

- 1회 startTime~endTime 범위 ≤ **30일** (초과 시 오류)
- 90일 이전 데이터 조회 불가
