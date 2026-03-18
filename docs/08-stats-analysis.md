# 08 — 성과 통계 분석

완료일: 2026-03-18

---

## 개요

포지션 데이터 기반 성과 통계 API 및 화면 구현.
핵심 KPI(승률·PF·R:R)부터 월별·종목별·시간대별·요일별 분석, 매매 일기 데이터 연동(감정별·태그별)까지 3단계 통계를 제공한다.

---

## 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `backend/src/main/java/com/tradediary/stats/StatsService.java` | 전체 통계 계산 로직 (3단계) |
| `backend/src/main/java/com/tradediary/stats/StatsController.java` | GET /api/stats REST API |
| `frontend/src/pages/StatsPage.jsx` | 통계 화면 (recharts 차트 포함, AI 리포트 버튼) |
| `frontend/src/api/exchangeApi.js` | `getStats()`, `generateAiReport()` API 함수 추가 |

---

## 통계 항목 (3단계)

### 1단계 — 핵심 성과 지표 (KPI)

| 지표 | 설명 |
|------|------|
| 총 포지션 | 수익/손실 건수 |
| 승률 | 수익 포지션 / 전체 × 100 |
| 총 손익 | Σ PnL |
| Profit Factor | 총수익 ÷ 총손실 |
| 평균 수익 / 평균 손실 | 각 포지션 PnL 평균 |
| 손익비 (R:R) | 평균수익 ÷ \|평균손실\| |
| 최대 단일 손실 | 가장 큰 단일 손실 포지션 |
| 최대 연속 수익 / 손실 | 연속 수익/손실 streak |

### 2단계 — 일기 데이터 연동

- **감정별 승률**: 매매 일기의 `emotion` + `symbol` + `tradeDate`로 포지션과 매핑
- **전략 태그별 성과**: 태그별 승률·손익 집계

### 3단계 — 시간대 / 요일 분석

- **월별 PnL 차트**: recharts BarChart, 수익(초록)/손실(빨강) 컬러 인코딩
- **시간대별 히트맵**: 0~23시 각 셀에 승률 색상 강도로 표시
- **요일별 성과**: 월~일 카드 (승률, 건수, 손익)
- **롱/숏 비교**: 각 side별 승률 바 + 통계

---

## API 명세

```
GET /api/stats?exchange=UPBIT|BYBIT
Authorization: Bearer {token}

Response 200:
{
  "summary": {
    "total_positions": 42,
    "win_count": 28,
    "loss_count": 14,
    "win_rate": 66.67,
    "profit_factor": 2.1,
    "avg_win": 150000.0,
    "avg_loss": -80000.0,
    "rr_ratio": 1.88,
    "max_win_streak": 7,
    "max_loss_streak": 3,
    "max_single_loss": "-320000.00",
    "total_pnl": "2800000.00"
  },
  "monthly_pnl": [...],
  "symbol_stats": [...],
  "long_stats": {...},
  "short_stats": {...},
  "emotion_stats": [...],
  "tag_stats": [...],
  "hourly_stats": [...],
  "day_of_week_stats": [...]
}
```

---

## 화면 구성

```
[성과 통계] 헤더
  ├── 거래소 선택 드롭다운 (전체 / UPBIT / BYBIT)
  └── ✦ AI 리포트 버튼 (→ POST /api/ai/report)

[AI 리포트 결과 박스] (버튼 클릭 시 표시)

[핵심 성과 지표] — KPI 카드 그리드 (10개)
[월별 손익 추이] — BarChart
[롱 / 숏 비교] — side-card 2열
[종목별 성과] — 테이블
[감정별 승률] — 카드 (일기 연동 시 표시)
[전략 태그별 성과] — 리스트 (일기 연동 시 표시)
[시간대별 성과] — 24셀 히트맵
[요일별 성과] — 7일 카드
```

---

## 주의사항

- `exchange=ALL` (전체 보기): Upbit(KRW) + Bybit(USDT) 혼합 수치 → 화면에 경고 배너 표시
- 감정/태그 통계는 **포지션의 `closedAt` 날짜 + `symbol`** 로 일기와 매핑 (정확한 매핑을 위해 일기 작성 시 종목명 입력 필수)
- 포지션 데이터 없으면 빈 상태 화면 표시
