# 32 - 트레이더 유형 AI 코칭

- 완료 날짜: 2026-06-20
- 브랜치: feature/ai-trading-journal

## 개요

통계 페이지의 "나의 트레이더 유형" 아래에 AI 코칭 카드를 추가했다. 기존에는 규칙 기반 분류(유형명/강점/약점)만 정적 텍스트로 보여줬으나, 이제 DeepSeek 이 사용자의 거래 스타일을 분석해 3개 섹션(현재 유형 요약 / 수익률 개선 조언 / 주의할 점)으로 맞춤형 코칭을 생성한다.

매매일기 AI 요약과 동일한 아키텍처(프론트 → Spring Boot → FastAI 서버 → DeepSeek)를 사용하며, 결과는 DB에 캐싱하여 매번 AI 호출하지 않도록 했다.

**동작 방식**:
- 최초 페이지 진입 시 캐시 없으면 AI 생성 후 DB 저장 (3~5초)
- 이후 조회는 DB 캐시 즉시 반환
- "🔄 다시 분석" 버튼 클릭 시 강제 재생성
- 포지션 5건 미만(데이터 부족) 시 카드 미표시

## 구현 파일 목록 및 역할

### DB
- `database/migrations/V10__trader_type_advice.sql` (신규) — `trader_type_advice` 테이블 (user_id unique, advice_text TEXT, generated_at)
- `database/run_all_migrations.sql` (수정) — 통합 마이그레이션에 위 테이블 생성 추가

### 백엔드 (Spring Boot)
- `backend/.../trader/TraderTypeAdvice.java` (신규) — JPA 엔티티. `update()` 메서드로 재생성 시 덮어쓰기
- `backend/.../trader/TraderTypeAdviceRepository.java` (신규) — `findByUserId`
- `backend/.../trader/TraderTypeAdviceResponse.java` (신규) — 응답 DTO (advice, generatedAt). `empty()` 정적 팩토리
- `backend/.../trader/TraderTypeService.java` (수정) — `getAdvice()`(캐시 조회→없으면 생성), `refreshAdvice()`(강제 재생성), `generateAdvice()`(유형 분석→AI 호출→upsert)
- `backend/.../trader/TraderTypeController.java` (수정) — `GET /api/trader-type/advice`, `POST /api/trader-type/advice/refresh`
- `backend/.../ai/AiReportClient.java` (수정) — `analyzeTraderTypeAdvice()` + `TraderTypeAdviceRequest`/`AiAdviceResponse` record DTO

### AI 서버 (Python FastAPI)
- `ai-server/models.py` (수정) — `TraderTypeAdviceStats`/`TraderTypeAdviceRequest`/`TraderTypeAdviceResponse` Pydantic 모델
- `ai-server/services/trader_type_advice_service.py` (신규) — DeepSeek 호출. 3개 섹션(📋/💡/⚠️) 이모지 헤더 강제 프롬프트
- `ai-server/routers/trader_type.py` (신규) — `POST /advice` 엔드포인트
- `ai-server/main.py` (수정) — `trader_type` 라우터를 `/api/trader-type` prefix로 등록 (매매일기 /feedback 누락 함정 회피)

### 프론트엔드 (React)
- `frontend/src/api/exchangeApi.js` (수정) — `getTraderTypeAdvice()`, `refreshTraderTypeAdvice()`
- `frontend/src/pages/TraderTypePage.jsx` (수정) — 유형 안내 카드 위에 AI 코칭 카드 추가 (로딩/에러/정상 3상태, "다시 분석" 버튼, "최근 분석 X시간 전" 표시, `whiteSpace: pre-wrap` 줄바꿈 보존)

## 실행 방법

1. **DB 마이그레이션**:
   ```bash
   docker exec -i tradediary-postgres psql -U tradediary -d tradediary \
     < database/migrations/V10__trader_type_advice.sql
   ```
2. **서버 재시작**: 백엔드 Spring Boot, AI 서버(uvicorn main:app) 재시작
3. **확인**: 통계 페이지 → "나의 트레이더 유형" 진입 → 분석 통계 아래 AI 코칭 카드 표시 (포지션 5건 이상 필요)

## 검증 시나리오

| 케이스 | 기대 결과 |
|--------|-----------|
| 포지션 < 5건 | AI 카드 미표시 (advice == null) |
| 포지션 ≥ 5건 최초 | 3~5초 로딩 후 3개 섹션(📋/💡/⚠️) 표시, `trader_type_advice` 행 생성 |
| 재조회 | DB 캐시 즉시 반환 (지연 없음) |
| "다시 분석" 클릭 | 재생성, generatedAt 갱신 |
| AI 서버 다운 | 에러 폴백 메시지 + "다시 시도" 버튼 |
