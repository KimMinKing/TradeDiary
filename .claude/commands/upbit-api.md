---
description: Upbit REST API 인증/자산조회/주문내역 레퍼런스 (공식 문서 기반, Java OkHttpClient 예시 포함)
argument-hint: 없음 (그냥 /upbit-api 실행)
---

# Upbit API 레퍼런스

Base URL: `https://api.upbit.com/v1`

TLS 1.2 이상만 지원 (1.3 권장)

---

## 1. 인증 (JWT + HMAC512)

### 개요

- JWT 토큰 기반 인증 (Bearer)
- 알고리즘: **HMAC-SHA512** (REST API)
- Secret Key는 Base64 인코딩되어 있지 않음 → 별도 디코딩 불필요, `getBytes(UTF_8)` 그대로 사용

### JWT Payload 구조

| Key | 설명 | 필수 |
|-----|------|------|
| `access_key` | API Key의 Access Key | 필수 |
| `nonce` | 매 요청마다 새로운 UUID | 필수 |
| `query_hash` | 쿼리스트링(또는 Body)의 SHA-512 Hash HEX값 | 쿼리/Body 있을 때 필수 |
| `query_hash_alg` | Hash 알고리즘명. 기본값 `SHA512` | 선택 |

### 요청 헤더

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json; charset=utf-8   ← POST 요청 시 필수
```

---

### Java 구현 예시 (공식 문서 기반)

```java
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;
import okhttp3.*;

