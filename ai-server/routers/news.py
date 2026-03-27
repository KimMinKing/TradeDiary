# [파일 용도] Gemini REST API를 사용한 뉴스 번역+요약 엔드포인트 (단일 호출)

import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyCfq58gKARA6W2jBs3PQkyKGD0g0IO_4j8")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}"


class NewsItem(BaseModel):
    external_id: str
    title: str
    body: str
    source: str
    url: str
    categories: str


class TranslatedItem(BaseModel):
    external_id: str
    title_ko: str
    summary_ko: str


class TranslateRequest(BaseModel):
    articles: List[NewsItem]


class TranslateResponse(BaseModel):
    results: List[TranslatedItem]


# [용도] 뉴스 기사 전체 번역+요약 (Gemini 단일 호출) / [호출] Spring Boot NewsScheduler
@router.post("/translate", response_model=TranslateResponse)
async def translate_news(req: TranslateRequest):
    if not req.articles:
        return TranslateResponse(results=[])

    # 기사들을 번호 붙인 텍스트 블록으로 구성
    blocks = []
    for a in req.articles:
        body_preview = a.body[:200].replace("\n", " ") if a.body else ""
        blocks.append(f'[{a.external_id}] {a.title}\n{body_preview}')

    articles_text = "\n\n".join(blocks)

    prompt = f"""아래 암호화폐 뉴스 기사들을 한국어로 번역하고 각각 1~2문장으로 요약하세요.
반드시 JSON 배열 형식으로만 응답하고, 다른 텍스트는 절대 포함하지 마세요.

기사 목록:
{articles_text}

응답 형식:
[{{"id":"기사id","title_ko":"번역된 제목","summary_ko":"1~2문장 요약"}},...]"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2}
    }

    try:
        import asyncio
        async with httpx.AsyncClient(timeout=120.0) as client:
            for attempt in range(3):
                res = await client.post(GEMINI_URL, json=payload)
                if res.status_code == 429:
                    wait = (attempt + 1) * 20  # 20초, 40초, 60초
                    await asyncio.sleep(wait)
                    continue
                res.raise_for_status()
                break
            else:
                raise Exception("429 Too Many Requests - 재시도 초과")
            data = res.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        # 마크다운 코드블록 제거
        if "```" in text:
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        parsed = json.loads(text)
        results = [
            TranslatedItem(
                external_id=str(item["id"]),
                title_ko=item.get("title_ko", ""),
                summary_ko=item.get("summary_ko", ""),
            )
            for item in parsed
        ]
        return TranslateResponse(results=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini 번역 실패: {str(e)}")
