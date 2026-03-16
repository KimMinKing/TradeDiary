---
description: DB 테이블 설계 및 DDL 생성
argument-hint: 설계할 기능/테이블 (예: "매매 일기", "포지션 통계")
---

TradeNote의 다음 기능에 필요한 DB 테이블을 설계해줘: $ARGUMENTS

## 지시사항

1. CLAUDE.md의 핵심 테이블 구조 참고
2. PostgreSQL 기준으로 작성
3. 다음 내용 포함:

### 테이블 설계
- 테이블명 (snake_case)
- 컬럼명, 타입, 제약조건, 설명
- 인덱스 전략 (자주 조회되는 컬럼)
- 외래키 관계

### DDL 쿼리
- CREATE TABLE 문
- CREATE INDEX 문

### JPA Entity 클래스 (Java)
- CLAUDE.md 주석 규칙 적용
- 한국어 주석 포함

### 주의사항
- 거래소 API Key 컬럼은 encrypted_key로 명명 (암호화 저장 명시)
- user_id 기반 데이터 격리 설계
- 데이터 보관 기간 고려 (trade: 1년, diary: 영구)

모든 내용은 한국어로 작성.
