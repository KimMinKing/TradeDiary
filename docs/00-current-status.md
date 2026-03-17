# TradeDiary — 현재 개발 현황

작성일: 2026-03-17

---

## 프로젝트 한 줄 소개

**코인 트레이더의 거래 기록 기반 성장 분석 플랫폼**
거래소 API 연동 → 거래 내역 자동 동기화 → 매매 일기 작성 → (예정) AI 리포트 / 통계 분석

---

## 기술 스택

| 구분 | 기술 | 선택 이유 |
|------|------|-----------|
| 백엔드 | Java 17 + Spring Boot 3 | 안정적인 엔터프라이즈 생태계, JPA/Security 통합 |
| 프론트엔드 | React 18 + Vite | 빠른 빌드, 컴포넌트 재사용성 |
| 상태관리 | Zustand | Redux 대비 간결한 API |
| HTTP 클라이언트 | Axios | 인터셉터로 토큰 자동 주입 |
| 데이터베이스 | PostgreSQL 16 | 관계형 데이터 무결성, 풍부한 쿼리 |
| 인증 | JWT (AccessToken + RefreshToken) | Stateless, 서버 부하 최소화 |
| 암호화 | AES-256 | 거래소 API Key 안전 저장 |
| 배포 | Docker + Docker Compose | 환경 일관성, 이식성 |
| 웹서버 | nginx | 리버스 프록시, 정적 파일 서빙 |
| 외부 API | Upbit REST, Bybit REST | 국내/해외 코인 거래소 연동 |

---

## 폴더 구조

```
TradeDiary/
├── docker-compose.yml              ← 전체 서비스 오케스트레이션
├── .env                            ← 환경변수 (JWT_SECRET, AES_SECRET)
├── database/
│   ├── schema.sql                  ← DB 초기 생성 스크립트
│   └── migrations/
│       └── V2__trade_journal.sql   ← 매매 일기 기능 마이그레이션
├── docs/                           ← 기능별 완료 문서
├── backend/                        ← Spring Boot 메인 서버
└── frontend/                       ← React 프론트엔드
```

---

## 백엔드 구조 (`backend/src/main/java/com/tradediary/`)

```
common/
├── config/
│   ├── CorsConfig.java             ← CORS 허용 설정
│   └── SecurityConfig.java         ← Spring Security (JWT 필터 등록, 공개 URL 설정)
├── exception/
│   ├── ErrorCode.java              ← 전체 에러 코드 enum (HTTP 상태코드 포함)
│   ├── BusinessException.java      ← 비즈니스 예외 클래스
│   └── GlobalExceptionHandler.java ← 전역 예외 처리
├── security/
│   ├── JwtUtil.java                ← JWT 생성 / 검증 유틸
│   ├── JwtFilter.java              ← 매 요청마다 토큰 검증 필터
│   ├── RefreshToken.java           ← RefreshToken 엔티티
│   └── RefreshTokenRepository.java
└── util/
    └── AesUtil.java                ← AES-256 암/복호화

user/
├── User.java                       ← 사용자 엔티티
├── UserRepository.java
├── UserService.java                ← 회원가입 / 로그인 / 토큰 재발급
└── AuthController.java             ← POST /api/auth/signup, /login, /refresh

exchange/
├── ExchangeKey.java                ← 거래소 API Key 엔티티 (암호화 저장)
├── ExchangeKeyService.java         ← Key 등록/삭제, AES 복호화
├── ExchangeKeyController.java      ← POST/GET/DELETE /api/exchange-keys
├── ExchangeRateController.java     ← GET /api/exchange-rate (실시간 환율)
├── UpbitClient.java                ← Upbit API 호출 (JWT 인증, 페이지네이션)
└── BybitClient.java                ← Bybit API 호출 (HMAC-SHA256 서명)

trade/
├── Trade.java                      ← 거래 원본 데이터 엔티티
├── TradeSide.java                  ← BUY/SELL enum
├── TradeRepository.java
├── TradeService.java               ← Upbit/Bybit 동기화 (초기 1년 + 증분)
└── TradeController.java            ← POST /sync/upbit, /sync/bybit | GET /api/trades

journal/
├── StrategyTag.java                ← 전략 태그 엔티티 (NULL user_id = 기본 제공)
├── TradeJournal.java               ← 매매 일기 엔티티
├── JournalStrategyTag.java         ← 일기-태그 M:N 연결
├── StrategyTagRepository.java
├── TradeJournalRepository.java
├── StrategyTagService.java         ← 태그 목록 / 생성 / 삭제
├── TradeJournalService.java        ← 일기 CRUD
├── StrategyTagController.java      ← GET/POST/DELETE /api/strategy-tags
└── TradeJournalController.java     ← GET/POST/PUT/DELETE /api/journals
```

