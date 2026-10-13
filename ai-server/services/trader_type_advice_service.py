# [파일 용도] DeepSeek API 호출 및 트레이더 유형 AI 코칭 생성

import os
import httpx
from models import TraderTypeAdviceRequest
from services.language import response_language_instruction

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


# [용도] 트레이더 유형 분석 결과 기반 AI 코칭 생성 / [호출] routers/trader_type.py > advice()
async def generate_trader_type_advice(req: TraderTypeAdviceRequest) -> str:
    system = (
        "당신은 트레이더 유형을 분석하고 맞춤형 코칭을 제공하는 전문가입니다. "
        "제공된 트레이더 유형 정보와 거래 통계를 바탕으로, 실전에서 바로 쓸 수 있는 "
        "구체적이고 실용적인 코칭을 작성해주세요. "
        "중요: 트레이더 유형은 이미 서버에서 확정된 값입니다. "
        "거래 통계를 보고 유형을 다시 분류하거나 다른 유형명으로 바꾸면 안 됩니다. "
        "응답 전체에서 반드시 요청에 포함된 type_name만 현재 유형으로 사용하세요. "
        "반드시 한국어로만 응답하고, 어떠한 한자도 사용하지 마세요."
    )
    prompt = _build_advice_prompt(req)

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": response_language_instruction(req.language) + "\n" + system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.5,
        "max_tokens": 600,
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(DEEPSEEK_URL, json=payload, headers=headers)
        res.raise_for_status()
        data = res.json()

    return data["choices"][0]["message"]["content"]


# [용도] 트레이더 유형 코칭 AI 프롬프트 생성 / [호출] generate_trader_type_advice()
def _build_advice_prompt(req: TraderTypeAdviceRequest) -> str:
    s = req.stats
    lines = [
        f"## 트레이더 유형 분석 ({req.type_name})",
        "",
        "**유형 정보**",
        f"- 유형: {req.type_name} ({req.type_code})",
        f"- 특징: {req.description}",
        f"- 강점: {req.strength}",
        f"- 약점: {req.weakness}",
        "",
        "**거래 통계**",
        f"- 총 포지션: {s.total_positions}건",
        f"- 평균 보유시간: {s.avg_hold_hours:.1f}시간",
        f"- 거래 종목 수: {s.unique_symbols}개",
        f"- 승률: {s.win_rate:.1f}%",
        f"- 평균 손익(건당): {s.avg_pnl_per_trade:.2f}",
        "",
        "**반드시 지킬 규칙**",
        f"- 현재 유형은 '{req.type_name}'입니다. 다른 유형명으로 재판정하지 마세요.",
        f"- 요약 첫 문장에는 반드시 '{req.type_name}'이라는 유형명을 그대로 포함하세요.",
        f"- 거래 종목 수나 보유시간이 다른 유형 기준처럼 보여도, '{req.type_name}' 기준의 특징과 조언만 작성하세요.",
        "- 다른 유형으로 전환하라는 표현은 금지하고, 현재 유형 안에서 개선할 점만 말하세요.",
        "",
        "위 데이터를 바탕으로 아래 3개 섹션을 **정확히 이 이모지 헤더로** 작성해주세요. "
        "각 섹션은 헤더 아래 2~3문장으로 간결하게 작성하고, 전체가 400자 내외가 되도록 하세요.",
        "",
        "📋 현재 유형 요약",
        "(이 사용자의 거래 스타일과 현재 성과를 2~3문장으로 요약)",
        "",
        "💡 수익률 개선 조언",
        "(지금 스타일에서 수익을 더 내기 위해 구체적으로 무엇을 바꾸면 좋을지 2~3문장)",
        "",
        "⚠️ 주의할 점",
        "(현재 패턴에서 가장 위험한 부분 1~2문장)",
    ]

    return "\n".join(lines)
