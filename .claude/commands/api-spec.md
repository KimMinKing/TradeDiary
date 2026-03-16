---
description: REST API 명세서 생성
argument-hint: API 대상 기능 (예: "포지션 조회", "매매 일기 작성")
---

TradeNote의 다음 기능에 대한 REST API 명세서를 작성해줘: $ARGUMENTS

## 지시사항

1. CLAUDE.md의 JWT 인증 흐름 참고
2. Spring Boot Controller 기준으로 설계
3. 다음 형식으로 작성:

### 각 엔드포인트마다
- 메서드 + 경로
- 인증 필요 여부 (JWT 필요 / 불필요)
- 요청 헤더
- 요청 Body (JSON 예시)
- 응답 Body (JSON 예시, 성공/실패 케이스)
- HTTP 상태 코드

### 에러 응답 형식 통일
```json
{
  "code": "ERROR_CODE",
  "message": "한국어 에러 메시지"
}
```

모든 내용은 한국어로 작성.
