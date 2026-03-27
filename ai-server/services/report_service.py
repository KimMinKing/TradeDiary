# [파일 용도] Gemini REST API 호출 및 트레이딩 AI 분석 리포트 생성

import os
import httpx
from models import ReportRequest

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyCfq58gKARA6W2jBs3PQkyKGD0g0IO_4j8")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}"


# [용도] 거래 통계 데이터 기반 AI 분석 리포트 생성 / [호출] routers/report.py > analyze()
async def generate_report(req: ReportRequest) -> str:
    system = (
        "당신은 코인 트레이더 전문 코치입니다. "
        "트레이더의 거래 통계를 분석하고 구체적이고 실용적인 조언을 제공합니다. "
        "분석은 항상 한국어로 작성하며, 냉정하고 데이터 기반으로 피드백합니다.\n\n"
    )
    prompt = system + _build_prompt(req)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1200}
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(GEMINI_URL, json=payload)
        res.raise_for_status()
        data = res.json()

    return data["candidates"][0]["content"]["parts"][0]["text"]


# [용도] AI 프롬프트 생성 / [호출] generate_report()
def _build_prompt(req: ReportRequest) -> str:
    s = req.summary
    lines = [
        f"## 트레이딩 성과 데이터 ({req.exchange or '전체 거래소'})",
        "",
        f"- 총 포지션: {s.total_positions}건 (수익 {s.win_count} / 손실 {s.loss_count})",
        f"- 승률: {s.win_rate}%",
        f"- 총 손익: {s.total_pnl}",
        f"- Profit Factor: {s.profit_factor}",
        f"- 평균 수익: {s.avg_win} / 평균 손실: {s.avg_loss}",
        f"- 손익비(R:R): {s.rr_ratio}",
        f"- 최대 연속 수익: {s.max_win_streak}연속 / 최대 연속 손실: {s.max_loss_streak}연속",
        f"- 최대 단일 손실: {s.max_single_loss}",
    ]

    if req.top_symbols:
        lines.append("")
        lines.append("## 상위 거래 종목 (수익 기준)")
        for sym in req.top_symbols[:5]:
            lines.append(
                f"- {sym.symbol}: {sym.total_count}건, 승률 {sym.win_rate}%, 손익 {sym.total_pnl}"
            )

    if req.worst_hour is not None:
        lines.append("")
        lines.append(f"## 최악의 시간대: {req.worst_hour}시")

    if req.best_hour is not None:
        lines.append(f"## 최고의 시간대: {req.best_hour}시")

    if req.emotion_stats:
        lines.append("")
        lines.append("## 감정별 승률")
        for em in req.emotion_stats:
            lines.append(f"- {em.label}: 승률 {em.win_rate}% ({em.total_count}건)")

    lines += [
        "",
        "위 데이터를 바탕으로 다음 3가지를 분석해주세요:",
        "1. **강점 분석**: 잘 하고 있는 점 (데이터 근거 포함)",
        "2. **약점 및 개선점**: 가장 시급히 고쳐야 할 습관 (구체적 수치 언급)",
        "3. **실행 가능한 조언**: 다음 주 트레이딩에서 바로 적용할 수 있는 행동 지침 2~3가지",
    ]

    return "\n".join(lines)
