---
description: 새 기능 구현 계획서 생성 (Spring Boot + React + Python 구조 기준)
argument-hint: 구현할 기능 설명 (예: "매매 일기 CRUD", "Bybit API 연동")
---

TradeNote 프로젝트의 다음 기능을 구현하기 위한 계획서를 작성해줘: $ARGUMENTS

## 지시사항

1. 현재 코드베이스 관련 파일을 먼저 읽어서 현재 상태 파악
2. CLAUDE.md의 기술 스택과 개발 순서를 참고
3. 다음 구조로 계획서 작성:

### 계획서 구조
- 기능 개요 (한 줄)
- 영향받는 파일 목록 (backend / frontend / ai-server 구분)
- DB 변경사항 (새 테이블 or 컬럼 추가 여부)
- API 엔드포인트 설계 (메서드, 경로, 요청/응답)
- 구현 단계 (번호 순서, 각 단계 예상 크기 S/M/L)
- 주의사항 (보안, 포지션 알고리즘 관련 등)

4. `dev/active/[기능명]/` 폴더에 파일 3개 생성:
   - `[기능명]-plan.md` — 전체 계획
   - `[기능명]-context.md` — 핵심 파일, DB 구조, API 스펙
   - `[기능명]-tasks.md` — 체크리스트

모든 내용은 한국어로 작성. Last Updated: 날짜 포함.
