---
description: Bybit REST API 인증/자산조회/거래내역/포지션 레퍼런스 (공식 문서 기반, Java 예시 포함)
argument-hint: 없음 (그냥 /bybit-api 실행)
---

# Bybit API 레퍼런스

### Base Endpoint

| 환경 | URL |
|------|-----|
| Testnet | `https://api-testnet.bybit.com` |
| Mainnet | `https://api.bybit.com` 또는 `https://api.bytick.com` |

---

## 1. 인증

### API Key 타입

| 타입 | 설명 | 서명 방식 |
|------|------|-----------|
| **System-generated** | Bybit가 생성한 키 쌍 (공개키 + 비밀키) | HMAC-SHA256 → lowercase HEX |
| **Auto-generated (RSA)** | 직접 생성한 RSA 키 쌍, 공개키만 Bybit에 등록 | RSA-SHA256 → Base64 |

> TradeNote에서는 **System-generated (HMAC)** 방식 사용

### 필수 요청 헤더

```
X-BAPI-API-KEY:     {API_KEY}
X-BAPI-SIGN:        {서명값}
X-BAPI-TIMESTAMP:   {현재 UTC 밀리초 타임스탬프}
X-BAPI-RECV-WINDOW: 5000   (단위: ms, 기본값 5000)
```

> **타임스탬프 유효 범위**: `server_time - recv_window <= timestamp < server_time + 1000`
> recv_window를 작게 설정할수록 보안이 높아지지만, 네트워크 지연 시 요청 실패 가능

### 서명 생성 (HMAC-SHA256)

**서명 대상 문자열:**
```
GET  요청: timestamp + apiKey + recvWindow + queryString
POST 요청: timestamp + apiKey + recvWindow + jsonBodyString
```

**예시 (GET):**
```
timestamp   = "1658384314791"
apiKey      = "XXXXXXXXXX"
recvWindow  = "5000"
queryString = "category=option&symbol=BTC-29JUL22-25000-C"

서명 대상: "1658384314791XXXXXXXXXX5000category=option&symbol=BTC-29JUL22-25000-C"
서명 결과: "410e0f387bafb7afd0f1722c068515e09945610124fa11774da1da857b72f30b"
```

**GET 요청 예시:**
```http
GET /v5/order/realtime?category=option&symbol=BTC-29JUL22-25000-C HTTP/1.1
Host: api-testnet.bybit.com
X-BAPI-SIGN: XXXXXXXXXX
X-BAPI-API-KEY: xxxxxxxxxxxxxxxxxx
X-BAPI-TIMESTAMP: 1658384431891
X-BAPI-RECV-WINDOW: 5000
```

---

## 2. 공통 응답 구조

```json
{
    "retCode": 0,
    "retMsg": "OK",
    "result": {},
    "retExtInfo": {},
    "time": 1671017382656
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `retCode` | number | 성공/에러 코드. `0` = 성공 |
| `retMsg` | string | `OK`, `success`, `SUCCESS`, `""` = 성공 |
| `result` | Object | 실제 응답 데이터 |
| `retExtInfo` | Object | 확장 정보 (대부분 `{}`) |
| `time` | number | 현재 타임스탬프 (ms) |

---

## 3. 자산 조회 (Wallet Balance)

```
GET /v5/account/wallet-balance
```

### Request Parameters

| Parameter | Required | Type | Comments |
|-----------|----------|------|----------|
| `accountType` | true | string | `UNIFIED` |
| `coin` | false | string | 코인명 (대문자). 여러 개는 콤마 구분: `USDT,USDC`. 미입력 시 잔고 있는 코인 전체 반환 |

### 요청 예시

```http
GET /v5/account/wallet-balance?accountType=UNIFIED&coin=BTC HTTP/1.1
Host: api-testnet.bybit.com
X-BAPI-SIGN: XXXXX
X-BAPI-API-KEY: xxxxxxxxxxxxxxxxxx
X-BAPI-TIMESTAMP: 1672125440406
X-BAPI-RECV-WINDOW: 5000
```

### 응답 주요 필드

| 필드 | 설명 |
|------|------|
| `totalEquity` | 총 자산 (USD 환산) |
| `totalWalletBalance` | 지갑 잔고 (USD) |
| `totalAvailableBalance` | 사용 가능 잔고 |
| `totalPerpUPL` | 선물 미실현 손익 |
| `coin[].walletBalance` | 코인별 지갑 잔고 |
| `coin[].unrealisedPnl` | 코인별 미실현 손익 |
| `coin[].cumRealisedPnl` | 코인별 누적 실현 손익 |

### 응답 예시

```json
{
    "retCode": 0,
    "retMsg": "OK",
    "result": {
        "list": [
            {
                "totalEquity": "3.31216591",
                "totalWalletBalance": "3.00326056",
                "totalAvailableBalance": "3.00326056",
                "totalPerpUPL": "0",
                "accountType": "UNIFIED",
                "coin": [
                    {
                        "coin": "BTC",
                        "walletBalance": "0.01",
                        "unrealisedPnl": "0",
                        "cumRealisedPnl": "0"
                    }
                ]
            }
        ]
    }
}
```

---

## 4. 거래 체결 내역 (Execution List)

> 포지션 묶기 알고리즘에 사용하는 **실제 체결 데이터**

```
GET /v5/execution/list
```

### Request Parameters

| Parameter | Required | Type | Comments |
|-----------|----------|------|----------|
| `category` | true | string | `linear` (USDT 선물) / `inverse` (코인 선물) / `spot` / `option` |
| `symbol` | false | string | 종목명 (예: `BTCUSDT`, 대문자) |
| `orderId` | false | string | 주문 ID |
| `orderLinkId` | false | string | 사용자 정의 주문 ID |
| `baseCoin` | false | string | 기준 코인 (대문자) |
| `startTime` | false | integer | 시작 밀리초 타임스탬프 |
| `endTime` | false | integer | 종료 밀리초 타임스탬프 |
| `execType` | false | string | 체결 타입 (Trade, Funding 등) |
| `limit` | false | integer | [1, 100], 기본 50 |
| `cursor` | false | string | 페이지네이션 커서 |

> **시간 범위 규칙**
> - 둘 다 미입력: 최근 7일
> - startTime만 입력: startTime ~ startTime+7일
> - endTime만 입력: endTime-7일 ~ endTime
> - 둘 다 입력: endTime - startTime ≤ 7일
>
> **파라미터 우선순위**: orderId > orderLinkId > symbol > baseCoin

### 응답 주요 필드

| 필드 | 설명 |
|------|------|
| `side` | `Buy` = 매수, `Sell` = 매도 |
| `execType` | `Trade` = 체결, `Funding` = 펀딩비 (필터 필요) |
| `execPrice` | 체결 가격 |
| `execQty` | 체결 수량 |
| `execFee` | 수수료 |
| `execTime` | 체결 밀리초 타임스탬프 |
| `closedSize` | 청산 수량 (`"0"` = 진입, 초과 = 청산) |
| `nextPageCursor` | 다음 페이지 커서 (빈 문자열이면 마지막) |

### Java 예시 (Bybit 공식 SDK)

```java
import com.bybit.api.client.config.BybitApiConfig;
import com.bybit.api.client.domain.trade.request.TradeOrderRequest;
import com.bybit.api.client.domain.*;
import com.bybit.api.client.domain.trade.*;
import com.bybit.api.client.service.BybitApiClientFactory;