---

## 프론트엔드 구조 (`frontend/src/`)

```
api/
├── authApi.js          ← Axios 인스턴스 (AccessToken 자동 헤더, 401 시 로그아웃)
├── exchangeApi.js      ← 거래소 Key 등록/삭제/동기화/거래 목록
└── journalApi.js       ← 매매 일기 / 전략 태그 API 호출

store/
└── authStore.js        ← Zustand 인증 상태 (로그인/로그아웃/토큰 만료 체크)

components/
├── Layout.jsx          ← 인증 페이지 공통 레이아웃 래퍼
├── Navbar.jsx          ← 상단 네비 (데스크탑) + 하단 탭바 (모바일 반응형)
└── JournalFormModal.jsx ← 일기 작성/수정 모달

pages/
├── LoginPage.jsx       ← 로그인
├── SignupPage.jsx       ← 회원가입
├── DashboardPage.jsx   ← 메인 대시보드
├── ExchangeKeyPage.jsx ← 거래소 API Key 등록/관리
├── TradeListPage.jsx   ← 거래 목록 (탭 필터 + 날짜 필터 + KRW/USD 토글)
└── JournalPage.jsx     ← 매매 일기 목록/작성/수정/삭제

styles/
└── global.css          ← 전체 디자인 시스템 (다크 트레이딩 터미널 테마)
```

---

## DB 테이블 구조

```
users                  ← 사용자 계정 (email, password, nickname)
refresh_tokens         ← JWT RefreshToken 저장
exchange_keys          ← 거래소 API Key (AES-256 암호화된 값 저장)
trades                 ← 거래 원본 데이터 (거래소에서 동기화)
positions              ← [미구현] 포지션 (trades를 묶은 것)
strategy_tags          ← 전략 태그 (기본 8개 + 사용자 커스텀)
trade_journals         ← 매매 일기 (이유, 감정, 메모)
journal_strategy_tags  ← 일기-태그 M:N 연결
trade_stats            ← [미구현] 통계 캐시
streak_records         ← [미구현] 연속 일기 기록
```

---

## 구현 완료 기능

### Phase 1-2: 기반 + 인증
- [x] 프로젝트 초기 설정 (Spring Boot + React + Docker)
- [x] PostgreSQL DB 설계 및 테이블 생성
- [x] 회원가입 / 로그인 API (Spring Security + JWT)
- [x] RefreshToken 자동 재발급
- [x] 토큰 만료 시 자동 로그아웃 + `/login` 리다이렉트
- [x] 절전모드 복귀 / 탭 포커스 시 만료 재확인

### Phase 3: 거래소 연동
- [x] Upbit API 연동 (`/v1/orders/closed`, JWT query_hash 인증)
- [x] Bybit API 연동 (spot/linear/inverse, HMAC-SHA256 인증)
- [x] 거래소 API Key AES-256 암호화 저장
- [x] 초기 동기화 (최근 1년) + 증분 동기화 (마지막 거래 이후)
- [x] 5분 주기 자동 스케줄러

### Phase 4: 매매 일기
- [x] 매매 일기 CRUD (작성/수정/삭제/조회)
- [x] 감정 기록 (CALM, CONFIDENT, FOMO, GREEDY, FEARFUL, ANXIOUS)
- [x] 전략 태그 (기본 8개 제공 + 사용자 커스텀 생성)
- [x] 진입/청산 이유 분리 기록
- [x] 종목명/날짜 필터 검색

