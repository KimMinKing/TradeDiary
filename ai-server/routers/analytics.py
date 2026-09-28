# [파일 용도] 분석 기능 API 라우터

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from database.connection import get_db
from schemas_dir.schemas import AnalyticsRequest, AnalyticsResponse
from services.emotion_analysis_service import EmotionAnalysisService
from services.gamification_service import GamificationService

router = APIRouter()
emotion_service = EmotionAnalysisService()
gamification_service = GamificationService()

@router.post("/emotion-trend")
async def analyze_emotion_trend(
    request: AnalyticsRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 감정 추이 분석
    """
    try:
        if request.analysis_type != "emotion":
            raise HTTPException(status_code=400, detail="감정 추이 분석이 아닙니다")

        # 데이터베이스에서 사용자의 감정 데이터 조회
        from models.emotion_analysis import EmotionAnalysis

        # 기간 설정
        if request.timeframe == "7d":
            days = 7
        elif request.timeframe == "30d":
            days = 30
        elif request.timeframe == "90d":
            days = 90
        else:
            days = 30

        start_date = datetime.now() - timedelta(days=days)

        # 감정 데이터 조회
        emotion_records = db.query(EmotionAnalysis).filter(
            EmotionAnalysis.user_id == request.user_id,
            EmotionAnalysis.created_at >= start_date
        ).all()

        if not emotion_records:
            return {
                "success": True,
                "user_id": request.user_id,
                "timeframe": request.timeframe,
                "message": "분석할 감정 데이터가 없습니다",
                "results": {},
                "insights": []
            }

        # 감정 추이 계산
        emotion_trends = {}
        for record in emotion_records:
            date_key = record.created_at.strftime("%Y-%m-%d")
            if date_key not in emotion_trends:
                emotion_trends[date_key] = {}

            emotion_trends[date_key]["fear"] = record.fear
            emotion_trends[date_key]["greed"] = record.greed
            emotion_trends[date_key]["frustration"] = record.frustration
            emotion_trends[date_key]["confidence"] = record.confidence

        # 패턴 분석
        insights = []
        if len(emotion_trends) > 1:
            # 감정 변동성 분석
            fear_values = [d["fear"] for d in emotion_trends.values()]
            avg_fear = sum(fear_values) / len(fear_values)

            if avg_fear > 0.6:
                insights.append("최근 감정 분석 결과 공포심이 높은 편입니다. 손실 관리에 더 신경 쓰시는 것이 좋습니다.")

            # 확신도 추세
            confidence_values = [d["confidence"] for d in emotion_trends.values()]
            confidence_trend = confidence_values[-1] - confidence_values[0]

            if confidence_trend > 0.2:
                insights.append("확신도가 향상되고 있습니다. 긍정적인 변화를 이어가세요!")
            elif confidence_trend < -0.2:
                insights.append("확신도가 낮아지고 있습니다. 다시 기본에 집중해 보세요.")

        return AnalyticsResponse(
            success=True,
            user_id=request.user_id,
            analysis_type=request.analysis_type,
            results={
                "emotion_trends": emotion_trends,
                "average_emotions": {
                    "fear": sum(d["fear"] for d in emotion_trends.values()) / len(emotion_trends),
                    "greed": sum(d["greed"] for d in emotion_trends.values()) / len(emotion_trends),
                    "confidence": sum(d["confidence"] for d in emotion_trends.values()) / len(emotion_trends)
                }
            },
            insights=insights,
            generated_at=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"감정 추이 분석 실패: {str(e)}")

@router.post("/behavior-analysis")
async def analyze_behavior_patterns(
    request: AnalyticsRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 행동 패턴 분석
    """
    try:
        if request.analysis_type != "behavior":
            raise HTTPException(status_code=400, detail="행동 패턴 분석이 아닙니다")

        # 데이터베이스에서 AI 챌린지 데이터 조회
        from models.ai_challenge import AIChallenge

        # 사용자의 AI 챌린지 데이터 조회
        challenges = db.query(AIChallenge).filter(
            AIChallenge.user_id == request.user_id
        ).all()

        # 행동 패턴 분석
        patterns = {
            "irrational_trades": 0,
            "challenges_completed": 0,
            "risk_management_score": 0
        }

        for challenge in challenges:
            if challenge.was_completed:
                patterns["challenges_completed"] += 1
                if challenge.is_irrational:
                    patterns["irrational_trades"] += 1

        # 위험 관리 점수 계산
        if challenges:
            patterns["risk_management_score"] = (
                patterns["challenges_completed"] / len(challenges) * 100
            )

        # 인사이트 생성
        insights = []
        if patterns["risk_management_score"] < 70:
            insights.append("위험 관리 개선이 필요합니다. AI 챌린지를 꾸준히 완료해 보세요.")

        if patterns["irrational_trades"] / len(challenges) > 0.3 if challenges else 0:
            insights.append("비이성적인 거래 패턴이 감지되었습니다. 거래 전 충분한 고민이 필요합니다.")

        return AnalyticsResponse(
            success=True,
            user_id=request.user_id,
            analysis_type=request.analysis_type,
            results=patterns,
            insights=insights,
            generated_at=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"행동 패턴 분석 실패: {str(e)}")

@router.post("/performance-metrics")
async def analyze_performance(
    request: AnalyticsRequest,
    db: Session = Depends(get_db)
):
    """
    성과 지표 분석
    """
    try:
        if request.analysis_type != "performance":
            raise HTTPException(status_code=400, detail="성과 분석이 아닙니다")

        # 사용자 게임화 점수 조회
        from models.gamification import GamificationScore

        gamification = db.query(GamificationScore).filter(
            GamificationScore.user_id == request.user_id
        ).first()

        if not gamification:
            # 초기 점수 생성
            gamification = {
                "rule_adherence": 0,
                "sharpe_ratio": 0,
                "pnl_growth": 0,
                "total_score": 0
            }
        else:
            gamification = {
                "rule_adherence": gamification.rule_adherence,
                "sharpe_ratio": gamification.sharpe_ratio,
                "pnl_growth": gamification.pnl_growth,
                "total_score": gamification.total_score
            }

        # 인사이트 생성
        insights = []
        if gamification["rule_adherence"] < 80:
            insights.append("규율 준수도를 높이기 위해 일기 작성과 AI 챌린지를 꾸준히 수행해 보세요.")

        if gamification["sharpe_ratio"] < 1.0:
            insights.append("샤프 비율이 낮습니다. 리스크 관리 전략을 개선할 필요가 있습니다.")

        if gamification["pnl_growth"] < 0:
            insights.append("수익이 감소하고 있습니다. 매매 전략을 재검토해 보세요.")

        return AnalyticsResponse(
            success=True,
            user_id=request.user_id,
            analysis_type=request.analysis_type,
            results=gamification,
            insights=insights,
            generated_at=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"성과 분석 실패: {str(e)}")