# TradeNote

코인 트레이더의 거래 기록 기반 성장 분석 플랫폼.
거래소 API 연동 → 포지션 분석 → AI 리포트 → 성장 추적.

---

# 기술 스택

| 역할 | 기술 |
|------|------|
| 메인 백엔드 | Java 17 + Spring Boot 3 |
| AI 분석 서버 | Python 3.11 + FastAPI |
| 프론트엔드 | React + JavaScript |
| 데이터베이스 | PostgreSQL |
| 인증 | Spring Security + JWT |
| 배포 | Docker + Oracle Cloud (Linux) |
| AI | OpenAI GPT-4o mini |

---

# 프로젝트 폴더 구조

```
tradediary/
├── backend/       ← Spring Boot 메인 서버
├── frontend/      ← React 프론트엔드
├── ai-server/     ← Python FastAPI AI 분석 서버
└── docker-compose.yml
```

---

# 코딩 규칙

## 공통
- 모든 주석은 한국어
- 파일 맨 위: 해당 파일 용도 한 줄 요약
- 클래스 위: 역할 한 줄 요약
- 메서드/함수 위: 용도 + 어디서 호출되는지

## Java (Spring Boot)
- 클래스명: PascalCase (예: `TradeService`)
- 메서드명: camelCase (예: `findTradesByUserId`)
- 변수명: camelCase, 축약어 금지 (예: `userId` ✅ / `uid` ❌)
- 패키지 구조: `domain별 분리` (trade, user, position, diary, stats)

주석 예시:
```java
// [파일 용도] 포지션 데이터 저장 및 조회 Repository

// [클래스] 포지션 테이블 JPA Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    // [용도] 특정 사용자의 포지션 목록 조회 / [호출] PositionService.getPositionsByUser()
    List<Position> findByUserId(Long userId);
}
```

## Python (AI 서버)
- 함수명: snake_case (예: `generate_trade_report`)
- 변수명: snake_case, 축약어 금지
- 주석 예시:
```python
# [파일 용도] OpenAI API 호출 및 트레이딩 리포트 생성

# [용도] 거래 데이터 기반 AI 분석 리포트 생성 / [호출] routers/report.py > create_report()
def generate_trade_report(trade_summary: dict) -> str:
```

## React
- 컴포넌트명: PascalCase (예: `TradeList`)
- 변수/함수명: camelCase
- 파일명: PascalCase (예: `TradeList.jsx`)
- 주석 예시:
```javascript
// [파일 용도] 거래 목록을 표시하는 컴포넌트

// [컴포넌트] 사용자의 포지션 목록 표시 / [호출] pages/Dashboard.jsx
const TradeList = () => {
```

---

# 핵심 아키텍처

## 포지션 묶기 알고리즘 (핵심 로직)

거래 원본 데이터를 하나의 포지션으로 묶는 방식: **순수량(Net Position) = 0 기준**

```
매수 = + / 매도 = -
누적 계산하다가 0이 되면 포지션 종료
```

부동소수점 오차 처리: `Math.abs(netPosition) < 0.000001` 이면 0으로 간주

```java
// 포지션 묶기 핵심 로직 (절대 수정 시 주의)
double netPosition = 0.0;
for (Trade trade : trades) {
    if (trade.getSide() == TradeSide.BUY)  netPosition += trade.getQty();
    if (trade.getSide() == TradeSide.SELL) netPosition -= trade.getQty();
    if (Math.abs(netPosition) < 0.000001) {
        // 포지션 종료
    }
}
```

## Upbit 거래 동기화 전략

### 사용 엔드포인트
- `/v1/orders/closed` — 체결 완료된 주문 목록 (거래 내역 조회용)
- `/v1/orders` (단건 조회) 또는 `/v1/order` — 사용하지 않음

### 동기화 흐름
```
1. 초기 동기화 (DB에 해당 거래소 거래 없을 때)
   → start_time = 현재 - 1년
   → /v1/orders/closed?start_time=...&limit=100&order_by=asc 반복 호출
   → 페이지네이션: 마지막 created_at을 cursor로 사용
   → 전체 저장, exchange_trade_id(uuid) unique로 중복 방지

2. 증분 동기화 (DB에 이미 거래 있을 때)
   → start_time = DB 마지막 거래의 tradedAt
   → 동일한 방식으로 새 거래만 가져와 저장

3. 주기적 실행: 5분마다 스케줄러로 증분 동기화
```

### JWT query_hash 규칙 (중요)
- hash 계산: URL 인코딩 없이 원본값 그대로 (SHA512)
- 실제 URL: 값을 URL 인코딩해서 전송
- 배열 파라미터: `key[]=value` 형식 (`[]` 는 인코딩 안 함)
- Upbit 서버가 URL 디코딩 후 hash 검증하므로 인코딩된 값으로 hash 계산 시 401 발생

