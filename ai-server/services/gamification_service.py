# [파일 용도] 게임화 서비스 - 규율 준수도 점수 및 업적 시스템

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.connection import get_db
import math

logger = logging.getLogger(__name__)

class GamificationService:
    """게임화 서비스 - 규율 기반 점수 시스템"""

    def __init__(self):
        self.achievements = self._load_achievements()
        self.score_weights = {
            "rule_adherence": 0.4,
            "sharpe_ratio": 0.4,
            "pnl_growth": 0.2
        }

    async def initialize(self):
        """서비스 초기화"""
        logger.info("Gamification Service initialized")

    def _load_achievements(self) -> Dict:
        """업정 데이터 로드"""
        return {
            "risk_control_pro": {
                "id": 1,
                "name": "Risk-Control Pro",
                "description": "30일간 손실 한도를 100% 준수함",
                "icon": "🛡️",
                "condition_type": "RULE_ADHERENCE",
                "condition_value": 100,
                "category": "DISCIPLINE"
            },
            "stop_loss_master": {
                "id": 2,
                "name": "Stop-loss Master",
                "description": "10번의 손절 약속을 100% 지킴",
                "icon": "🎯",
                "condition_type": "TRADE_COUNT",
                "condition_value": 10,
                "category": "DISCIPLINE"
            },
            "consistently_disciplined": {
                "id": 3,
                "name": "Consistently Disciplined",
                "description": "60일간 매일 일기 작성",
                "icon": "📝",
                "condition_type": "CONSECUTIVE_DAYS",
                "condition_value": 60,
                "category": "DISCIPLINE"
            }
        }

    def calculate_rule_adherence_score(self, user_data: Dict) -> float:
        """
        규율 준수도 점수 계산 (0-100)
        """
        scores = []

        # 손실 한도 준수율
        if "drawdown_violations" in user_data:
            adherence_rate = (user_data["total_trades"] - user_data["drawdown_violations"]) / user_data["total_trades"]
            scores.append(adherence_rate * 100)

        # 손절 지율율
        if "stop_loss_set" in user_data and "stop_loss_hit" in user_data:
            if user_data["stop_loss_set"] > 0:
                stop_loss_discipline = (user_data["stop_loss_set"] - user_data["stop_loss_hit"]) / user_data["stop_loss_set"]
                scores.append(stop_loss_discipline * 100)

        # AI 챌린저 완료율
        if "ai_challenges_completed" in user_data and "ai_challenges_total" in user_data:
            if user_data["ai_challenges_total"] > 0:
                challenge_rate = user_data["ai_challenges_completed"] / user_data["ai_challenges_total"]
                scores.append(challenge_rate * 100)

        # 일기 작성율
        if "journals_written" in user_data and "total_trade_days" in user_data:
            diary_rate = user_data["journals_written"] / user_data["total_trade_days"]
            scores.append(diary_rate * 100)

        # 평균 점수 반환
        return sum(scores) / len(scores) if scores else 0.0

    def calculate_sharpe_ratio(self, pnl_data: List[float]) -> float:
        """
        샤프 비율 계산
        """
        if len(pnl_data) < 2:
            return 0.0

        returns = np.array(pnl_data)
        risk_free_rate = 0.02  # 가정: 연 2% 무위험 수익률

        excess_returns = returns - risk_free_rate / 252  # 일간 기준

        sharpe_ratio = np.sqrt(252) * np.mean(excess_returns) / np.std(excess_returns) if np.std(excess_returns) > 0 else 0

        return round(sharpe_ratio, 2)

    def calculate_pnl_growth_rate(self, pnl_history: List[float]) -> float:
        """
        수익 성장률 계산
        """
        if len(pnl_history) < 2:
            return 0.0

        initial = pnl_history[0]
        final = pnl_history[-1]

        if initial == 0:
            return 0.0

        growth_rate = ((final - initial) / initial) * 100
        return round(growth_rate, 2)

    def calculate_total_score(self, user_data: Dict) -> int:
        """
        총점 계산
        """
        rule_adherence = self.calculate_rule_adherence_score(user_data)
        sharpe = self.calculate_sharpe_ratio(user_data.get("pnl_history", []))
        pnl_growth = self.calculate_pnl_growth_rate(user_data.get("pnl_history", []))

        weighted_score = (
            rule_adherence * self.score_weights["rule_adherence"] +
            min(max(sharpe * 10, 0), 100) * self.score_weights["sharpe_ratio"] +
            min(max(pnl_growth, 0), 100) * self.score_weights["pnl_growth"]
        )

        return int(round(weighted_score))

    def check_achievement_conditions(self, user_id: int, user_data: Dict) -> List[Dict]:
        """
        업정 획득 조건 확인
        """
        achievements_to_grant = []

        for achievement_id, achievement in self.achievements.items():
            condition_type = achievement["condition_type"]
            condition_value = achievement["condition_value"]

            if condition_type == "RULE_ADHERENCE":
                score = self.calculate_rule_adherence_score(user_data)
                if score >= condition_value:
                    achievements_to_grant.append(achievement)

            elif condition_type == "TRADE_COUNT":
                if user_data.get("stop_loss_set", 0) >= condition_value:
                    achievements_to_grant.append(achievement)

            elif condition_type == "CONSECUTIVE_DAYS":
                if user_data.get("consecutive_days", 0) >= condition_value:
                    achievements_to_grant.append(achievement)

        return achievements_to_grant

    def get_user_rank(self, all_users_scores: Dict) -> int:
        """
        사용자 랭킹 계산
        """
        sorted_scores = sorted(all_users_scores.values(), reverse=True)
        return sorted_scores.index(all_users_scores.get("current_user_score", 0)) + 1

    def generate_daily_challenge(self, user_data: Dict) -> Dict:
        """
        일일 챌린지 생성
        """
        challenges = [
            {
                "id": "diary_streak",
                "title": "연속 일기 작성",
                "description": "오늘도 일기를 작성하여 연속 기록을 이어가세요",
                "reward_points": 10,
                "type": "diary"
            },
            {
                "id": "ai_challenge",
                "title": "AI 챌린저 완료",
                "description": "거래 전 AI 챌린저를 완료하여 이성적 판단 하세요",
                "reward_points": 20,
                "type": "ai"
            },
            {
                "id": "risk_management",
                "title": "위험 관리 실천",
                "description": "손절가 설정 및 확인하기",
                "reward_points": 15,
                "type": "risk"
            }
        ]

        return challenges

    def update_user_score(self, db: Session, user_id: int, trade_data: Dict) -> Dict:
        """
        사용자 점수 업데이트
        """
        try:
            # 사용자 데이터 조회
            from models.gamification import GamificationScore

            user_score = db.query(GamificationScore).filter(
                GamificationScore.user_id == user_id
            ).first()

            if not user_score:
                user_score = GamificationScore(user_id=user_id)
                db.add(user_score)

            # 점수 계산
            user_data = self._prepare_user_data(db, user_id)
            new_score = self.calculate_total_score(user_data)

            # 업데이트
            user_score.rule_adherence = self.calculate_rule_adherence_score(user_data)
            user_score.sharpe_ratio = self.calculate_sharpe_ratio(user_data.get("pnl_history", []))
            user_score.pnl_growth = self.calculate_pnl_growth_rate(user_data.get("pnl_history", []))
            user_score.total_score = new_score
            user_score.updated_at = datetime.now()

            db.commit()

            # 업정 확인
            achievements = self.check_achievement_conditions(user_id, user_data)

            return {
                "success": True,
                "new_score": new_score,
                "achievements": achievements
            }

        except Exception as e:
            logger.error(f"Failed to update user score: {e}")
            return {"success": False, "error": str(e)}

    def _prepare_user_data(self, db: Session, user_id: int) -> Dict:
        """점수 계산을 위한 사용자 데이터 준비"""
        # 실제 DB 쿼리를 통한 데이터 수집
        # 예시 데이터 - 실제 구현에서는 SQLAlchemy ORM 사용
        return {
            "total_trades": 100,
            "drawdown_violations": 5,
            "stop_loss_set": 20,
            "stop_loss_hit": 2,
            "ai_challenges_completed": 80,
            "ai_challenges_total": 100,
            "journals_written": 90,
            "total_trade_days": 100,
            "pnl_history": [1000, 1200, 1100, 1500, 1800, 2000]
        }

    def get_leaderboard_data(self, limit: int = 10) -> List[Dict]:
        """
        리더보드 데이터 조회
        """
        # 실제 구현에서는 DB에서 상위 사용자 조회
        leaderboard = [
            {
                "rank": 1,
                "user_id": 123,
                "nickname": "규율의 마스터",
                "total_score": 980,
                "rule_adherence": 95,
                "sharpe_ratio": 2.5,
                "pnl_growth": 45
            },
            {
                "rank": 2,
                "user_id": 456,
                "nickname": "AI 트레이더",
                "total_score": 920,
                "rule_adherence": 90,
                "sharpe_ratio": 2.2,
                "pnl_growth": 38
            }
        ]

        return leaderboard