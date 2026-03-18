# [파일 용도] AI 리포트 요청/응답 Pydantic 모델 정의

from pydantic import BaseModel
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
    exchange: Optional[str] = None          # 거래소 필터 (UPBIT/BYBIT/None=전체)
    summary: SummaryStats                   # 핵심 성과 지표
    top_symbols: list[SymbolStats] = []     # 종목별 성과 (수익 상위 5개)
    emotion_stats: list[EmotionStats] = []  # 감정별 승률
    best_hour: Optional[int] = None         # 최고 성과 시간대
    worst_hour: Optional[int] = None        # 최악 성과 시간대


# [클래스] AI 리포트 응답 DTO
class ReportResponse(BaseModel):
    report: str
