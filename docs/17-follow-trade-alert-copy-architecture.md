# Follow, Trade Alert, Copy Signal Architecture

## 1. 문서 목적

사용자 간 관계와 매매 추적 기능을 하나의 `Follow` 기능으로 처리하지 않고, 책임과 위험 수준에 따라 아래 네 단계로 분리한다.

1. **Follow** — 커뮤니티 관계
2. **Trade Alerts** — 매매 발생 알림
3. **Copy Signals** — 따라 하기 위한 구조화된 신호
4. **Auto Copy** — 사용자의 거래소에 실제 주문 실행

이 구분은 제품 화면뿐 아니라 권한, 데이터 동기화, 이벤트 처리, 위험 고지에도 동일하게 적용한다.

> 현재 구현 범위: Follow와 일반 알림, 활동 기반 REST 동기화 큐가 존재한다. 팔로워 수요 기반 우선순위, Trade Alerts, Copy Signals, Auto Copy는 아래 설계에 따라 단계적으로 구현할 기능이다.

---

## 2. 기능 단계

### 2.1 Follow

커뮤니티에서 다른 트레이더의 공개 게시물과 프로필을 구독하는 관계다.

- 실제 매매 알림을 보장하지 않는다.
- 거래소 API 동기화 우선순위를 높이지 않는다.
- 게시물, 공개 일기, 프로필 활동을 피드에 노출한다.
- 언팔로우하면 관계만 해제하며 거래 데이터에는 영향을 주지 않는다.

### 2.2 Trade Alerts

팔로우한 트레이더에게 새로운 진입, 청산 또는 중요 체결이 발견됐을 때 알림을 받는 기능이다.

- 팔로워가 알림을 활성화한 발행자는 미접속 상태여도 빠른 동기화 대상으로 유지한다.
- REST 폴링이므로 완전한 실시간이 아니라 목표 지연 시간을 명시한다.
- 같은 체결에 대한 알림은 한 번만 발송한다.
- 팔로워별로 진입, 청산, 최소 거래금액, 알림 채널을 설정할 수 있다.
- 발행자가 `Share trade activity`를 끄면 신규 매매 알림을 생성하지 않는다.

권장 목표 지연:

| 상태 | REST 동기화 목표 |
|---|---:|
| 실시간 매매 알림 구독자가 있음 | 10~30초 |
| 일반 팔로워만 있음 | 1~5분 |
| 팔로워가 없고 사용자 접속 중 | 약 30초 |
| 팔로워가 없고 사용자 미접속 | 활동성에 따라 5분~24시간 |

### 2.3 Copy Signals

알림을 사람이 읽는 수준을 넘어, 따라 하기에 필요한 정보를 정규화해 제공하는 기능이다.

- 거래소, 심볼, 방향, 진입/청산, 체결가, 수량, 감지 시각을 포함한다.
- 발행자의 실제 수량을 그대로 복사하지 않고 비율 또는 위험 기준으로 변환할 수 있다.
- 분할 체결은 하나의 논리적 신호로 묶거나 후속 업데이트로 처리한다.
- 신호가 늦게 감지됐거나 가격 괴리가 크면 `STALE` 또는 `PRICE_DEVIATION` 상태로 표시한다.
- 이 단계에서는 실제 주문을 자동 제출하지 않는다.

### 2.4 Auto Copy

Copy Signal을 바탕으로 구독자의 거래소 계정에 실제 주문을 제출하는 별도 주문 시스템이다.

- 명시적 사용자 동의와 위험 고지가 필수다.
- 주문 권한 API Key를 조회 전용 키와 분리한다.
- 최대 주문금액, 일일 손실, 레버리지, 허용 심볼, 가격 괴리 한도를 적용한다.
- 주문 전후 상태, 부분 체결, 취소, 재시도 및 감사 로그를 보존한다.
- Trade Alerts와 동일한 알림 시스템 안에서 단순히 주문 API만 추가하는 방식으로 구현하지 않는다.

---

## 3. 핵심 동기화 원칙

### 3.1 발행자 기준 한 번만 조회

팔로워마다 발행자의 거래소 API를 호출하지 않는다.

