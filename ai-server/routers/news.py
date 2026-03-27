# [파일 용도] Gemini Flash를 사용한 뉴스 번역+요약 API 엔드포인트

import os
import json
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

# [용도] Gemini API 초기화 / [호출] 모듈 로드 시
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-2.0-flash-lite")


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


# [용도] 뉴스 기사 배치 번역+요약 (Gemini Flash) / [호출] Spring Boot NewsScheduler
# 여러 기사를 한 번의 API 호출로 처리해 비용 절감
@router.post("/translate", response_model=TranslateResponse)
async def translate_news(req: TranslateRequest):
    if not req.articles:
        return TranslateResponse(results=[])

    # 기사 목록을 JSON 형태로 프롬프트에 포함
    articles_json = json.dumps(
        [{"id": a.external_id, "title": a.title, "body": a.body[:300]} for a in req.articles],
        ensure_ascii=False
    )

    prompt = f"""다음 암호화폐 뉴스 기사들을 한국어로 번역하고 2~3문장으로 요약하세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

입력:
{articles_json}

출력 형식 (JSON 배열):
[
  {{
    "id": "기사id",
    "title_ko": "번역된 제목",
    "summary_ko": "2~3문장 한국어 요약"
  }}
]"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # JSON 파싱 (마크다운 코드블록 제거)
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        parsed = json.loads(text)

        results = []
        for item in parsed:
            results.append(TranslatedItem(
                external_id=str(item["id"]),
                title_ko=item.get("title_ko", ""),
                summary_ko=item.get("summary_ko", ""),
            ))
        return TranslateResponse(results=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini 번역 실패: {str(e)}")
