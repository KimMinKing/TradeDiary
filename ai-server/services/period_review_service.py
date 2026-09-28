# [파일 용도] DeepSeek API 호출 및 기간별 매매 리뷰 생성

import os
import httpx
from models import PeriodReviewRequest
from services.language import response_language_instruction

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


# [용도] 기간별 매매 데이터 기반 AI 리뷰 생성 / [호출] routers/journal.py > period_review()
async def generate_period_review(req: PeriodReviewRequest) -> str:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY가 설정되지 않았습니다")

    system = (
        "당신은 전문 트레이딩 코치입니다. "
        "트레이더의 특정 기간 매매 패턴을 종합적으로 분석하고, "
        "장기적인 성장을 위한 맞춤형 조언을 제공합니다. "
        "분석은 항상 한국어로 작성하며, 데이터에 기반한 통찰력을 제공합니다."
    )
    prompt = _build_period_prompt(req)

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": response_language_instruction(req.language) + "\n" + system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1500,
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(DEEPSEEK_URL, json=payload, headers=headers)
        res.raise_for_status()
        data = res.json()

    content = data["choices"][0]["message"]["content"]
    if not isinstance(content, str) or not content.strip():
        raise ValueError("AI 분석 제공자가 빈 응답을 반환했습니다")
    return content.strip()


# [용도] 기간별 리뷰 AI 프롬프트 생성 / [호출] generate_period_review()
def _build_period_prompt(req: PeriodReviewRequest) -> str:
    period_name = "주간" if req.period == "weekly" else "월간"

    lines = [
        f"## {period_name} 매매 리뷰 ({req.start_date} ~ {req.end_date})",
        "",
        f"### 📊 기간별 요약",
        f"- 총 거래 건수: {len(req.journals)}건",
        f"- 취합 포지션 수: {len(req.positions)}건",
    ]

    # 감정 분석
    emotion_counts = {}
    for journal in req.journals:
        emotion = journal.get("emotion", "UNKNOWN")
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

    if emotion_counts:
        lines.append("")
        lines.append("### 😊 감정 패턴")
        for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- {emotion}: {count}건 ({count/len(req.journals)*100:.0f}%)")

    # 태그별 성과
    tag_stats = {}
    for journal in req.journals:
        for tag in journal.get("tags", []):
            if tag not in tag_stats:
                tag_stats[tag] = {"count": 0, "pnls": []}
            tag_stats[tag]["count"] += 1

    if tag_stats:
        lines.append("")
        lines.append("### 🏷️ 전략 태그 현황")
        for tag, stats in tag_stats.items():
            lines.append(f"- {tag}: {stats['count']}건 사용")

    # 주요 패턴
    if req.journals:
        avg_pnl = sum(float(p.get("pnl", 0)) for p in req.positions) / len(req.positions) if req.positions else 0
        lines.append("")
        lines.append("### 📈 성과 요약")
        lines.append(f"- 평균 포지션 손익: {avg_pnl:+.0f}원")

        # 가장 많은 종목
        symbol_counts = {}
        for journal in req.journals:
            symbol = journal.get("symbol")
            if symbol:
                symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1

        if symbol_counts:
            top_symbol = max(symbol_counts.items(), key=lambda x: x[1])
            lines.append(f"- 가장 활발히 거래한 종목: {top_symbol[0]} ({top_symbol[1]}건)")

    lines += [
        "",
        "### 💡 AI 코칭 조언",
        "",
        "위 데이터를 바탕으로 다음 4가지를 종합 분석해주세요:",
        "1. **기간 성과 평가**: 이 기간의 전체적인 트레이딩 성과를 데이터로 평가",
        "2. **감정 패턴 분석**: 주요 감정이 거래 성과에 미친 영향",
        "3. **개선 포인트**: 특히 주의해야 할 패턴과 습관",
        "4. **다음 기간 목표**: 구체적이고 측정 가능한 행동 목표 3가지",
        "",
        "전문 코치의 시각에서 트레이더의 성장을 돕는 조언을 작성해주세요."
    ]

    return "\n".join(lines)