```text
Exchange REST API
       |
       | publisher B 기준 1회 동기화
       v
New trade detection
       |
       v
trade_events 생성 및 중복 제거
       |
       v
followers A, C, D에게 fan-out
```

B에게 팔로워가 1명이든 10,000명이든 거래소 조회 횟수는 B의 연결 수를 기준으로 결정한다. 팔로워 알림 전파는 별도 내부 큐에서 처리한다.

### 3.2 접속 상태와 발행자 수요 분리

동기화 우선순위는 본인의 접속 여부만으로 결정하지 않는다.

```text
priority = manual request
         + active session
         + active trade-alert subscribers
         + follower demand
         + stale-data age
         - repeated-failure penalty
```

따라서 B가 사이트에 접속하지 않아도 B의 매매 알림을 기다리는 사용자가 있으면 높은 우선순위를 유지한다.

### 3.3 거래소 연결과 사용자 알림 연결 분리

- **거래소 → 서버:** 거래소별 REST API와 백엔드 작업 큐
- **서버 → 브라우저:** SSE 또는 애플리케이션 WebSocket
- 브라우저 연결 수가 늘어나도 거래소 연결 수가 함께 증가하지 않는다.
- 브라우저가 오프라인이면 DB 알림을 보존하고 다음 접속 때 읽지 않은 알림을 제공한다.

---

## 4. 권장 데이터 모델

### `follow_alert_settings`

팔로워가 특정 발행자의 어떤 이벤트를 받을지 저장한다.

- `follower_id`
- `publisher_id`
- `trade_opened_enabled`
- `trade_closed_enabled`
- `min_notional_usd`
- `delivery_in_app`
- `delivery_sound`
- `created_at`, `updated_at`
- `(follower_id, publisher_id)` unique

### `trade_events`

동기화 중 발견된 체결을 알림 가능한 이벤트로 정규화한다.

- `id`
- `publisher_id`
- `exchange`
- `exchange_trade_id`
- `event_type` — `OPENED`, `INCREASED`, `REDUCED`, `CLOSED`
- `symbol`, `side`, `price`, `quantity`, `notional_usd`
- `executed_at`, `detected_at`
- `payload`
- `(publisher_id, exchange, exchange_trade_id, event_type)` unique

### `trade_alert_deliveries`

팔로워별 전달 상태와 중복 발송을 관리한다.

- `trade_event_id`
- `recipient_id`
- `status` — `PENDING`, `DELIVERED`, `FAILED`, `SKIPPED`
- `delivered_at`
- `failure_count`, `last_error`
- `(trade_event_id, recipient_id)` unique

### `publisher_sync_demand`

매번 팔로워 테이블 전체를 집계하지 않도록 발행자별 수요를 요약한다.

- `publisher_id`
- `alert_subscriber_count`
- `ordinary_follower_count`
- `highest_required_frequency_seconds`
- `updated_at`

Follow 또는 Trade Alert 설정이 바뀔 때 이 값을 갱신한다.

---

## 5. 작업 큐 분리

### Exchange Sync Queue

- 외부 거래소 REST API 호출 담당
- 사용자/거래소 연결 단위 작업
- 거래소별 rate limit 적용
- 실패 시 exponential backoff
- 인증 또는 권한 문제는 `ACTION_REQUIRED`
- 새 체결 발견 시 `trade_events`에 기록

### Alert Fan-out Queue

- `trade_events`를 구독자에게 확장
- 팔로워별 설정과 발행자 공개 설정 확인
- `trade_alert_deliveries` 생성
- 대규모 팔로워 보유 계정을 작은 batch로 나눠 처리

### Notification Delivery Queue

- 인앱 알림 DB 저장
- 접속 중이면 SSE/WebSocket으로 즉시 전달
- 소리 알림 여부는 클라이언트 설정에 따름
- 재연결 시 누락된 알림을 REST로 복구

세 작업을 분리하면 거래소 API 지연이 알림 전송 스레드를 점유하지 않고, 팔로워가 많은 한 계정이 다른 동기화 작업을 막지 않는다.

---

## 6. 중복 및 이벤트 판정

