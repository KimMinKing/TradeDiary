# [파일 용도] AI 트레이딩 리포트 생성 API 엔드포인트

from fastapi import APIRouter, HTTPException
from models import ReportRequest, ReportResponse
from services.report_service import generate_report

router = APIRouter()


# [용도] 트레이딩 통계 기반 AI 분석 리포트 생성 / [호출] Spring Boot AiReportClient
# POST /report/analyze
@router.post("/analyze", response_model=ReportResponse)
async def analyze(req: ReportRequest):
    try:
        report_text = await generate_report(req)
        return ReportResponse(report=report_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 실패: {str(e)}")
