# [파일 용도] AI 서버 API 요청/응답 스키마 정의

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

# ===== 매매일기 관련 스키마 =====

class EmotionAnalysisRequest(BaseModel):
    """감정 분석 요청"""
    user_id: int
    journal_id: int
    text: str = Field(..., min_length=10, description="매매일기 내용")
    trade_data: Optional[Dict] = None

class EmotionAnalysisResponse(BaseModel):
    """감정 분석 응답"""
    success: bool
    emotion_scores: Dict[str, float]  # 감정별 점수
    dominant_emotion: str  # 지배적 감정
    behavioral_patterns: Dict[str, bool]  # 행동 패턴
    saved: bool  # DB 저장 여부
    message: str

class AIChallengeRequest(BaseModel):
    """AI 챌린지 요청"""
    user_id: int
    symbol: str
    current_price: float

class AIChallengeResponse(BaseModel):
    """AI 챌린지 응답"""
    session_id: str
    questions: List[Dict]
    message: str

# ===== 게임화 관련 스키마 =====

class GamificationResponse(BaseModel):
    """게임화 응답"""
    success: bool
    user_id: int
    scores: Dict[str, float]  # 각종 점수
    achievements: List[Dict]
    updated_at: str

class AchievementResponse(BaseModel):
    """업정 응답"""
    success: bool
    user_id: int
    achievements: List[Dict]
    total_count: int

class LeaderboardResponse(BaseModel):
    """리더보드 응답"""
    success: bool
    leaderboard: List[Dict]
    total_count: int
    updated_at: str

# ===== 차트 분석 관련 스키마 =====

class ChartAnalysisRequest(BaseModel):
    """차트 분석 요청"""
    symbol: str
    timeframe: str = "1h"
    image_url: Optional[str] = None
    analysis_type: str = "pattern"  # pattern, signal, full

class ChartAnalysisResponse(BaseModel):
    """차트 분석 응답"""
    success: bool
    symbol: str
    detected_patterns: List[Dict]
    visual_features: Dict
    confidence: float
    timestamp: str

class TradingSignalResponse(BaseModel):
    """트레이딩 신호 응답"""
    signal: str  # BUY, SELL, HOLD, WATCH
    strength: float  # 신호 강도 (0-1)
    reasoning: List[str]  # 신호 근거
    confidence: float  # 신뢰도 (0-1)
    timestamp: str

# ===== 리포트 관련 스키마 =====

class ReportGenerationRequest(BaseModel):
    """리포트 생성 요청"""
    user_id: int
    report_type: str  # daily, weekly, monthly
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ReportGenerationResponse(BaseModel):
    """리포트 생성 응답"""
    success: bool
    report_id: str
    content: str
    generated_at: str
    next_update: Optional[str] = None

# ===== 분석 관련 스키마 =====

class AnalyticsRequest(BaseModel):
    """분석 요청"""
    user_id: int
    analysis_type: str  # emotion, behavior, performance
    timeframe: str  # 7d, 30d, 90d
    filters: Optional[Dict] = None

class AnalyticsResponse(BaseModel):
    """분석 응답"""
    success: bool
    user_id: int
    analysis_type: str
    results: Dict
    insights: List[str]
    generated_at: str

# ===== 레퍼럴/연동 관련 스키마 =====

class ReferralRequest(BaseModel):
    """레퍼럴 요청"""
    user_id: int
    exchange: str  # BINANCE, UPBIT, OKX
    referral_code: str

class ReferralResponse(BaseModel):
    """레퍼럴 응답"""
    success: bool
    referral_id: str
    benefits: List[str]
    estimated_savings: float

# ===== 카피 트레이딩 관련 스키마 =====

class CopyTradingRequest(BaseModel):
    """카피 트레이딩 요청"""
    subscriber_id: int
    provider_id: int
    subscription_type: str  # PERCENTAGE, FIXED
    amount: Optional[float] = None

class CopyTradingResponse(BaseModel):
    """카피 트레이딩 응답"""
    success: bool
    subscription_id: str
    monthly_fee: float
    terms: str

# ===== 공통 응답 스키마 =====

class APIResponse(BaseModel):
    """공통 API 응답"""
    success: bool
    message: str
    data: Optional[Dict] = None
    timestamp: str

class ErrorResponse(BaseModel):
    """에러 응답"""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict] = None

# ===== 감정 분석 관련 스키마 =====

class EmotionAnalysisRequest(BaseModel):
    """감정 분석 요청"""
    text: str
    language: str = "ko"

class EmotionAnalysisResponse(BaseModel):
    """감정 분석 응답"""
    emotion: str
    confidence: float
    reasoning: List[str]
    timestamp: str

# ===== 일기 피드백 관련 스키마 =====

class JournalFeedbackResponse(BaseModel):
    """일기 피드백 응답"""
    feedback: str
    suggestions: List[str]
    strengths: List[str]
    areas_to_improve: List[str]
    timestamp: str

# ===== 기간별 리뷰 관련 스키마 =====

class PeriodReviewRequest(BaseModel):
    """기간별 리뷰 요청"""
    period: str  # "weekly" | "monthly"
    start_date: str
    end_date: str
    journals: List[Dict]

class PeriodReviewResponse(BaseModel):
    """기간별 리뷰 응답"""
    review: str
    summary: Optional[str] = None
    insights: Optional[List[str]] = None
    timestamp: str
class PlanReviewRequest(BaseModel):
    """매매 계획 AI 한줄평 요청"""
    trade_date: str
    plans: List[Dict] = []
    journal: Optional[Dict] = None


class PlanReviewResponse(BaseModel):
    """매매 계획 AI 한줄평 응답"""
    feedback: str
