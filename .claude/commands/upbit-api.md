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

## 3. 주문 내역 조회

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

## 4. 에러 코드

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