## API 통신 구조

```
React → Spring Boot (REST API, JWT 인증)
Spring Boot → Python AI 서버 (내부 REST 호출)
Spring Boot → Bybit/Upbit API (거래 데이터 수집)
Spring Boot → PostgreSQL (데이터 저장)
```

## JWT 인증 흐름

```
로그인 → AccessToken(15분) + RefreshToken(7일) 발급
→ 모든 API 요청 헤더에 AccessToken 포함
→ 만료 시 RefreshToken으로 재발급
```

---

# DB 핵심 테이블 구조

```
users           ← 사용자 계정
exchange_keys   ← 거래소 API Key (암호화 저장)
trades          ← 거래 원본 데이터 (거래소에서 가져온 것)
positions       ← 묶인 포지션 (trades를 묶은 것)
trade_journals  ← 매매 일기 (이유, 감정, 전략태그)
strategy_tags   ← 전략 태그 (사용자 정의 포함)
trade_stats     ← 통계 캐시
streak_records  ← 불꽃 성장 기록
```

---

# 개발 순서

## Phase 1 — 기반 구축 ✅
- [x] 1. 프로젝트 초기 설정 (Spring Boot, React, Python 폴더 구조)
- [x] 2. PostgreSQL DB 설계 및 테이블 생성
- [x] 3. Docker Compose 설정 (전체 서비스 포함)

## Phase 2 — 인증 ✅
- [x] 4. 회원가입/로그인 API (Spring Security + JWT)
- [x] 5. RefreshToken 재발급 API
- [x] 6. React 로그인/회원가입 화면
- [x] 6-1. 토큰 만료(30분) 시 자동 로그아웃 + /login 리다이렉트

## Phase 3 — 거래소 연동 ✅
- [x] 7. Bybit API 연동 (spot/linear/inverse 병렬 동기화)
- [x] 8. Upbit API 연동 (/v1/orders/closed, 7일 슬라이딩 윈도우)
- [x] 9. API Key 암호화 저장 (AES-256)
- [ ] 10. 포지션 묶기 알고리즘 구현
- [x] 11. 거래 데이터 DB 저장 (증분 동기화)

## Phase 4 — 핵심 기능
- [ ] 12. 매매 일기 CRUD (이유, 감정, 전략 태그)
- [ ] 13. 전략 태그 관리 (기본 제공 + 사용자 정의)
- [ ] 14. 통계 분석 API (승률, 시간대별, 종목별)
- [ ] 15. 트레이딩 리포트 API (일/주/월)

## Phase 5 — 화면
- [x] 16. 대시보드 메인 화면
- [x] 17. 거래 목록 화면 (거래소 탭 + 날짜 필터 + KRW/USD 토글)
- [ ] 18. 통계 화면
- [ ] 19. 매매 일기 작성 화면
- [x] 20. 모바일 반응형 대응 (하단 탭 바, 카드 리스트)

## Phase 6 — AI 서버
- [ ] 21. Python FastAPI 서버 설정
- [ ] 22. OpenAI GPT-4o mini 연동
- [ ] 23. AI 분석 리포트 생성 (시간대별, 연속손실, 종목별)
- [ ] 24. Spring Boot → Python 서버 연동

## Phase 7 — 부가 기능
- [ ] 25. 랭킹 시스템
- [ ] 26. 트레이더 유형 분석 (캐릭터 이미지)
- [ ] 27. 불꽃 성장 시스템
- [ ] 28. PDF 리포트 다운로드

## Phase 8 — 배포
- [ ] 29. Oracle Cloud 서버 설정
- [x] 30. Docker Compose 배포 (로컬/노트북 멀티 환경)

---

# 보안 주의사항
- 거래소 API Key는 반드시 AES-256 암호화 후 저장
- JWT SecretKey는 환경변수로 관리 (.env, 절대 코드에 하드코딩 금지)
- 사용자 거래 데이터는 본인만 조회 가능하도록 userId 검증 필수
- 조회 전용 API Key만 허용 (출금 권한 Key 차단)

---

# 응답 스타일
- 설명은 짧고 핵심만
- 코드 수정 전 반드시 해당 파일 먼저 읽기
- 에러 발생 시 원인 한 줄 + 수정 코드 바로 제시

---

# 개발 문서 규칙
- 기능 구현 완료 후 반드시 `docs/` 폴더에 MD 파일 작성
- 파일명 규칙: `숫자두자리-기능명.md` (예: `03-react-setup.md`)
- 내용: 완료 날짜 / 개요 / 구현 파일 목록 및 역할 / 실행 방법
- git commit 전에 docs 파일도 같이 포함시킬 것
