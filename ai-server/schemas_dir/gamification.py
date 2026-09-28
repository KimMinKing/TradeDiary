# [파일 용도] 게임화 데이터 모델

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database.connection import Base

class GamificationScore(Base):
    """게임화 점수 테이블"""
    __tablename__ = "gamification_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # 핵심 지표
    rule_adherence = Column(Float, default=0.0, comment="규율 준수도 (0-100)")
    sharpe_ratio = Column(Float, default=0.0, comment="샤프 비율")
    pnl_growth = Column(Float, default=0.0, comment="수익 성장률 (%)")

    # 점수 구성 요소
    total_score = Column(Integer, default=0, comment="총점")
    rank = Column(Integer, default=0, comment="랭킹")

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 관계
    user = relationship("User", back_populates="gamification_score")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")

class Achievement(Base):
    """업정 테이블"""
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon = Column(String(50), default="🏆")
    condition_type = Column(String(20), nullable=False)  # TRADE_COUNT, WIN_RATE, RULE_ADHERENCE, CONSECUTIVE_DAYS
    condition_value = Column(Float, nullable=False)
    category = Column(String(20), default="DISCIPLINE")

    # 관계
    user_achievements = relationship("UserAchievement", back_populates="achievement")

class UserAchievement(Base):
    """사용자 업정 테이블"""
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)

    # 업정 정보
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # 복합 키
    __table_args__ = (UniqueConstraint('user_id', 'achievement_id'),)

    # 관계
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")