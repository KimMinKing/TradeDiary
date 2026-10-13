# [파일 용도] AI 분석 서버 메인 애플리케이션 (FastAPI)

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# [용도] .env 파일에서 환경변수 로드 (DEEPSEEK_API_KEY 등) / [호출] 서비스 모듈 import 전
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
import secrets
from datetime import datetime
from fastapi import Request
from sqlalchemy import text
from database.connection import engine

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ai_server.log')
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Server starting up...")
    yield
    logger.info("AI Server shutting down...")

app = FastAPI(
    title="TradeDiary AI Server",
    description="AI-powered trading journal analysis platform",
    version="2.0.0",
    lifespan=lifespan
)

AI_SERVER_API_KEY = os.getenv("AI_SERVER_API_KEY", "")


@app.middleware("http")
async def require_internal_api_key(request: Request, call_next):
    """헬스체크 외 요청은 Spring 백엔드가 전달한 내부 공유 키로 인증한다."""
    if request.url.path == "/health":
        return await call_next(request)

    if not AI_SERVER_API_KEY:
        logger.error("AI_SERVER_API_KEY is not configured")
        return JSONResponse(status_code=503, content={"detail": "AI server authentication is not configured"})

    supplied_key = request.headers.get("X-Internal-API-Key", "")
    if not secrets.compare_digest(supplied_key, AI_SERVER_API_KEY):
        return JSONResponse(status_code=401, content={"detail": "Invalid internal API key"})

    return await call_next(request)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "https://tradediary.site"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 임포트
from routers import journal, report, analytics, game, chart, trader_type

app.include_router(journal.router, prefix="/api/journal", tags=["Journal"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(game.router, prefix="/api/game", tags=["Gamification"])
app.include_router(chart.router, prefix="/api/chart", tags=["Chart Analysis"])
app.include_router(trader_type.router, prefix="/api/trader-type", tags=["Trader Type"])

@app.get("/health")
async def health_check():
    """AI 서버와 데이터베이스 연결 상태 확인"""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("AI server database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "service": "ai-server", "database": "UP"}

@app.get("/")
async def root():
    """AI 서버 루트 엔드포인트"""
    return {"message": "TradeDiary AI Server is running", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
