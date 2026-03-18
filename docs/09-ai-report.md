# 09 — AI 트레이딩 리포트

완료일: 2026-03-18

---

## 개요

Python FastAPI AI 서버 구축 및 Spring Boot 연동.
사용자의 거래 통계(포지션·감정·시간대·종목)를 GPT-4o mini에 전달하여 트레이더 맞춤형 분석 리포트를 생성한다.

---

## 구현 파일 목록

### Python AI 서버 (`ai-server/`)

| 파일 | 역할 |
|------|------|
| `ai-server/main.py` | FastAPI 앱 진입점, CORS 설정, 헬스체크 |
| `ai-server/models.py` | 요청/응답 Pydantic 모델 (ReportRequest, ReportResponse) |
| `ai-server/requirements.txt` | fastapi, uvicorn, openai, pydantic |
| `ai-server/Dockerfile` | Python 3.11-slim 기반 컨테이너 이미지 |
| `ai-server/routers/report.py` | POST /report/analyze 엔드포인트 |
| `ai-server/services/report_service.py` | OpenAI GPT-4o mini 호출 및 프롬프트 생성 |

### Spring Boot 백엔드 (`backend/.../ai/`)

| 파일 | 역할 |
|------|------|
| `ai/AiReportClient.java` | Python 서버 HTTP 호출 (RestClient) |
| `ai/AiReportService.java` | 통계 데이터 조립 후 AI 클라이언트 호출 |
| `ai/AiReportController.java` | POST /api/ai/report REST API |

### 프론트엔드

| 파일 | 역할 |
|------|------|
| `frontend/src/api/exchangeApi.js` | `generateAiReport()` 함수 추가 |
| `frontend/src/pages/StatsPage.jsx` | AI 리포트 버튼 + 결과 표시 박스 추가 |

---

## 아키텍처 흐름

```
[StatsPage] → POST /api/ai/report
  → [AiReportController]
  → [AiReportService] (통계 데이터 조립)
  → [AiReportClient] → POST http://ai-server:8000/report/analyze
  → [Python report_service] → OpenAI GPT-4o mini
  → 리포트 텍스트 반환
```

---

## AI 프롬프트 구성

AI에게 전달하는 데이터:
1. 핵심 지표 (총 포지션, 승률, PF, R:R, 연속손익)
2. 상위 5개 종목 성과
3. 감정별 승률 (일기 연동 시)
4. 최고/최악 시간대

AI가 분석하는 항목:
1. **강점 분석** — 잘 하고 있는 점 (데이터 근거 포함)
2. **약점 및 개선점** — 가장 시급히 고쳐야 할 습관
3. **실행 가능한 조언** — 다음 주에 바로 적용할 행동 지침 2~3가지

---

## API 명세

```
POST /api/ai/report?exchange=UPBIT|BYBIT
Authorization: Bearer {token}

Response 200:
{
  "report": "## 트레이딩 분석 리포트\n\n**강점 분석**\n..."
}

Response 500:
{
  "report": "AI 서버 연결 실패: ..."
}
```

---

## 환경변수 설정

`.env` 파일에 추가 필요:
```
OPENAI_API_KEY=sk-...
```

`docker-compose.yml`에서 ai-server 서비스에 자동 주입됨.

---

## 실행 방법

```bash
# AI 서버 포함 전체 서비스 실행
docker-compose up --build

# AI 서버만 단독 실행 (개발용)
cd ai-server
pip install -r requirements.txt
OPENAI_API_KEY=sk-... uvicorn main:app --reload
```
