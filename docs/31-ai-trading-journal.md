# 31. AI 트레이딩 저널 플랫폼

## 완료 날짜
2024-06-03

## 개요
사업화 전략 보고서의 AI 기능을 기반으로 한 실제 구현. 기존 TradeDiary 프로젝트를 확장하여 AI 기반 트레이딩 저널 플랫폼을 구현.

## 구현 파일 목록 및 역할

### 백엔드 (Java Spring Boot)
- `backend/src/main/java/com/tradediary/journal/AIChallengeController.java` (생성 필요)
- `backend/src/main/java/com/tradediary/journal/AIChallenge.java` (생성 필요)
- `backend/src/main/java/com/tradediary/journal/AIChallengeRepository.java` (생성 필요)
- `backend/src/main/java/com/tradediary/journal/AIChallengeService.java` (생성 필요)

### AI 서버 (Python FastAPI)
- `ai-server/main.py` - AI 서버 메인 애플리케이션 업데이트
- `ai-server/models/schemas.py` - API 스키마 정의
- `ai-server/models/emotion_analysis.py` - 감정 분석 모델
- `ai-server/models/ai_challenge.py` - AI 챌린지 모델
- `ai-server/models/gamification.py` - 게임화 모델
- `ai-server/database/connection.py` - DB 연결 모델
- `ai-server/services/emotion_analysis_service.py` - 감정 분석 서비스
- `ai-server/services/ai_challenge_service.py` - AI 챌린지 서비스
- `ai-server/services/gamification_service.py` - 게임화 서비스
- `ai-server/services/chart_analysis_service.py` - 차트 분석 서비스
- `ai-server/routers/journal.py` - 매매일기 API 라우터 업데이트
- `ai-server/routers/game.py` - 게임화 API 라우터
- `ai-server/routers/chart.py` - 차트 분석 API 라우터
- `ai-server/routers/analytics.py` - 분석 API 라우터
- `ai-server/requirements.txt` - 의존성 목록 업데이트
- `ai-server/.env.example` - 환경 변수 예시

### 프론트엔드 (React)
- `frontend/src/components/AIChallenge.jsx` - AI 챌린저 컴포넌트
- `frontend/src/api/journalApi.js` - API 클라이언트 업데이트

### 데이터베이스
- `database/schema_ai.sql` - AI 관련 테이블 스키마
- `database/migrations/V8__ai_tables.sql` - 마이그레이션 스크립트

### Docker 및 배포
- `docker-compose.yml` - AI 서버 추가된 Docker Compose 설정

## 핵심 기능

### 1. AI 챌린저
- 거래 진입 전 3단 질문 구조
  1. 기술적 가설 명확화
  2. 손익비 계산 및 검증
  3. 과거 실패 경고와 확인
- 실시간 유효성 검증
- 비이성적 진입 감지 및 경고

### 2. 감정 분석
- 7가지 감정 수치화 (공포, 탐욕, 좌절, 확신, 포모, 피로, 중립)
- 행동 패턴 감지 (보복성 거래, 피로 누적, 과도한 확신)
- 감정 추이 분석 및 인사이트 제공

### 3. 게임화 시스템
- 규율 준수도 점수
- 샤프 비율 및 수익 성장률 반영
- 업정 시스템 (총 9개 업정)
- 리더보드 기능

### 4. 차트 분석
- 컴퓨터 비전 기반 패턴 인식
- YOLOv8 + Vision Transformer 결합
- 실시간 트레이딩 신호 생성
- 신뢰도 기반 매매 방향 제안

## 실행 방법

### 1. 데이터베이스 마이그레이션
```bash
# PostgreSQL 접속 후
psql -U tradediary -d tradediary -f database/migrations/V8__ai_tables.sql
```

### 2. AI 서버 의존성 설치
```bash
cd ai-server
pip install -r requirements.txt
```

### 3. 환경 변수 설정
```bash
cp ai-server/.env.example ai-server/.env
# .env 파일에 API 키 등 설정
```

### 4. 서비스 실행
```bash
# 백엔드
cd backend
mvn spring-boot:run

# AI 서버
cd ai-server
python main.py

# 프론트엔드
cd frontend
npm install
npm run dev
```

### 5. Docker로 실행
```bash
docker-compose up -d
```

## 기술 특징

### 아키텍처
- 분산 서비스 아키텍처 (Backend, AI Server, Frontend)
- PostgreSQL 데이터베이스
- FastAI + PyTorch 기반 머신러닝
- React 기반 UI

### 보안
- 거래소 API Key AES-256 암호화 저장
- JWT 토큰 인증
- Read-Only API만 허용

### 확장성
- 마이크로서비스 아키텍처
- 컨테이너 기반 배포
- 수평 확장 가능

## 성능 최적화

### AI 모델 최적화
- YOLOv8 경량화 버전 사용
- Vision Transformer 특징 추출 최적화
- 배치 처리로 추론 속도 향상

### 데이터베이스
- 인덱스 최적화
- 커넥션 풀링
- 쿼리 캐싱

## 모니터링
- 로깅 시스템 (loguru)
- 헬스체크 엔드포인트
- 성능 메트릭스

## 로드맵
- Phase 1: MVP (완료)
- Phase 2: AI 개선 (차트 분석 정확도 향상)
- Phase 3: 고급 기능 (카피 트레이딩 마켓플레이스)
- Phase 4: 글로벌 확장 (다국어, 다중 거래소 지원)

이 구현을 통해 사업화 전략의 핵심인 "AI 금융 비서"와 "능동형 규율 코칭 파트너"의 개념을 실현하였습니다.