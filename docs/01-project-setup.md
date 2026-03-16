# Phase 1 — 프로젝트 초기 설정

## 완료 날짜
2026-03-16

## 한 일

### Git 설정
- 로컬 git 초기화 (`git init`)
- `.gitignore` 생성 (환경변수, 빌드 산출물, IDE 파일 제외)
- GitHub 원격 저장소 연결 (`https://github.com/KimMinKing/TradeDiary`)

### Spring Boot 프로젝트 구조
빌드 도구: **Gradle** (`build.gradle`)

```
backend/
├── build.gradle               ← 의존성 관리
├── settings.gradle
└── src/main/java/com/tradediary/
    ├── TradeDiaryApplication  ← 진입점
    ├── user/                  ← 사용자 도메인
    ├── trade/                 ← 거래 원본 데이터
    ├── position/              ← 묶인 포지션
    ├── diary/                 ← 매매 일기
    ├── stats/                 ← 통계
    ├── exchange/              ← 거래소 API 연동
    └── common/                ← 공통 (보안, 예외처리, 설정)
```

**주요 의존성**
| 라이브러리 | 용도 |
|---|---|
| Spring Web | REST API |
| Spring Security | 인증/인가 |
| Spring Data JPA | DB ORM |
| PostgreSQL | 데이터베이스 드라이버 |
| jjwt 0.12.3 | JWT 토큰 |
| Lombok | 보일러플레이트 제거 |

**설정 파일**
- `application.yml` → 환경변수 기반 (운영/배포용)
- `application-local.yml` → 로컬 개발용 (`ddl-auto: create-drop`, SQL 출력)

### 공통 모듈 (common)
| 파일 | 역할 |
|---|---|
| `SecurityConfig` | JWT Stateless 설정, 인증 경로 설정 |
| `ErrorCode` | 에러 코드 + 메시지 열거형 |
| `BusinessException` | 비즈니스 로직 커스텀 예외 |
| `GlobalExceptionHandler` | 전역 예외 처리 → JSON 응답 |

### Docker + PostgreSQL
`docker-compose.yml` 한 줄로 개발 DB 실행

```bash
docker-compose up -d
```

- PostgreSQL 16, 포트 5432
- DB명/유저/비밀번호: `tradediary`
- 데이터 영구 보존 (볼륨 마운트)
- 최초 실행 시 `database/schema.sql` 자동 실행

### DB 테이블 설계 (`database/schema.sql`)
| 테이블 | 역할 |
|---|---|
| `users` | 사용자 계정 |
| `refresh_tokens` | JWT RefreshToken 저장 |
| `exchange_keys` | 거래소 API Key (암호화) |
| `trades` | 거래 원본 데이터 |
| `positions` | 묶인 포지션 |
| `trade_journals` | 매매 일기 |
| `strategy_tags` | 전략 태그 |
| `trade_stats` | 통계 캐시 |
| `streak_records` | 불꽃 성장 기록 |