### Phase 5: 화면
- [x] 다크 트레이딩 터미널 테마 전체 UI
- [x] 대시보드 메인 화면
- [x] 거래 목록 (거래소 탭 + 날짜 프리셋/커스텀 + KRW/USD 실시간 환율)
- [x] 매매 일기 목록/작성/수정 화면
- [x] 모바일 반응형 (데스크탑 상단 네비 / 모바일 하단 탭바, 카드 리스트)

---

## 미완료 / 예정 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 포지션 묶기 알고리즘 | 개별 trades → position 그루핑 (순수량=0 기준) | 높음 |
| 통계 분석 | 승률, 시간대별, 종목별 분석 화면 | 높음 |
| AI 리포트 | Python FastAPI + GPT-4o mini 연동 | 중간 |
| 랭킹 / 불꽃 시스템 | 트레이더 성장 게임화 | 낮음 |

---

## 자주 받는 질문 (Q&A)

---

### Q1. 로그인 기능은 어떻게 했나요? 보안은 어떻게 처리했나요?

**인증 방식: JWT (JSON Web Token) Stateless 인증**

로그인 흐름은 이렇습니다.

```
1. POST /api/auth/login (email + password)
2. 서버: BCrypt로 비밀번호 검증
3. 응답: AccessToken (30분) + RefreshToken (7일) 발급
4. 클라이언트: AccessToken을 모든 API 요청 헤더에 포함
   → Authorization: Bearer {token}
5. AccessToken 만료 시: RefreshToken으로 자동 재발급
6. RefreshToken도 만료 시: /login으로 자동 리다이렉트
```

**보안 처리 목록:**

| 항목 | 처리 방법 |
|------|-----------|
| 비밀번호 저장 | BCrypt 해싱 (평문 저장 없음) |
| API Key 저장 | AES-256 암호화 후 DB 저장 |
| JWT SecretKey | 환경변수 관리 (코드에 하드코딩 없음) |
| CORS | 허용 도메인 화이트리스트 설정 |
| 데이터 접근 | 모든 API에 userId 검증 (타인 데이터 조회 불가) |
| 거래소 Key | 조회 전용 Key만 사용 (출금 권한 없음) |
| 토큰 탈취 대응 | AccessToken 만료 30분으로 짧게 유지 |

**개선 여지:**
- HTTPS 적용 필수 (현재 로컬 개발 기준)
- RefreshToken Rotation (재발급 시 기존 토큰 무효화)
- IP 기반 Rate Limiting (로그인 무차별 대입 방어)

---

### Q2. DB는 왜 PostgreSQL을 쓰고, 문제는 없나요?

**선택 이유:**

PostgreSQL을 선택한 이유는 3가지입니다.

1. **관계형 데이터 특성**: 거래 데이터는 `users → exchange_keys → trades → positions → trade_journals`처럼 명확한 1:N 관계 체인입니다. RDB가 자연스럽게 맞습니다.
2. **무결성 보장**: `ON DELETE CASCADE` 등 외래키 제약으로 데이터 정합성을 DB 레벨에서 보장합니다. (예: 사용자 탈퇴 시 연관 데이터 자동 삭제)
3. **금융 데이터 정밀도**: `DECIMAL(30, 10)` 타입으로 부동소수점 오차 없이 가격/수량 저장 가능합니다.

**현재 잠재적 문제점:**

| 문제 | 설명 | 대응 방안 |
|------|------|-----------|
| 인덱스 미설정 | trades 테이블 조회 시 full scan 가능 | `user_id`, `traded_at`, `symbol` 컬럼 인덱스 추가 필요 |
| N+1 문제 | JPA LAZY 로딩 시 쿼리 폭발 가능 | 현재 `LEFT JOIN FETCH`로 부분 해결 |
| 동시 쓰기 | 같은 사용자가 두 기기에서 동시 동기화 시 | unique 제약(`exchange_trade_id`)으로 중복 방지 중 |
| 스키마 관리 | 현재 수동 마이그레이션 | 나중에 Flyway로 자동화 권장 |

---

### Q3. 사용자가 많아지면 서버 과부하가 생기지 않나요?

**현재 구조의 병목 지점:**

```
[사용자 요청] → [Spring Boot] → [거래소 외부 API 호출] → [PostgreSQL]
```

