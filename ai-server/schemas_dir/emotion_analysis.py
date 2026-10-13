# [파일 용도] 감정 분석 데이터 모델

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class EmotionAnalysis(Base):
    """감정 분석 결과 테이블"""
    __tablename__ = "emotion_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    journal_id = Column(Integer, ForeignKey("trade_journals.id"), nullable=True)

    # 감정 수치 (0-1 사이)
    fear = Column(Float, default=0.0, comment="공포")
    greed = Column(Float, default=0.0, comment="탐욕")
    frustration = Column(Float, default=0.0, comment="좌절")
    confidence = Column(Float, default=0.0, comment="확신")
    fomo = Column(Float, default=0.0, comment="포모")
    fatigue = Column(Float, default=0.0, comment="피로도")
    neutral = Column(Float, default=1.0, comment="중립")

    # 지배적 감정
    dominant_emotion = Column(String(20), nullable=False, comment="지배적 감정")

    # 분석된 텍스트
    analyzed_text = Column(Text, nullable=False, comment="원본 텍스트")

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 관계
    user = relationship("User", back_populates="emotion_analyses")
    journal = relationship("TradeJournal", back_populates="emotion_analysis")