var client = BybitApiClientFactory
    .newInstance("YOUR_API_KEY", "YOUR_API_SECRET", BybitApiConfig.TESTNET_DOMAIN)
    .newTradeRestClient();

var tradeHistoryRequest = TradeOrderRequest.builder()
    .category(CategoryType.LINEAR)
    .symbol("BTCUSDT")
    .execType(ExecType.Trade)
    .limit(100)
    .build();

System.out.println(client.getTradeHistory(tradeHistoryRequest));
```

---

## 5. 주문 내역 조회 (Order History)

```
GET /v5/order/history
```

### Request Parameters

| Parameter | Required | Type | Comments |
|-----------|----------|------|----------|
| `category` | true | string | `linear` / `inverse` / `spot` / `option` |
| `symbol` | false | string | 종목명 |
| `orderId` | false | string | 주문 ID |
| `orderStatus` | false | string | 주문 상태 필터 |
| `startTime` | false | integer | 시작 밀리초 타임스탬프 |
| `endTime` | false | integer | 종료 밀리초 타임스탬프 |
| `limit` | false | integer | [1, 50], 기본 20 |
| `cursor` | false | string | 페이지네이션 커서 |

> **조회 범위 규칙**
> - 최근 7일: Cancelled/Rejected 제외한 완료 주문 조회 가능
> - 최근 24시간: Cancelled/Rejected 포함 조회 가능
> - 7일 초과: 체결된 주문만 조회 가능

### Java 예시 (Bybit 공식 SDK)

```java
var orderHistory = TradeOrderRequest.builder()
    .category(CategoryType.LINEAR)
    .limit(10)
    .build();

System.out.println(client.getOrderHistory(orderHistory));
```

---

## 6. 포지션 조회 (Position Info)

```
GET /v5/position/list
```

### Request Parameters

| Parameter | Required | Type | Comments |
|-----------|----------|------|----------|
| `category` | true | string | `linear` / `inverse` / `option` |
| `symbol` | false | string | 종목명. 미입력 + settleCoin 지정 시 수량 > 0인 포지션만 반환 |
| `settleCoin` | false | string | `linear`: symbol 또는 settleCoin 중 하나 필수 |
| `limit` | false | integer | [1, 200], 기본 20 |
| `cursor` | false | string | 페이지네이션 커서 |

> `category=inverse`: `/v5/position/list?category=inverse` 로 전체 오픈 포지션 조회 가능

### 응답 주요 필드

| 필드 | 설명 |
|------|------|
| `side` | `Buy` = 롱, `Sell` = 숏, `""` = 포지션 없음 |
| `size` | 포지션 수량 (항상 양수) |
| `avgPrice` | 평균 진입가 |
| `unrealisedPnl` | 미실현 손익 |
| `cumRealisedPnl` | 누적 실현 손익 |
| `leverage` | 레버리지 |
| `liqPrice` | 청산가 |
| `positionIdx` | `0`: 단방향, `1`: 양방향 롱, `2`: 양방향 숏 |

### Java 예시 (Bybit 공식 SDK)

```java
import com.bybit.api.client.domain.position.*;
import com.bybit.api.client.domain.position.request.*;

var client = BybitApiClientFactory.newInstance().newAsyncPositionRestClient();
var positionListRequest = PositionDataRequest.builder()
    .category(CategoryType.LINEAR)
    .symbol("BTCUSDT")
    .build();

client.getPositionInfo(positionListRequest, System.out::println);
```

---

## retCode 주요 목록

| retCode | 의미 |
|---------|------|
| `0` | 성공 |
| `10001` | 파라미터 오류 |
| `10003` | API Key 유효하지 않음 |
| `10004` | 서명 오류 (시간 동기화 확인) |
| `10006` | Rate limit 초과 |