1. 거래소 고유 체결 ID를 최우선 idempotency key로 사용한다.
2. 고유 ID가 불안정한 거래소는 계정, 심볼, 방향, 수량, 가격, 체결시각을 조합한 fingerprint를 사용한다.
3. 체결 저장과 `trade_events` 생성은 같은 트랜잭션 또는 outbox pattern으로 묶는다.
4. 알림 전달은 at-least-once로 처리하되 unique constraint로 사용자에게 중복 노출되지 않게 한다.
5. 포지션 변화는 단일 체결이 아니라 이전 포지션과 새 포지션의 차이로 `OPENED`, `INCREASED`, `REDUCED`, `CLOSED`를 판정한다.

---

## 7. 개인정보 및 제품 정책

- 기본값은 매매 활동 비공개로 둔다.
- 발행자가 공개 범위를 직접 선택한다.
- 공개 대상은 `PRIVATE`, `FOLLOWERS`, `PUBLIC`으로 나눌 수 있다.
- 정확한 수량과 금액을 숨기고 비율만 공개하는 옵션을 제공한다.
- 차단 관계에서는 팔로우, 알림 생성 및 공개 데이터 조회를 모두 금지한다.
- 과거 공개를 중단해도 이미 전달된 알림의 감사 기록과 사용자 노출 정책을 구분한다.
- Trade Alerts는 투자 조언이나 주문 체결 보장이 아님을 명시한다.
- REST 감지 지연과 가격 괴리를 UI에 표시한다.

---

## 8. 장애 및 지연 처리

- 거래소 rate limit: 해당 거래소 큐만 지연하고 다른 거래소는 계속 처리
- 인증 실패: `ACTION_REQUIRED` 전환 후 발행자에게 연결 수정 알림
- 일시 장애: 1분 → 5분 → 30분 → 1시간 backoff
- 오래된 신호: 알림에는 실제 체결시각과 감지 지연을 함께 표시
- 알림 전송 실패: DB에는 읽지 않은 알림을 유지하고 재접속 시 복구
- 서버 재시작: DB 큐의 만료된 lock을 회수해 작업 재개

Copy Signal의 기본 유효시간을 초과한 이벤트는 자동 실행 대상으로 사용하지 않는다.

---

## 9. 단계별 구현 순서

### Phase 1 — Trade Alerts

1. `follow_alert_settings`, `trade_events`, `trade_alert_deliveries` migration
2. 발행자 매매 공유 동의 설정
3. 팔로워 수요 기반 `exchange_sync_state` 우선순위 반영
4. 신규 체결 이벤트와 중복 방지
5. fan-out worker와 인앱 알림 연결
6. Follow 화면에 `Trade alerts` 토글 추가

### Phase 2 — Reliability

1. outbox pattern 도입
2. 거래소별 rate-limit budget
3. 큐 지연시간, 실패율, 알림 전달시간 지표
4. 대규모 팔로워 batch fan-out
5. SSE 재연결 및 누락 알림 복구

### Phase 3 — Copy Signals

1. 포지션 변화 기반 신호 정규화
2. 신호 유효시간과 가격 괴리 계산
3. 수량 비율 및 위험 기준 변환
4. 신호 확인 화면과 수동 주문 연결

### Phase 4 — Auto Copy

별도의 보안 및 주문 실행 설계 검토 후 진행한다. 조회 전용 동기화 키와 주문 권한 키를 분리하고, 위험 한도와 비상 중지 기능이 준비되기 전에는 활성화하지 않는다.

---

## 10. 완료 기준

- 발행자 B가 미접속이어도 활성 Trade Alert 구독자가 있으면 목표 주기로 동기화된다.
- B의 거래소는 팔로워 수와 무관하게 동기화 주기당 한 번만 조회한다.
- 하나의 체결은 A에게 한 번만 전달된다.
- A가 오프라인이어도 다음 접속에서 알림을 확인할 수 있다.
- B가 매매 공유를 끄면 이후 이벤트가 팔로워에게 전달되지 않는다.
- 거래소 장애나 특정 대형 계정이 다른 사용자 동기화를 막지 않는다.
- UI에서 Follow, Trade Alerts, Copy Signals, Auto Copy의 의미와 위험이 혼동되지 않는다.