가장 무거운 작업은 **거래소 API 동기화**입니다.
Upbit/Bybit API를 직접 호출하기 때문에 동시에 100명이 동기화를 누르면 외부 API 레이트 리밋에 걸릴 수 있습니다.

**현재 적용된 완화책:**
- 5분 주기 자동 스케줄러 → 사용자가 직접 누르지 않아도 증분 동기화
- AccessToken 30분 유효 → 불필요한 재인증 요청 감소
- JWT Stateless → 세션 서버 불필요, 수평 확장 가능

**사용자 증가 시 단계별 대응 방안:**

| 단계 | 사용자 수 | 대응 |
|------|-----------|------|
| 현재 | ~수십 명 | 현재 구조로 충분 |
| 성장기 | 수백~수천 명 | DB 인덱스 추가, 동기화 요청 큐(Queue) 도입 |
| 스케일업 | 수만 명 | Redis 캐싱(환율/통계), 동기화 작업 비동기 처리(Kafka/RabbitMQ) |
| 대규모 | 수십만 명 | Spring Boot 수평 확장(로드밸런서), DB Read Replica, CDN |

핵심은 **현재 아키텍처가 수평 확장이 가능한 구조**라는 점입니다. JWT Stateless 인증이기 때문에 서버를 여러 대로 늘려도 세션 공유 문제가 없습니다.

---

### Q4. 나중에 모바일 앱으로 전환이 가능한가요? 앱 출시가 가능한가요?

**결론부터: 가능합니다. 두 가지 방법이 있습니다.**

---

**방법 1: PWA (Progressive Web App) — 웹에서 바로 앱처럼**

현재 React 앱에 설정 몇 가지만 추가하면 앱스토어 없이도 앱처럼 사용할 수 있습니다.

```
추가 작업:
1. manifest.json 추가 (앱 이름, 아이콘, 테마색)
2. Service Worker 등록 (오프라인 캐싱)
3. HTTPS 적용 (PWA 필수 요건)

결과:
- 사용자가 브라우저에서 "홈 화면에 추가" 클릭
- 아이콘이 바탕화면에 생성, 앱처럼 전체화면으로 실행
- 앱스토어 심사 없음, 즉시 배포
```

현재 이미 **모바일 반응형**이 구현되어 있어서 UI 작업이 거의 없습니다.

단점: 일부 네이티브 기능(푸시 알림 등) 제한, "앱 같은 느낌"이 네이티브 대비 부족할 수 있음.

---

**방법 2: React Native — 진짜 네이티브 앱**

현재 React(웹) 코드를 그대로 쓸 수는 없지만, 비즈니스 로직과 API 연동 코드는 대부분 재사용 가능합니다.

```
재사용 가능:
- api/ 폴더 전체 (journalApi.js, exchangeApi.js 등)
- store/authStore.js (Zustand, React Native에서도 동작)
- 비즈니스 로직 전반

새로 작성 필요:
- UI 컴포넌트 (div → View, p → Text 등)
- 내비게이션 (React Navigation)
- CSS → StyleSheet API
```

백엔드는 **그대로 사용** 가능합니다. REST API 구조이므로 클라이언트가 웹이든 앱이든 상관없습니다.

---

**방법 3: Capacitor — 현재 웹 코드를 그대로 앱으로 패키징**

Ionic Capacitor를 사용하면 현재 React 코드를 거의 수정 없이 iOS/Android 앱으로 패키징할 수 있습니다.

```
작업량: 매우 적음 (설정 위주)
결과: 앱스토어에 실제 출시 가능
단점: WebView 기반이라 네이티브 성능 대비 약간 낮음
```

---

**추천 로드맵:**

```
지금 → PWA 적용 (1~2일 작업, 모바일 앱처럼 배포 가능)
나중에 → Capacitor로 앱스토어 출시 (수일 작업)
본격적으로 → React Native 전환 (수주 작업, 진짜 네이티브 경험)
```

현재 REST API 백엔드가 이미 완성되어 있어서, 어떤 방법을 선택해도 **백엔드 수정 없이** 모바일 전환이 가능합니다.
