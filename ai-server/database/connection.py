# [파일 용도] 데이터베이스 연결 관리

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os
from typing import Generator

# 환경 변수에서 DB 연결 정보 가져오기
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tradediary:tradediary@localhost:5432/tradediary"
)

# 데이터베이스 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # 개발 시 True로 설정하면 SQL 쿼리 출력
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스 생성
Base = declarative_base()

# 데이터베이스 의존성 주입 함수
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 함수로 사용하는 데이터베이스 세션 제공
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_session():
    """
    컨텍스트 매니저 형태의 데이터베이스 세션
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 데이터베이스 초기화 함수
def init_db():
    """
    데이터베이스 테이블 생성 (최초 실행 시)
    """
    try:
        # AI 서버 전용 테이블 생성
        from models.emotion_analysis import EmotionAnalysis
        from models.ai_challenge import AIChallenge
        from models.gamification import GamificationScore, Achievement, UserAchievement

        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise

# 데이터베이스 연결 테스트
def test_connection():
    """
    데이터베이스 연결 테스트
    """
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            return result.fetchone() is not None
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False