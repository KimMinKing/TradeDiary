# [파일 용도] FastAPI AI 분석 서버 진입점

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import report, news

# [클래스] FastAPI 앱 인스턴스 및 미들웨어 설정
app = FastAPI(
    title="TradeDiary AI Server",
    description="트레이딩 리포트 AI 분석 서버",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report.router, prefix="/report", tags=["report"])
app.include_router(news.router,   prefix="/news",   tags=["news"])


# [용도] 헬스체크 엔드포인트 / [호출] Docker healthcheck, Spring Boot 연동 확인
@app.get("/health")
def health():
    return {"status": "ok"}
