# [파일 용도] 매매일기 관련 API 라우터

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import httpx

from database.connection import get_db
from schemas_dir.schemas import (
    EmotionAnalysisRequest,
    EmotionAnalysisResponse, AIChallengeRequest, AIChallengeResponse,
    PlanReviewRequest, PlanReviewResponse
)
from models import (
    JournalFeedbackRequest,
    JournalFeedbackResponse,
    PeriodReviewRequest,
    PeriodReviewResponse,
)
from services.emotion_analysis_service import EmotionAnalysisService
from services.ai_challenge_service import AIChallengeService
from services.journal_feedback_service import generate_journal_feedback, generate_plan_review
from services.period_review_service import generate_period_review as create_period_review

router = APIRouter()
logger = logging.getLogger(__name__)

# 서비스 인스턴스 생성
emotion_service = EmotionAnalysisService()
challenge_service = AIChallengeService()


@router.post("/feedback", response_model=JournalFeedbackResponse)
async def feedback(request: JournalFeedbackRequest):
    try:
        return JournalFeedbackResponse(feedback=await generate_journal_feedback(request))
    except RuntimeError as e:
        logger.error("Journal feedback configuration error: %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as e:
        logger.error("Journal feedback provider failed: %s", e)
        raise HTTPException(status_code=502, detail="AI 분석 제공자 호출에 실패했습니다") from e

@router.post("/emotion/analyze")
async def analyze_emotion(
    request: EmotionAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    매매일기 감정 분석
    """
    try:
        # 감정 분석 수행
        emotion_data = emotion_service.analyze_text_emotions(request.text)

        # 감정 패턴 분석
        patterns = emotion_service.detect_behavioral_patterns(
            emotion_data["emotion_scores"],
            {"trade_data": request.trade_data}
        )

        # 결과 저장
        saved = await emotion_service.save_emotion_analysis(
            db,
            request.user_id,
            request.journal_id,
            emotion_data
        )

        return EmotionAnalysisResponse(
            success=True,
            emotion_scores=emotion_data["emotion_scores"],
            dominant_emotion=emotion_data["dominant_emotion"],
            behavioral_patterns=patterns,
            saved=saved,
            message="감정 분석이 완료되었습니다"
        )

    except Exception as e:
        logger.error(f"Emotion analysis failed: {e}")
        raise HTTPException(status_code=500, detail="감정 분석에 실패했습니다")

@router.post("/ai-challenge/start")
async def start_ai_challenge(
    request: AIChallengeRequest,
    db: Session = Depends(get_db)
):
    """
    AI 챌린지 세션 시작
    """
    try:
        # 챌린지 세션 생성
        challenge_session = challenge_service.create_challenge_session(
            request.user_id,
            request.symbol,
            request.current_price
        )

        return {
            "success": True,
            "session_id": challenge_session["session_id"],
            "questions": challenge_session["questions"]
        }

    except Exception as e:
        logger.error(f"AI challenge start failed: {e}")
        raise HTTPException(status_code=500, detail="AI 챌린지 시작에 실패했습니다")

@router.post("/ai-challenge/respond")
async def respond_to_challenge(
    session_id: str,
    question_id: int,
    response: str,
    db: Session = Depends(get_db)
):
    """
    AI 챌린지 질문 응답
    """
    try:
        # 세션 조회 (실제 구현에서는 Redis나 세션 저장소 사용)
        # 여기서는 간단한 예시 구현

        # 질문 타입별 검증
        if question_id == 1:  # 가설
            validation_result = challenge_service.validate_thesis(response)
        elif question_id == 2:  # 가격
            try:
                price_data = {
                    "target_price": float(response.split("목표가:")[1].split("원")[0].strip()),
                    "stop_loss": float(response.split("손절가:")[1].split("원")[0].strip()),
                    "entry_price": 50000  # 예시 진입가
                }
                validation_result = challenge_service.validate_price_input(**price_data)
            except:
                validation_result = {"is_valid": False, "warnings": ["형식이 올바르지 않습니다"]}
        else:  # 확인
            validation_result = challenge_service._validate_confirmation(response)

        return {
            "success": True,
            "question_id": question_id,
            "validation_result": validation_result,
            "next_question": question_id + 1 if question_id < 3 else None
        }

    except Exception as e:
        logger.error(f"Challenge response failed: {e}")
        raise HTTPException(status_code=500, detail="챌린지 응답에 실패했습니다")

@router.post("/ai-challenge/complete")
async def complete_ai_challenge(
    session_id: str,
    responses: dict,
    db: Session = Depends(get_db)
):
    """
    AI 챌린지 완료
    """
    try:
        # 챌린지 결과 저장
        success = challenge_service.save_challenge_result(db, {
            "session_id": session_id,
            "responses": responses,
            "completed": True
        })

        return {
            "success": success,
            "message": "AI 챌린지가 완료되었습니다" if success else "저장에 실패했습니다"
        }

    except Exception as e:
        logger.error(f"Challenge completion failed: {e}")
        raise HTTPException(status_code=500, detail="챌린지 완료에 실패했습니다")


@router.post("/period-review", response_model=PeriodReviewResponse)
async def generate_period_review(
    request: PeriodReviewRequest
):
    """
    기간별 AI 리뷰 생성
    """
    if request.period not in {"weekly", "monthly"}:
        raise HTTPException(status_code=422, detail="period는 weekly 또는 monthly여야 합니다")

    try:
        review = await create_period_review(request)
        return PeriodReviewResponse(review=review)
    except RuntimeError as e:
        logger.error("Period review configuration error: %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as e:
        logger.error("Period review provider failed: %s", e)
        raise HTTPException(status_code=502, detail="AI 분석 제공자 호출에 실패했습니다") from e
@router.post("/plan-review", response_model=PlanReviewResponse)
async def generate_plan_review_endpoint(
    request: PlanReviewRequest,
    db: Session = Depends(get_db)
):
    """
    매매 계획 AI 한줄평 생성
    """
    try:
        feedback = await generate_plan_review(request)
        return PlanReviewResponse(feedback=feedback)
    except Exception as e:
        logger.error(f"Plan review generation failed: {e}")
        raise HTTPException(status_code=500, detail="매매 계획 AI 생성에 실패했습니다")
