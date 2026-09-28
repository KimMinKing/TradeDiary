# [파일 용도] DeepSeek API 호출 및 매매 일기 피드백 생성

import os
import httpx
from models import JournalFeedbackRequest, PlanReviewRequest
from services.language import response_language_instruction

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


# [용도] 매매 일기 기반 AI 피드백 생성 / [호출] routers/journal.py > feedback()
async def generate_journal_feedback(req: JournalFeedbackRequest) -> str:
    system = (
        "당신은 트레이딩 일기를 전문적으로 요약해주는 AI입니다. "
        "제공된 매매 일기를 간결하고 핵심적인 내용 위주로 요약해주세요. "
        "반드시 한국어로만 응답하고, 어떠한 한자도 사용하지 마세요. "
        "요약은 항상 한국어로 작성하며, 주요 내용을 3~5개 항목으로 정리합니다."
    )
    prompt = _build_journal_prompt(req)

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": response_language_instruction(req.language) + "\n" + system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.6,
        "max_tokens": 800,
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


# [용도] 일기 피드백 AI 프롬프트 생성 / [호출] generate_journal_feedback()
def _build_journal_prompt(req: JournalFeedbackRequest) -> str:
    lines = [
        f"## 매매 일기 요약 ({req.symbol})",
        "",
        f"**거래 정보**",
        f"- 날짜: {req.trade_date}",
        f"- 진입: {req.entry_reason}",
        f"- 청산: {req.exit_reason}",
    ]

    if req.position_pnl:
        lines.append(f"- 손익: {req.position_pnl}")

    lines += [
        "",
        f"**감정 및 체크리스트**",
        f"- 감정: {req.emotion}",
        f"- 체크리스트 완료율: {req.checklist_rate:.0%}",
    ]

    if req.memo:
        lines.append("")
        lines.append(f"**메모 요약**")
        lines.append(req.memo)

    if req.tags:
        lines.append("")
        lines.append(f"**주요 태그**")
        lines.append(", ".join(req.tags))

    lines += [
        "",
        "위 내용을 바탕으로 이 일기를 간결하게 요약해주세요:",
        "1. **일기 핵심**: 가장 중요한 거래 경험 1~2줄",
        "2. **감정 상태**: 주요 감정과 그 영향",
        "3. **다음 거래를 위한 핵심 한마디**",
        "",
        "짧고 핵심적인 요약으로 작성해주세요. (150자 이내)"
    ]

    return "\n".join(lines)


# [?⑸룄] 留ㅻℓ 怨꾪쉷 ?ㅻ뵒踰? AI ?쇰뱶諛? / [?몄텧] routers/journal.py > plan_review()
async def generate_plan_review(req: PlanReviewRequest) -> str:
    system = (
        "너는 매매 계획과 실제 일기 초안을 연결해 주는 AI 코치다. "
        "오늘의 계획을 실행했는지 확인하도록 도와주되, 단정하지 말고 질문 중심으로 짧게 말한다. "
        "반드시 한국어로만 답하고, 2~4문장 이내로 작성한다."
    )
    prompt = _build_plan_review_prompt(req)

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": response_language_instruction(req.language) + "\n" + system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.5,
        "max_tokens": 280,
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


def _build_plan_review_prompt(req: PlanReviewRequest) -> str:
    plans = req.plans or []
    journal = req.journal or {}

    plan_lines = []
    for plan in plans:
        parts = []
        if plan.get("direction"):
            parts.append(f"[{plan['direction']}]")
        if plan.get("symbol"):
            parts.append(plan["symbol"])
        parts.append(plan.get("content", ""))
        if plan.get("done") is True:
            parts.append("(완료 체크됨)")
        plan_lines.append("- " + " ".join(part for part in parts if part))

    journal_lines = []
    if journal.get("symbol"):
        journal_lines.append(f"- 종목: {journal['symbol']}")
    if journal.get("emotion"):
        journal_lines.append(f"- 감정: {journal['emotion']}")
    if journal.get("entry_reason"):
        journal_lines.append(f"- 진입 사유: {journal['entry_reason']}")
    if journal.get("exit_reason"):
        journal_lines.append(f"- 청산 사유: {journal['exit_reason']}")
    if journal.get("memo"):
        journal_lines.append(f"- 메모: {journal['memo']}")

    lines = [
        f"오늘 날짜: {req.trade_date}",
        "",
        "오늘의 매매 계획:",
        *(plan_lines if plan_lines else ["- 등록된 매매 계획이 없다"]),
        "",
        "현재 일기 초안:",
        *(journal_lines if journal_lines else ["- 아직 작성된 내용이 없다"]),
        "",
        "요청:",
        "1. 오늘 계획을 실제로 실행했는지 먼저 짚어라.",
        "2. 계획대로 했다면 실행이 적절했는지 한 줄로 평가하고,",
        "3. 계획과 다르게 했다면 왜 그랬는지 사용자가 적어볼 질문을 남겨라.",
        "4. 반드시 질문형으로 끝내지 않아도 되지만, 너무 길게 설명하지 마라.",
        "",
        "결과는 2~4문장, 한국어만 사용."
    ]

    return "\n".join(lines)