// [용도] 문자열을 SHA-512로 해시하여 HEX 반환 / [호출] createJwt()
public static String sha512(String input) throws Exception {
    MessageDigest md = MessageDigest.getInstance("SHA-512");
    md.update(input.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(md.digest()); // Java 17+
}

// [용도] JWT 토큰 생성 / [호출] 각 API 호출 메서드
private static String createJwt(String accessKey, String secretKey, String queryString)
        throws Exception {
    byte[] secretKeyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
    Algorithm algorithm;
    try {
        algorithm = Algorithm.HMAC512(secretKeyBytes);
    } finally {
        Arrays.fill(secretKeyBytes, (byte) 0); // 보안: 사용 후 즉시 초기화
    }

    JWTCreator.Builder builder = JWT.create()
        .withHeader(Collections.singletonMap("alg", "HS512"))
        .withClaim("access_key", accessKey)
        .withClaim("nonce", UUID.randomUUID().toString());

    if (queryString != null && !queryString.isEmpty()) {
        builder.withClaim("query_hash", sha512(queryString));
        builder.withClaim("query_hash_alg", "SHA512");
    }
    return builder.sign(algorithm);
}
```

---

### 쿼리스트링 생성 규칙

**GET/DELETE 요청**

```java
// [용도] Map<String, Object> 파라미터를 QueryString으로 변환 / [호출] 각 GET API 메서드
// List 값은 key[]=val1&key[]=val2 형식, [] 문자는 URL 인코딩 제외
public static String buildQueryString(Map<String, Object> params) {
    List<String> components = new ArrayList<>();
    for (Map.Entry<String, Object> entry : params.entrySet()) {
        String key = entry.getKey();
        Object value = entry.getValue();
        if (value == null) continue;

        List<Object> values = (value instanceof List)
            ? (List<Object>) value
            : Collections.singletonList(value);

        for (Object val : values) {
            String encodedKey = URLEncoder.encode(
                key.endsWith("[]") ? key : key + "[]", StandardCharsets.UTF_8
            ).replace("%5B", "[").replace("%5D", "]"); // [] 는 인코딩 제외

            String encodedVal = URLEncoder.encode(String.valueOf(val), StandardCharsets.UTF_8);
            components.add(encodedKey + "=" + encodedVal);
        }
    }
    return String.join("&", components);
}
```

> **주의**: `query_hash`는 **URL 인코딩하기 전** 쿼리스트링을 기준으로 Hash

**POST 요청** (JSON Body → QueryString 변환 후 Hash)

```java
// [용도] JSON Body를 QueryString 형식으로 변환 (POST query_hash 생성용) / [호출] createJwt()
public static String jsonToQueryString(String jsonString) {
    Map<String, Object> bodyMap = gson.fromJson(jsonString, Map.class);
    List<String> queryElements = new ArrayList<>();
    for (Map.Entry<String, Object> entry : bodyMap.entrySet()) {
        if (entry.getValue() != null) {
            String encodedKey = URLEncoder.encode(entry.getKey(), "UTF-8")
                .replace("%5B", "[").replace("%5D", "]");
            String encodedValue = URLEncoder.encode(String.valueOf(entry.getValue()), "UTF-8");
            queryElements.add(encodedKey + "=" + encodedValue);
        }
    }
    return String.join("&", queryElements);
}
```

---

### GET 요청 전체 예시

```java
// states[] 같은 배열 파라미터 포함 GET 요청
Map<String, Object> queryParams = new HashMap<>();
queryParams.put("states[]", Arrays.asList("wait", "watch"));
queryParams.put("limit", 100);

String queryString = buildQueryString(queryParams);
// → states[]=wait&states[]=watch&limit=100

String jwtToken = createJwt(accessKey, secretKey, queryString);

OkHttpClient client = new OkHttpClient();
Request request = new Request.Builder()
    .url("https://api.upbit.com/v1/orders/open?" + queryString)
    .get()
    .addHeader("Accept", "application/json")
    .addHeader("Authorization", "Bearer " + jwtToken)
    .build();

Response response = client.newCall(request).execute();
```

### POST 요청 전체 예시

```java
String jsonBody = "{\"market\":\"KRW-BTC\",\"side\":\"bid\",\"volume\":\"0.0001\","
                + "\"price\":\"50000000\",\"ord_type\":\"limit\"}";
String queryStringBody = jsonToQueryString(jsonBody);
String jwtToken = createJwt(accessKey, secretKey, queryStringBody);

MediaType JSON = MediaType.parse("application/json; charset=utf-8");
Request request = new Request.Builder()
    .url("https://api.upbit.com/v1/orders")
    .post(RequestBody.create(jsonBody, JSON))
    .addHeader("Accept", "application/json")
    .addHeader("Authorization", "Bearer " + jwtToken)
    .build();
```

---

## 2. 자산 조회

```
GET /v1/accounts
```

쿼리 파라미터 없음 → JWT에 `query_hash` 불필요

### 응답 예시

```json
[
  {
    "currency": "KRW",
    "balance": "1000000.0",
    "locked": "0.0",
    "avg_buy_price": "0",
    "avg_buy_price_modified": false,
    "unit_currency": "KRW"
  },
  {
    "currency": "BTC",
    "balance": "2.0",
    "locked": "0.0",
    "avg_buy_price": "140000000",
    "avg_buy_price_modified": false,
    "unit_currency": "KRW"
  }
]
```

---

## 3. 체결 완료 주문 목록 조회 (거래 내역 동기화용)

```
GET /v1/orders/closed
```

> **TradeNote 거래 내역 동기화는 반드시 이 엔드포인트를 사용할 것**
> `/v1/order` = 단건 조회, `/v1/orders` = 특정 uuid 복수 조회 → 거래 내역 용도 아님

### 핵심 제약사항

| 항목 | 값 |
|------|-----|
| 최대 조회 기간 | **7일** (start_time~end_time 최대 7일) |
| start_time만 입력 시 | 해당 시각 기준 **이후 7일** |
| end_time만 입력 시 | 해당 시각 기준 **이전 7일** |
| 둘 다 미입력 시 | 요청 시각 기준 **이전 7일** |
| 최대 limit | 1000 |
| Rate Limit | 초당 30회 |

→ **1년치 가져오려면 7일 슬라이딩 윈도우** 방식으로 약 52번 호출 필요

### ord_type별 처리 (중요)

| ord_type | 의미 | avg_price | 주의사항 |
|----------|------|-----------|----------|
| `limit` | 지정가 매수/매도 | 있음 | 정상 처리 |
| `price` | **시장가 매수** | 있음 | `price` 필드 = 매수 총액(단가 아님), avg_price로 단가 계산 |
| `market` | **시장가 매도** | 있음 | `executed_funds / executed_volume`으로 평균가 계산 |
| `best` | 최유리 지정가 | 있음 | 정상 처리 |

### state별 처리 (중요)

| state | 의미 | 포함 여부 |
|-------|------|----------|
| `done` | 전량 체결 완료 | ✅ 항상 포함 |
| `cancel` | 취소 (부분 체결 포함) | ✅ **반드시 포함** |

> **시장가 매수(`ord_type=price`)는 소수점 잔량으로 인해 `state=cancel`로 끝나는 경우가 있음**
> `state=done`만 필터링하면 시장가 매수 거래가 누락됨
> → `state` 파라미터 미지정 (기본값 done+cancel) 또는 `states[]=done&states[]=cancel` 사용
> → 실제 체결 여부는 **`executed_volume > 0`** 으로 판단

### 파라미터

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `start_time` | 조회 시작 시각 | `2025-03-16T20:55:44+09:00` |
| `end_time` | 조회 종료 시각 | `2025-03-23T20:55:44+09:00` |
| `limit` | 최대 건수 (기본 100, 최대 1000) | `1000` |
| `order_by` | 정렬 (asc/desc) | `asc` |
| `state` | 단일 상태 필터 | `done` |
| `states[]` | 복수 상태 필터 (state와 동시 사용 불가) | `states[]=done&states[]=cancel` |

> **시간 형식**: 초 단위까지만 (나노초 포함 시 빈 배열 반환됨)
> ✅ `2025-03-16T20:55:44+09:00`
> ❌ `2025-03-16T20:55:44.2582271+09:00`

### query_hash 계산 규칙 (중요)

```
hash 계산: URL 인코딩 없이 원본값 그대로 SHA512
URL 전송:  값을 URL 인코딩해서 전송

예시) start_time=2025-03-16T20:55:44+09:00
  hash 입력: start_time=2025-03-16T20:55:44+09:00  ← 원본
  URL 전송:  start_time=2025-03-16T20%3A55%3A44%2B09%3A00  ← 인코딩
