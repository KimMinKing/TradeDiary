# [파일 용도] 트레이더 유형 AI 코칭 API 라우터

from fastapi import APIRouter, HTTPException

from models import TraderTypeAdviceRequest, TraderTypeAdviceResponse
from services.trader_type_advice_service import generate_trader_type_advice

router = APIRouter()


# [용도] 트레이더 유형 분석 결과 기반 AI 코칭 생성 / [호출] Spring Boot AiReportClient
# POST /trader-type/advice
@router.post("/advice", response_model=TraderTypeAdviceResponse)
async def advice(req: TraderTypeAdviceRequest):
    try:
        advice_text = await generate_trader_type_advice(req)
        return TraderTypeAdviceResponse(advice=advice_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"트레이더 유형 코칭 생성 실패: {str(e)}")
