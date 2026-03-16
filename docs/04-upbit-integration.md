# Phase 3 — Upbit 거래소 연동

## 완료 날짜
2026-03-16

## 개요
사용자가 Upbit API Key를 등록하면 AES-256으로 암호화해 저장하고,
Upbit API로 체결된 주문 내역을 가져와 trades 테이블에 저장하는 기능

## API 목록

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/exchange-keys` | API Key 등록 (암호화 저장) |
| GET | `/api/exchange-keys` | 등록된 거래소 목록 조회 |
| DELETE | `/api/exchange-keys/{exchange}` | API Key 삭제 |
| POST | `/api/trades/sync/upbit` | Upbit 거래 내역 동기화 |
| GET | `/api/trades` | 전체 거래 목록 조회 |

## 흐름

```
1. 사용자 → API Key 입력
2. 백엔드 → AES-256 암호화 → exchange_keys 테이블 저장
3. 동기화 요청 → 복호화 → Upbit API 호출
4. 체결 완료 주문(state=done) 가져오기 (페이지네이션, 100건씩)
5. 중복 확인 (exchange_trade_id 기준) → 신규 건만 trades 테이블 저장
```

## 구현 파일

### 백엔드
| 파일 | 역할 |
|---|---|
| `common/util/AesUtil.java` | AES-256-CBC 암호화/복호화 |
| `exchange/ExchangeKey.java` | exchange_keys 테이블 엔티티 |
| `exchange/ExchangeKeyRepository.java` | API Key CRUD |
| `exchange/ExchangeKeyService.java` | 암호화 저장/삭제/복호화 조회 |
| `exchange/ExchangeKeyController.java` | REST API 엔드포인트 |
| `exchange/UpbitClient.java` | Upbit JWT 인증 + 주문 내역 조회 |
| `trade/Trade.java` | trades 테이블 엔티티 |
| `trade/TradeSide.java` | BUY/SELL 열거형 |
| `trade/TradeRepository.java` | 거래 CRUD + 중복 확인 |
| `trade/TradeService.java` | 동기화 로직 + 거래 목록 조회 |
| `trade/TradeController.java` | REST API 엔드포인트 |

### 프론트엔드
| 파일 | 역할 |
|---|---|
| `api/exchangeApi.js` | 거래소 관련 API 호출 함수 |
| `pages/ExchangeKeyPage.jsx` | API Key 등록/삭제 화면 |
| `pages/TradeListPage.jsx` | 거래 내역 목록 + 동기화 버튼 |

## 보안
- API Key는 AES-256-CBC로 암호화 후 저장 (복호화는 서버 내부에서만)
- AES Secret Key는 환경변수(`AES_SECRET`)로 관리
- 조회 전용 권한(자산조회, 주문조회)만 허용, 출금 권한 불필요

## 환경변수 추가
```
AES_SECRET=임의의_32자_문자열
```

## 테스트
`backend/src/test/http/exchange.http` → IntelliJ HTTP Client로 실행