```

이유: Upbit 서버가 URL 디코딩 후 hash 검증 → 인코딩된 값으로 hash 계산 시 `invalid_query_payload` 401 에러

### 7일 슬라이딩 윈도우 Java 구현 예시

```java
LocalDateTime windowStart = startTime.truncatedTo(ChronoUnit.SECONDS);
LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

while (windowStart.isBefore(now)) {
    LocalDateTime windowEnd = windowStart.plusDays(7);
    if (windowEnd.isAfter(now)) windowEnd = now;

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("start_time", toIso(windowStart));  // KST +09:00, 초 단위
    params.put("end_time",   toIso(windowEnd));
    params.put("limit", "1000");
    params.put("order_by", "asc");
    // state 미지정 → done+cancel 기본값 (시장가 매수 누락 방지)

    String hashQs = buildQueryString(params, false);  // 원본값 (hash용)
    String urlQs  = buildQueryString(params, true);   // 인코딩 (URL용)
    String jwt    = createJwt(accessKey, secretKey, hashQs);

    // GET /v1/orders/closed?{urlQs}
    windowStart = windowEnd;
    Thread.sleep(200); // rate limit 방지
}
```

### 응답 주요 필드

```json
{
  "uuid": "aec7b38d-...",
  "side": "bid",           // bid=매수, ask=매도
  "ord_type": "limit",     // limit, price(시장가매수), market(시장가매도), best
  "market": "KRW-BTC",
  "state": "done",         // done, cancel
  "executed_volume": "0.0097809",
  "avg_price": "51136555.5",
  "executed_funds": "500000",
  "paid_fee": "249.95",
  "created_at": "2022-01-11T21:30:29+09:00"
}
```

## 4. 단건/복수 주문 조회 (참고용, 거래내역 동기화에는 사용하지 않음)

| 목적 | 엔드포인트 |
|------|------------|
| 단건 조회 | `GET /v1/order?uuid={uuid}` |
| 복수 uuid 조회 | `GET /v1/orders/uuids?uuids[]={uuid1}&uuids[]={uuid2}` |

단건 예시:
```java
Map<String, String> params = new HashMap<>();
params.put("uuid", "3b67e543-8ad3-48d0-8451-0dad315cae73");
String queryString = "uuid=" + params.get("uuid");
String jwtToken = createJwt(accessKey, secretKey, queryString);

Request request = new Request.Builder()
    .url("https://api.upbit.com/v1/order?" + queryString)
    .get()
    .addHeader("Authorization", "Bearer " + jwtToken)
    .build();
```

---

## 5. 에러 코드

| HTTP | 에러 코드 | 원인 |
|------|-----------|------|
| 400 | `create_ask_error` / `create_bid_error` | 주문 요청 정보 오류 |
| 400 | `insufficient_funds_ask` / `insufficient_funds_bid` | 잔고 부족 |
| 400 | `validation_error` | 필수 파라미터 누락 |
| 401 | `invalid_query_payload` | JWT 페이로드 오류 |
| 401 | `jwt_verification` | JWT 검증 실패 |
| 401 | `expired_access_key` | API Key 만료 |
| 401 | `nonce_used` | 이미 사용된 nonce |
| 401 | `no_authorization_ip` | 미등록 IP |
| 401 | `no_authorization_token` | 인증 토큰 누락 |
| 401 | `out_of_scope` | API Key 권한 부족 |
| 429 | - | Rate Limit 초과 |

에러 응답 형식:
```json
{
  "error": {
    "name": "jwt_verification",
    "message": "JWT 검증에 실패했습니다."
  }
}
```

---

## 의존성

```gradle
implementation 'com.auth0:java-jwt:4.4.0'
implementation 'com.squareup.okhttp3:okhttp:4.12.0'
implementation 'com.google.code.gson:gson:2.10.1'
```
