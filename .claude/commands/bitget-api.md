# Bitget API 레퍼런스

## 인증 정보
- **3가지 자격증명 필요**: apiKey, secretKey, passphrase (Bybit/Upbit의 2가지와 다름)
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

### 서명 생성
```
Step 1: HMAC-SHA256(secretKey, 서명문자열)
Step 2: Base64 인코딩
```

### Java 예시
```java
String preHash = timestamp + "GET" + "/api/mix/v1/order/historyProductType" + "?" + queryString;
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secretKey.getBytes("UTF-8"), "HmacSHA256"));
String sign = Base64.getEncoder().encodeToString(mac.doFinal(preHash.getBytes("UTF-8")));
```

---

## 선물 거래 내역 조회 (핵심)

### GET /api/mix/v1/order/historyProductType
- 심볼 불필요 (productType으로 전체 조회)
- 최대 조회 기간: 90일
- 최대 pageSize: 100

**Request 파라미터:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| productType | String | Y | `umcbl` (USDT선물) |
| startTime | String | Y | 밀리초 타임스탬프 |
| endTime | String | Y | 밀리초 타임스탬프 |
| pageSize | String | Y | 최대 100 |
| lastEndId | String | N | 페이지네이션 커서 |

**Response:**
```json
{
  "code": "00000",
  "data": {
    "nextFlag": false,
    "endId": "963544804144852112",
    "orderList": [
      {
        "orderId": "963544804144852112",
        "symbol": "BTCUSDT_UMCBL",
        "side": "open_long",
        "filledQty": "0.001",
        "priceAvg": "50000.00",
        "fee": "-0.03",
        "cTime": "1684134644509"
      }
    ]
  }
}
```

**성공 코드:** `"00000"` (문자열, Bybit의 정수 0과 다름)

---

## Side 매핑 (포지션 알고리즘용)

| Bitget side | 의미 | TradeSide |
|------------|------|-----------|
| `open_long` | 롱 진입 (매수) | BUY |
| `close_long` | 롱 청산 (매도) | SELL |
| `open_short` | 숏 진입 (매도) | SELL |
| `close_short` | 숏 청산 (매수) | BUY |

---

## 응답 필드 매핑

| Bitget 필드 | 설명 | Trade 엔티티 필드 |
|------------|------|-----------------|
| `orderId` | 거래 고유 ID | `exchangeTradeId` |
| `symbol` | 종목 (예: BTCUSDT_UMCBL) | `symbol` |
| `side` | 거래 방향 | `side` (위 매핑 적용) |
| `filledQty` | 체결 수량 | `qty` |
| `priceAvg` | 평균 체결가 | `price` |
| `fee` | 수수료 (음수) | `fee` (절댓값) |
| `cTime` | 체결 시각 (밀리초) | `tradedAt` |

---

## 페이지네이션

- `data.nextFlag == true` 이면 다음 페이지 존재
- `data.endId` 를 다음 요청의 `lastEndId` 로 사용
- 90일 슬라이딩 윈도우 방식으로 전체 기간 조회
