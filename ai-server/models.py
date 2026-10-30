# [파일 용도] AI 리포트 요청/응답 Pydantic 모델 정의

from pydantic import BaseModel, Field, field_validator
from typing import Optional


# [클래스] 핵심 성과 지표 요약
class SummaryStats(BaseModel):
    total_positions: int
    win_count: int
    loss_count: int
    win_rate: float
    profit_factor: float
    avg_win: float
    avg_loss: float
    rr_ratio: float
    max_win_streak: int
    max_loss_streak: int
    max_single_loss: str
    total_pnl: str


# [클래스] 종목별 성과 데이터
class SymbolStats(BaseModel):
    symbol: str
    total_count: int
    win_count: int
    win_rate: float
    total_pnl: str
    avg_pnl: str


# [클래스] 감정별 성과 데이터
class EmotionStats(BaseModel):
    emotion: str
    label: str
    total_count: int
    win_count: int
    win_rate: float
    total_pnl: str


# [클래스] AI 리포트 생성 요청 DTO / [호출] POST /report/analyze
class ReportRequest(BaseModel):
    language: str = "en"
    exchange: Optional[str] = None          # 거래소 필터 (UPBIT/BYBIT/None=전체)
    summary: SummaryStats                   # 핵심 성과 지표
    top_symbols: list[SymbolStats] = []     # 종목별 성과 (수익 상위 5개)
    emotion_stats: list[EmotionStats] = []  # 감정별 승률
    best_hour: Optional[int] = None         # 최고 성과 시간대
    worst_hour: Optional[int] = None        # 최악 성과 시간대


# [클래스] AI 리포트 응답 DTO
class ReportResponse(BaseModel):
    report: str


# [클래스] 매매 일기 피드백 요청 DTO / [호출] POST /journal/feedback
class JournalFeedbackRequest(BaseModel):
    language: str = "en"
    journal_id: int
    trade_date: str
    symbol: str = ""
    entry_reason: str = ""
    exit_reason: str = ""
    emotion: str = ""
    memo: str = ""
    tags: list[str] = Field(default_factory=list)
    checklist_rate: float  # 체크리스트 완료율 (0.0~1.0)
    position_pnl: Optional[str] = None

    @field_validator("symbol", "entry_reason", "exit_reason", "emotion", "memo", mode="before")
    @classmethod
    def empty_optional_text(cls, value):
        return value or ""


# [클래스] 매매 일기 피드백 응답 DTO
class JournalFeedbackResponse(BaseModel):
    feedback: str


# [클래스] 기간별 리뷰 요청 DTO / [호출] POST /journal/period-review
class PeriodReviewRequest(BaseModel):
    language: str = "en"
    period: str  # "weekly" | "monthly"
    start_date: str
    end_date: str
    journals: list[dict]
    positions: list[dict]


# [클래스] 기간별 리뷰 응답 DTO
class PeriodReviewResponse(BaseModel):
    review: str


# [클래스] 트레이더 유형 코칭용 통계 데이터
class TraderTypeAdviceStats(BaseModel):
    total_positions: int
    avg_hold_hours: float
    unique_symbols: int
    win_rate: float
    avg_pnl_per_trade: float


# [클래스] 트레이더 유형 코칭 요청 DTO / [호출] POST /trader-type/advice
class TraderTypeAdviceRequest(BaseModel):
    language: str = "en"
    type_code: str
    type_name: str
    description: str
    strength: str
    weakness: str
    stats: TraderTypeAdviceStats


# [클래스] 트레이더 유형 코칭 응답 DTO
class TraderTypeAdviceResponse(BaseModel):
    advice: str


# [?대옒?? 留ㅻℓ 怨꾪쉷 AI ?붿껌/??/ [?몄텧] POST /journal/plan-review
class PlanReviewRequest(BaseModel):
    language: str = "en"
    trade_date: str
    plans: list[dict] = []
    journal: Optional[dict] = None


class PlanReviewResponse(BaseModel):
    feedback: str
