# 데이터베이스 마이그레이션

- 완료 날짜: 2026-08-04

## 개요

수동 SQL과 Hibernate 자동 변경에 의존하던 스키마 관리를 Flyway 기반으로 전환했습니다. 기존 데이터베이스는 버전 `100`으로 기준선을 생성한 뒤 `V101` 통합 마이그레이션부터 적용됩니다.

## 동작 방식

- 백엔드 시작 전에 Flyway가 `classpath:db/migration`을 검사합니다.
- 기존 비어 있지 않은 DB에 이력이 없으면 `100`으로 baseline 처리합니다.
- `V101__ConsolidateApplicationSchema.sql`이 누락된 컬럼·테이블·인덱스를 멱등 방식으로 보완합니다.
- Hibernate는 로컬에서도 `validate`만 수행하며 스키마를 임의 변경하지 않습니다.

## 로컬 적용

```bash
docker compose up -d postgres
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

이력 확인:

```bash
docker exec tradediary-postgres psql -U tradediary -d tradediary -c "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```

Windows PowerShell에서 한글 SQL을 `Get-Content | docker exec psql` 형태로 전달하면 문자 인코딩이 손상될 수 있습니다. 수동 점검이 필요할 때는 `docker cp`로 UTF-8 파일을 복사한 뒤 컨테이너 내부에서 `psql -f`를 실행합니다. 일반 적용은 항상 백엔드 시작 시 Flyway에 맡깁니다.

운영 적용 전에는 PostgreSQL 백업을 만들고 동일한 스키마 복제본에서 먼저 검증해야 합니다.

## 검증 결과

- 기존 로컬 DB: baseline `100` 및 `V101` 적용 성공, 기존 사용자·거래·알림 데이터 유지
- 완전히 빈 PostgreSQL 16 DB: `V101` 단독 생성 성공
- 빈 DB 생성 직후 Hibernate `ddl-auto=validate` 통과
- 검증용 백엔드 기동 및 인증 보호 API의 `401` 응답 확인
- 검증 전용 DB와 컨테이너는 확인 후 제거

## V102 운영 보강

- 사용자별 거래소 키 중복 방지
- 거래·포지션 방향 체크 제약
- `position_strategy_tags`, `trade_stats`, `streak_records` 누락 방지
- 신규 DB용 기본 전략 태그와 체크리스트 멱등 시드
- 거래 동기화, 포지션 재계산, 일기 및 알림 필터 조회용 복합 인덱스

## 자동 회귀 테스트

Docker가 실행 중인 환경에서 다음 명령은 임시 PostgreSQL 16 컨테이너를 만들고 V101부터 최신 버전까지 적용한 뒤 자동으로 제거합니다.

```bash
cd backend
./gradlew migrationTest
```

배포 GitHub Actions도 백엔드 이미지를 만들기 전에 `migrationTest`를 실행하므로 잘못된 마이그레이션은 배포 단계로 진행되지 않습니다.

백엔드는 `/api/health`에서 애플리케이션과 DB 연결 상태를 함께 확인하며, Docker 이미지의 healthcheck도 이 경로를 사용합니다. Flyway 또는 Hibernate 검증에 실패하면 서버가 준비 상태가 되지 않습니다.

## 백업 및 복원 확인

로컬 PostgreSQL은 `scripts/create_db_dump.ps1`로 custom-format 백업을 생성할 수 있습니다. 생성된 dump는 반드시 별도 임시 DB에 `pg_restore`하여 핵심 테이블 건수가 원본과 같은지 확인합니다. `database/dumps/`는 Git에서 제외되어 API 키 암호문과 사용자 데이터가 저장소에 올라가지 않습니다.
