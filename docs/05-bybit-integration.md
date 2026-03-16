# 05. Bybit 거래소 연동 및 거래소 선택 UI

완료 날짜: 2026-03-16

---

## 개요

Bybit API 연동 및 거래소 선택 UI를 구현했습니다.
- Bybit 체결 내역 동기화 (`/v5/execution/list`, spot/linear/inverse 전 카테고리)
- 거래소 연동 페이지에서 Upbit/Bybit 탭 선택 방식으로 개편
- 거래 목록 페이지에서 거래소 필터 탭 및 각 거래소별 동기화 버튼 추가

---

## 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `backend/.../exchange/BybitClient.java` | Bybit API 호출 (인증, 7일 슬라이딩 윈도우, 커서 페이지네이션) |
| `backend/.../trade/TradeService.java` | `syncBybitTrades()` 추가 |
| `backend/.../trade/TradeController.java` | `POST /api/trades/sync/bybit` 실제 연결 |
| `frontend/src/pages/ExchangeKeyPage.jsx` | Upbit/Bybit 탭 선택 UI |
| `frontend/src/pages/TradeListPage.jsx` | 전체/Upbit/Bybit 필터 탭 + 각 동기화 버튼 |
| `frontend/src/api/exchangeApi.js` | `syncBybitTrades()`, `getTrades(exchange)` 추가 |

---

## Bybit API 인증 방식

- **알고리즘**: HMAC-SHA256 (lowercase HEX)
- **서명 대상**: `timestamp + apiKey + recvWindow + queryString`
- **요청 헤더**:
  - `X-BAPI-API-KEY`
  - `X-BAPI-SIGN`
  - `X-BAPI-TIMESTAMP` (UTC 밀리초)
  - `X-BAPI-RECV-WINDOW` (5000)

---

## 동기화 방식

### 엔드포인트
```
GET /v5/execution/list
```

### 카테고리별 조회
- `spot` — 현물 거래
- `linear` — USDT 선물
- `inverse` — 코인 선물

### 7일 슬라이딩 윈도우 (Upbit와 동일한 제약)
- Bybit도 startTime~endTime 최대 7일 제한
- 초기 동기화: 1년 전부터 7일씩 슬라이딩
- 증분 동기화: DB 마지막 거래 시각 이후

### 페이지네이션
- 응답의 `nextPageCursor` 값을 다음 요청의 `cursor`로 전달
- `nextPageCursor`가 빈 문자열이면 마지막 페이지

### 중복 방지
- `exchange_trade_id` = `execId` (Bybit 고유 체결 ID)
- DB에 이미 존재하면 저장 Skip

---

## 거래소 연동 페이지 변경사항

**이전**: Upbit 전용 고정 폼

**이후**: Upbit / Bybit 탭 선택 방식
- 탭 클릭 시 해당 거래소 폼으로 전환
- 등록된 거래소는 탭에 점(●) 표시
- 각 거래소별 안내 문구 및 버튼 색상 구분
  - Upbit: 파란색 (`#1677ff`)
  - Bybit: 주황색 (`#f97316`)

---

## API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | `/api/trades/sync/upbit` | Upbit 동기화 |
| POST | `/api/trades/sync/bybit` | Bybit 동기화 |
| GET | `/api/trades` | 전체 거래 목록 |
| GET | `/api/trades?exchange=UPBIT` | Upbit 거래만 |
| GET | `/api/trades?exchange=BYBIT` | Bybit 거래만 |
