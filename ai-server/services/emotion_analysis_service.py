# [파일 용도] 매매일기 텍스트 기반 감정 분석 서비스

import logging
from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import json
from sqlalchemy.orm import Session
from database.connection import get_db
from schemas_dir.schemas import EmotionAnalysisRequest

logger = logging.getLogger(__name__)

class EmotionAnalysisService:
    """트레이딩 감정 분석 AI 서비스"""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = None
        self.model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    async def initialize(self):
        """모델 초기화"""
        try:
            import torch
            from transformers import AutoTokenizer, AutoModel

            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info("Loading emotion analysis model...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            logger.info("Emotion analysis model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load emotion analysis model: {e}")

    def analyze_text_emotions(self, text: str) -> Dict[str, float]:
        """
        텍스트를 기반으로 감정 분석 수행
        Returns: {emotion: score} (0-1 사이 값)
        """
        # 한국어 트레이딩 감정 사전 (기본 감성 사전)
        emotion_keywords = {
            "공포": ["불안", "두려움", "걱정", "압도당함", "절망", "패닉", "손실", "충격", "공포", "힘듦"],
            "탐욕": ["더", "더 많이", "기회", "상승", "대박", "돈", "부자", "환호", "흥분", "기대"],
            "좌절": ["짜증", "화남", "실패", "빡침", "허탈", "서러움", "비참", "낙담", "후회", "미치겠다"],
            "확신": ["확신", "자신감", "기대", "성공", "예상", "판단", "전망", "실행", "정확", "분석"],
            "포모": ["놓칠까봐", "빠르게", "서둘러", "반드시", "지금 바로", "최후", "마지막", "기회", "빨리", "높은"],
            "피로": ["피곤", "지침", "어지러움", "집중", "혼란", "면역", "쉬어", "쉼", "불면", "졸림"],
            "중립": ["계획", "분석", "전략", "체계", "체크", "확인", "정리", "기록", "반성", "검토"]
        }

        # 텍스트 전처리
        text = text.lower()

        # 감정 점수 계산
        emotion_scores = {}
        total_score = 0

        for emotion, keywords in emotion_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            normalized_score = min(score / 5.0, 1.0)  # 최대 5개 키워드로 정규화
            emotion_scores[emotion] = normalized_score
            total_score += normalized_score

        # 총점으로 정규화
        if total_score > 0:
            for emotion in emotion_scores:
                emotion_scores[emotion] /= total_score

        # 지배적 감정 식별
        dominant_emotion = max(emotion_scores, key=emotion_scores.get)

        return {
            "emotion_scores": emotion_scores,
            "dominant_emotion": dominant_emotion,
            "analysis_text": text,
            "timestamp": datetime.now().isoformat()
        }

    def detect_behavioral_patterns(self, emotions: Dict[str, float],
                                 trade_data: Optional[Dict] = None) -> Dict:
        """
        감정 패턴으로부터 행동 특성 감지
        """
        patterns = {
            "REVENGE_TRADING": False,
            "FATIGUE_DRIFT": False,
            "OVERCONFIDENCE": False,
            "NORMAL": True
        }

        # 보복성 거래 패턴 감지
        if emotions.get("좌절", 0) > 0.6 and emotions.get("분노", 0) > 0.5:
            patterns["REVENGE_TRADING"] = True
            patterns["NORMAL"] = False

        # 피로 누적 패턴 감지
        if emotions.get("피로", 0) > 0.7:
            patterns["FATIGUE_DRIFT"] = True
            patterns["NORMAL"] = False

        # 과도한 확신 패턴 감지
        if emotions.get("확신", 0) > 0.8 and emotions.get("탐욕", 0) > 0.7:
            patterns["OVERCONFIDENCE"] = True
            patterns["NORMAL"] = False

        return patterns

    async def save_emotion_analysis(self, db: Session, user_id: int,
                                 journal_id: int, emotion_data: Dict) -> bool:
        """감정 분석 결과 DB 저장"""
        try:
            # DB 저장 로직 구현
            # trade_journals 테이블에 emotion_analysis_id 컬럼이 필요
            from models.emotion_analysis import EmotionAnalysis

            emotion_record = EmotionAnalysis(
                user_id=user_id,
                journal_id=journal_id,
                fear=emotion_data["emotion_scores"].get("공포", 0),
                greed=emotion_data["emotion_scores"].get("탐욕", 0),
                frustration=emotion_data["emotion_scores"].get("좌절", 0),
                confidence=emotion_data["emotion_scores"].get("확신", 0),
                fomo=emotion_data["emotion_scores"].get("포모", 0),
                fatigue=emotion_data["emotion_scores"].get("피로", 0),
                neutral=emotion_data["emotion_scores"].get("중립", 0),
                dominant_emotion=emotion_data["dominant_emotion"],
                analyzed_text=emotion_data["analysis_text"]
            )

            db.add(emotion_record)
            db.commit()

            return True
        except Exception as e:
            logger.error(f"Failed to save emotion analysis: {e}")
            return False

    async def get_emotion_trend(self, db: Session, user_id: int, days: int = 30) -> Dict:
        """사용자의 감정 추이 분석"""
        # DB 쿼리를 통한 최근 감정 데이터 조회
        # 실제 구현에서는 SQLAlchemy ORM 사용
        return {
            "trend": "stable",
            "change_rate": 0.05,
            "recommendations": ["감정 관리에 신경을 쓰시는 것을 추천합니다"]
        }
