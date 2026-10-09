# [파일 용도] AI 챌린지 데이터 모델

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database.connection import Base

class AIChallenge(Base):
    """AI 챌린지 결과 테이블"""
    __tablename__ = "ai_challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    journal_id = Column(Integer, ForeignKey("trade_journals.id"), nullable=True)

    # 진입 전 챌린지 내용
    entry_thesis = Column(Text, nullable=False, comment="기술적 가설")
    target_price = Column(Float, nullable=True, comment="목표가")
    stop_loss = Column(Float, nullable=True, comment="손절가")
    risk_reward_ratio = Column(Float, nullable=True, comment="손익비")

    # 챌린지 결과
    was_completed = Column(Boolean, default=True, comment="완료 여부")
    challenge_created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="챌린지 생성 시점")
    entry_confirmed = Column(Boolean, default=False, comment="실제 진입 여부")

    # AI 피드백
    ai_feedback = Column(Text, nullable=True, comment="AI 분석 피드백")
    is_irrational = Column(Boolean, default=False, comment="비이성적 진입 판단")

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 관계
    user = relationship("User", back_populates="ai_challenges")
    journal = relationship("TradeJournal", back_populates="ai_challenge")