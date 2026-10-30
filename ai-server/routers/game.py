# [파일 용도] 게임화 기능 API 라우터

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database.connection import get_db
from schemas_dir.schemas import GamificationResponse, AchievementResponse, LeaderboardResponse
from services.gamification_service import GamificationService

router = APIRouter()
gamification_service = GamificationService()

@router.get("/score/{user_id}")
async def get_user_score(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    사용자 게임화 점수 조회
    """
    try:
        # 사용자 데이터 준비
        user_data = gamification_service._prepare_user_data(db, user_id)

        # 점수 계산
        total_score = gamification_service.calculate_total_score(user_data)

        return {
            "success": True,
            "user_id": user_id,
            "scores": {
                "total_score": total_score,
                "rule_adherence": gamification_service.calculate_rule_adherence_score(user_data),
                "sharpe_ratio": gamification_service.calculate_sharpe_ratio(user_data.get("pnl_history", [])),
                "pnl_growth": gamification_service.calculate_pnl_growth_rate(user_data.get("pnl_history", []))
            },
            "updated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"점수 조회 실패: {str(e)}")

@router.post("/score/update/{user_id}")
async def update_user_score(
    user_id: int,
    trade_data: dict,
    db: Session = Depends(get_db)
):
    """
    사용자 점수 업데이트
    """
    try:
        result = gamification_service.update_user_score(db, user_id, trade_data)

        if result["success"]:
            return {
                "success": True,
                "message": "점수가 업데이트되었습니다",
                "new_score": result["new_score"],
                "new_achievements": result.get("achievements", [])
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "업데이트 실패"))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"점수 업데이트 실패: {str(e)}")

@router.get("/achievements/{user_id}")
async def get_user_achievements(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    사용자 업정 목록 조회
    """
    try:
        # 사용자 데이터 준비
        user_data = gamification_service._prepare_user_data(db, user_id)

        # 업정 조건 확인
        achievements = gamification_service.check_achievement_conditions(user_id, user_data)

        return {
            "success": True,
            "user_id": user_id,
            "achievements": achievements,
            "total_count": len(achievements)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업정 조회 실패: {str(e)}")

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    리더보드 조회
    """
    try:
        leaderboard = gamification_service.get_leaderboard_data(limit)

        return LeaderboardResponse(
            success=True,
            leaderboard=leaderboard,
            total_count=len(leaderboard),
            updated_at=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"리더보드 조회 실패: {str(e)}")

@router.get("/daily-challenge/{user_id}")
async def get_daily_challenge(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    일일 챌린지 조회
    """
    try:
        user_data = gamification_service._prepare_user_data(db, user_id)
        challenges = gamification_service.generate_daily_challenge(user_data)

        return {
            "success": True,
            "user_id": user_id,
            "challenges": challenges,
            "date": datetime.now().date().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챌린지 조회 실패: {str(e)}")

@router.post("/achievement/claim/{user_id}/{achievement_id}")
async def claim_achievement(
    user_id: int,
    achievement_id: int,
    db: Session = Depends(get_db)
):
    """
    업정 획득
    """
    try:
        # 업정 획득 처리 로직
        # 실제 구현에서는 DB에 저장

        return {
            "success": True,
            "message": "업정을 획득했습니다!",
            "achievement_id": achievement_id,
            "earned_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업정 획득 실패: {str(e)}")