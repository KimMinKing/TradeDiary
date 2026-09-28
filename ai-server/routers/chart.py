# [파일 용도] 차트 분석 API 라우터

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
import tempfile
import os

from database.connection import get_db
from schemas_dir.schemas import ChartAnalysisRequest, ChartAnalysisResponse, TradingSignalResponse
from services.chart_analysis_service import ChartAnalysisService

router = APIRouter()
chart_service = ChartAnalysisService()

@router.post("/analyze")
async def analyze_chart(
    request: ChartAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    차트 패턴 분석
    """
    try:
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            # 실제 구현에서는 파일 내용 저장
            tmp_path = tmp_file.name

        # 차트 분석 수행
        analysis_result = await chart_service.analyze_patterns(tmp_path)

        # 분석 결과 정리
        response = {
            "success": True,
            "timestamp": analysis_result.get("timestamp"),
            "detected_patterns": analysis_result.get("detected_patterns", []),
            "visual_features": analysis_result.get("visual_features", {}),
            "confidence": analysis_result.get("analysis_confidence", 0)
        }

        # 임시 파일 삭제
        os.unlink(tmp_path)

        return response

    except Exception as e:
        # 임시 파일 삭제 (존재할 경우)
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"차트 분석 실패: {str(e)}")

@router.post("/upload-and-analyze")
async def upload_and_analyze_chart(
    file: UploadFile = File(...),
    symbol: str = None,
    db: Session = Depends(get_db)
):
    """
    차트 이미지 업로드 및 분석
    """
    try:
        # 파일 검증
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다")

        # 임시 파일 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # 차트 분석 수행
        analysis_result = await chart_service.analyze_patterns(tmp_path)

        # 트레이딩 신호 생성
        trading_signal = chart_service.generate_trading_signal(analysis_result)

        # 결과 반환
        response = {
            "success": True,
            "symbol": symbol,
            "chart_analysis": {
                "detected_patterns": analysis_result.get("detected_patterns", []),
                "confidence": analysis_result.get("analysis_confidence", 0),
                "timestamp": analysis_result.get("timestamp")
            },
            "trading_signal": trading_signal
        }

        # 임시 파일 삭제
        os.unlink(tmp_path)

        return response

    except Exception as e:
        # 임시 파일 삭제
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")

@router.get("/patterns")
async def get_available_patterns():
    """
    사용 가능한 차트 패턴 목록 조회
    """
    try:
        patterns = chart_service.patterns

        return {
            "success": True,
            "patterns": patterns,
            "count": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"패턴 조회 실패: {str(e)}")

@router.get("/signal-history/{user_id}")
async def get_signal_history(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    사용자의 신호 이력 조회
    """
    try:
        # 실제 구현에서는 DB에서 사용자의 신호 이력 조회
        # 여기서는 예시 데이터 반환

        signal_history = [
            {
                "id": 1,
                "symbol": "BTCUSDT",
                "signal": "BUY",
                "strength": 0.85,
                "confidence": 0.78,
                "detected_patterns": ["HEAD_AND_SHOULDERS", "FLAG_PATTERN"],
                "timestamp": "2024-01-15T10:30:00"
            },
            {
                "id": 2,
                "symbol": "ETHUSDT",
                "signal": "HOLD",
                "strength": 0.45,
                "confidence": 0.62,
                "detected_patterns": ["TRIANGLE"],
                "timestamp": "2024-01-15T11:15:00"
            }
        ]

        return {
            "success": True,
            "user_id": user_id,
            "signal_history": signal_history[-limit:],
            "total_count": len(signal_history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"신호 이력 조회 실패: {str(e)}")

@router.post("/save-signal")
async def save_trading_signal(
    signal_data: Dict,
    db: Session = Depends(get_db)
):
    """
    트레이딩 신호 저장
    """
    try:
        # 실제 구현에서는 DB에 신호 저장
        saved_signal_id = 1  # 예시 ID

        return {
            "success": True,
            "signal_id": saved_signal_id,
            "message": "신호가 저장되었습니다"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"신호 저장 실패: {str(e)}")