# 10 — Bitget 거래소 연동

완료일: 2026-03-18

---

## 개요

Bitget 선물 거래소(UMCBL) 연동 구현.
HMAC-SHA256 + Base64 서명 방식과 Passphrase(3번째 자격증명)가 필요한 Bitget 전용 인증 처리.

---

## 구현 파일 목록

### 백엔드

| 파일 | 역할 |
|------|------|
| `backend/.../exchange/BitgetClient.java` | Bitget API 호출 (90일 슬라이딩 윈도우, HMAC+Base64 서명) |
| `backend/.../exchange/ExchangeKey.java` | Exchange enum에 BITGET 추가, passphrase 필드 추가 |
| `backend/.../exchange/ExchangeKeyService.java` | saveKey/getDecryptedKey에 passphrase 파라미터 추가 |
| `backend/.../exchange/ExchangeKeyController.java` | SaveKeyRequest에 passphrase 필드 추가 |
| `backend/.../trade/TradeService.java` | syncBitgetTrades() 메서드 추가 |
| `backend/.../trade/TradeController.java` | POST /api/trades/sync/bitget 엔드포인트 추가 |
| `database/migrations/V5__bitget_passphrase.sql` | exchange_keys 테이블에 passphrase 컬럼 추가 |

### 프론트엔드

| 파일 | 역할 |
|------|------|
| `frontend/src/api/exchangeApi.js` | saveExchangeKey에 passphrase 파라미터 추가, syncBitgetTrades() 추가 |
| `frontend/src/pages/ExchangeKeyPage.jsx` | BITGET 거래소 탭 + Passphrase 입력 필드 추가 |
| `frontend/src/pages/TradeListPage.jsx` | BITGET 탭 + Bitget 동기화 버튼 추가 |
| `frontend/src/styles/global.css` | btn-bitget, badge-bitget, active-bitget 스타일 추가 |

### 명령 파일

| 파일 | 역할 |
|------|------|
| `.claude/commands/bitget-api.md` | Bitget API 구조화 레퍼런스 (서명, 엔드포인트, 필드 매핑) |

---

## Bitget vs Bybit/Upbit 차이점

| 항목 | Bybit | Bitget |
|------|-------|--------|
| 자격증명 | 2개 (apiKey, secretKey) | 3개 (apiKey, secretKey, **passphrase**) |
| 서명 방식 | HMAC-SHA256 → HEX | HMAC-SHA256 → **Base64** |
| 성공 코드 | 정수 `0` | 문자열 `"00000"` |
| 거래 조회 | 카테고리별 (7일 윈도우) | productType별 (90일 윈도우) |

---

## Side 매핑

| Bitget side | 의미 | TradeSide |
|------------|------|-----------|
| `open_long` | 롱 진입 | BUY |
| `close_long` | 롱 청산 | SELL |
| `open_short` | 숏 진입 | SELL |
| `close_short` | 숏 청산 | BUY |

---

## API 명세

```
POST /api/trades/sync/bitget
Authorization: Bearer {token}

Response 200: { "savedCount": 42 }
Response 502: { "error": "에러 메시지" }
```

---

## DB 변경 사항

```sql
-- V5 마이그레이션
ALTER TABLE exchange_keys ADD COLUMN IF NOT EXISTS passphrase VARCHAR(512);
```

---

## 주의사항

- Bitget 선물(UMCBL)만 지원 (현물 미지원 — spot API는 symbol 필수라 전체 조회 불가)
- Passphrase는 AES-256 암호화 후 저장
- 조회 범위: 최근 1년 (초기), 마지막 거래 이후 (증분)
