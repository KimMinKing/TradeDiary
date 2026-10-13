# [파일 용도] AI 챌린저 - 진입 전 이성적 판단 유도 서비스

import logging
from typing import Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from database.connection import get_db
import re
import math

logger = logging.getLogger(__name__)

class AIChallengeService:
    """AI 챌린저 서비스 - 거래 진입 전 합리적 판단 유도"""

    def __init__(self):
        self.challenge_questions = [
            {
                "id": 1,
                "question": "이 자산에 진입하고자 하는 구체적인 기술적 가설을 한 문장으로 설명하십시오.",
                "type": "thesis",
                "validation": self._validate_thesis
            },
            {
                "id": 2,
                "question": "현재 변동성 조건에서 목표가와 손절가를 기입하십시오.",
                "type": "prices",
                "validation": self._validate_prices
            },
            {
                "id": 3,
                "question": f"과거 유사 국면에서 동일한 근거로 매매했을 때 귀하의 손실률은 68%였습니다. 그래도 진입하시겠습니까? (예/아니오)",
                "type": "confirmation",
                "validation": self._validate_confirmation
            }
        ]

    async def initialize(self):
        """서비스 초기화"""
        logger.info("AI Challenge Service initialized")

    def create_challenge_session(self, user_id: int, symbol: str, current_price: float) -> Dict:
        """
        AI 챌린지 세션 생성
        """
        return {
            "session_id": f"challenge_{user_id}_{int(datetime.now().timestamp())}",
            "user_id": user_id,
            "symbol": symbol,
            "current_price": current_price,
            "questions": self.challenge_questions,
            "started_at": datetime.now().isoformat(),
            "completed": False,
            "responses": {}
        }

    def validate_thesis(self, thesis: str) -> Dict:
        """
        기술적 가설 검증
        """
        validation_result = {
            "is_valid": True,
            "confidence_score": 0.0,
            "warnings": [],
            "suggestions": []
        }

        # 가설 품질 평가
        if len(thesis) < 10:
            validation_result["warnings"].append("가설이 너무 간단합니다. 더 구체적인 근거를 제시해주세요.")
            validation_result["confidence_score"] -= 0.3

        # 키워드 기반 평가
        positive_keywords = ["지지", "돌파", "상승", "추세", "신호", "패턴", "이평선", "RSI", "MACD"]
        negative_keywords = ["감정", "망정", "희망", "기대", "떨어짐", "불안", "포기"]

        positive_count = sum(1 for kw in positive_keywords if kw in thesis)
        negative_count = sum(1 for kw in negative_keywords if kw in thesis)

        if positive_count > 0:
            validation_result["confidence_score"] += positive_count * 0.2
        else:
            validation_result["warnings"].append("기술적 지표나 차트 패턴에 대한 언급이 필요합니다.")
            validation_result["confidence_score"] -= 0.2

        if negative_count > 0:
            validation_result["warnings"].append("감정적인 표현이 포함되어 있습니다.")
            validation_result["confidence_score"] -= negative_count * 0.3

        # 최대 점수 제한
        validation_result["confidence_score"] = min(validation_result["confidence_score"], 1.0)

        # 신뢰도 등급
        if validation_result["confidence_score"] >= 0.7:
            grade = "우수"
        elif validation_result["confidence_score"] >= 0.5:
            grade = "양호"
        elif validation_result["confidence_score"] >= 0.3:
            grade = "보통"
        else:
            grade = "미흡"

        validation_result["grade"] = grade

        return validation_result

    def _validate_thesis(self, response: str) -> Dict:
        """가설 검증 로직"""
        return self.validate_thesis(response)

    def validate_price_input(self, target_price: float, stop_loss: float,
                           entry_price: float) -> Dict:
        """
        가격 입력 유효성 검사
        """
        validation_result = {
            "is_valid": True,
            "risk_reward_ratio": 0,
            "warnings": [],
            "suggestions": []
        }

        # 가격 입력 검증
        if target_price <= entry_price and stop_loss >= entry_price:
            validation_result["warnings"].append("목표가는 진입가보다 높아야 하고, 손절가는 진입가보다 낮아야 합니다.")
            validation_result["is_valid"] = False
            return validation_result

        # 손익비 계산
        if target_price > entry_price:  # 롱 포지션
            risk = abs(entry_price - stop_loss)
            reward = abs(target_price - entry_price)
        else:  # 숏 포지션
            risk = abs(entry_price - target_price)
            reward = abs(entry_price - stop_loss)

        if risk > 0:
            risk_reward_ratio = reward / risk
            validation_result["risk_reward_ratio"] = round(risk_reward_ratio, 2)

            # 손익비 평가
            if risk_reward_ratio < 1.0:
                validation_result["warnings"].append(f"손익비가 {risk_reward_ratio:.2f}로 낮습니다. 1.5 이상을 권장합니다.")
                validation_result["is_valid"] = False
            elif risk_reward_ratio < 1.5:
                validation_result["suggestions"].append("손익비가 1.5 미만입니다. 더 나은 위험 관리를 고려해보세요.")
        else:
            validation_result["warnings"].append("손절가를 설정해야 합니다.")
            validation_result["is_valid"] = False

        return validation_result

    def _validate_prices(self, response: Dict) -> Dict:
        """가격 입력 검증"""
        try:
            target_price = float(response.get("target_price", 0))
            stop_loss = float(response.get("stop_loss", 0))
            entry_price = float(response.get("entry_price", 0))

            return self.validate_price_input(target_price, stop_loss, entry_price)
        except ValueError:
            return {
                "is_valid": False,
                "warnings": ["유효한 숫자를 입력해주세요."]
            }

    def _validate_confirmation(self, response: str) -> Dict:
        """확인 응답 검증"""
        response = response.strip().lower()
        if response in ["예", "yes", "y"]:
            return {"is_valid": True, "confirmed": True}
        elif response in ["아니오", "no", "n"]:
            return {"is_valid": True, "confirmed": False}
        else:
            return {"is_valid": False, "warnings": ["예/아니오로 응답해주세요."]}

    def analyze_irrational_signals(self, thesis: str, price_data: Dict) -> Dict:
        """
        비이성적 진입 신호 분석
        """
        signals = {
            "is_irrational": False,
            "reasons": [],
            "confidence": 0.0
        }

        # 시장 시간 분석
        current_hour = datetime.now().hour
        if 2 <= current_hour <= 4:
            signals["reasons"].append("심야 시간대 거래는 피하시는 것을 권장합니다.")
            signals["is_irrational"] = True
            signals["confidence"] += 0.3

        # 가격 변동성 분석
        if "price_change" in price_data:
            volatility = price_data["price_change"]
            if volatility > 0.1:  # 10% 이상 변동
                signals["reasons"].append(f"가격 변동성이 {volatility*100:.1f}%로 매우 높습니다.")
                signals["is_irrational"] = True
                signals["confidence"] += 0.4

        # 키워드 분석
        irrational_keywords = ["망정", "한탕", "감", "이게 마지막", "역대최저"]
        for keyword in irrational_keywords:
            if keyword in thesis:
                signals["reasons"].append(f"'{keyword}'라는 표현은 감정적인 판단을 암시합니다.")
                signals["is_irrational"] = True
                signals["confidence"] += 0.2

        return signals

    def generate_ai_feedback(self, challenge_session: Dict) -> str:
        """
        AI 피드백 생성
        """
        feedback_parts = []
        responses = challenge_session.get("responses", {})

        # 가설 피드백
        if "thesis" in responses:
            thesis_result = responses["thesis"]
            if thesis_result.get("grade") == "미흡":
                feedback_parts.append("가설이 구체적이지 않거나 감정적인 표현이 포함되어 있습니다.")

        # 가격 피드백
        if "prices" in responses:
            price_result = responses["prices"]
            if not price_result.get("is_valid"):
                feedback_parts.append("가격 설정이 불안정합니다. 손절가를 반드시 설정하고 손익비를 1.5 이상으로 유지하세요.")

        # 확정 피드백
        if "confirmation" in responses:
            if not responses["confirmation"].get("confirmed"):
                feedback_parts.append("확인 단계에서 신중한 태도를 보여주셨습니다. 이는 긍정적인 신호입니다.")

        if not feedback_parts:
            return "모든 질문에 잘 응답하셨습니다. 계획된 포지션으로 진입하세요."

        return " ".join(feedback_parts)

    def save_challenge_result(self, db: Session, challenge_session: Dict) -> bool:
        """
        챌린지 결과 저장
        """
        try:
            from models.ai_challenge import AIChallenge

            challenge_record = AIChallenge(
                user_id=challenge_session["user_id"],
                journal_id=challenge_session.get("journal_id"),
                entry_thesis=challenge_session["responses"].get("thesis", {}).get("thesis", ""),
                target_price=challenge_session["responses"].get("prices", {}).get("target_price"),
                stop_loss=challenge_session["responses"].get("prices", {}).get("stop_loss"),
                risk_reward_ratio=challenge_session["responses"].get("prices", {}).get("risk_reward_ratio", 0),
                was_completed=challenge_session.get("completed", False),
                ai_feedback=self.generate_ai_feedback(challenge_session),
                is_irrational=challenge_session.get("is_irrational", False)
            )

            db.add(challenge_record)
            db.commit()

            return True
        except Exception as e:
            logger.error(f"Failed to save challenge result: {e}")
            return False