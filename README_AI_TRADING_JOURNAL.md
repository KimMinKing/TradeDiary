# AI 트레이딩 저널 플랫폼

가상자산 매매일기 서비스를 AI 기반으로 업그레이드한 프로젝트입니다. 사용자의 감정과 행동을 실시간으로 분석하여 규율 있는 트레이딩을 돕는 AI 금융 비서 서비스입니다.

## 핵심 기능

### 1. AI 챌린저
- 거래 진입 전 3단계 질문으로 이성적 판단 유도
- 기술적 가설 검증 및 손익비 계산
- 비이성적 진입 경고 시스템

### 2. 감정 분석
- 매매일기 텍스트 기반 감정 분석
- 7가지 감정 수치화 (공포, 탐욕, 좌절, 확신, 포모, 피로, 중립)
- 행동 패턴 감지 (보복성 거래, 피로 누적, 과도한 확신)

### 3. 게임화 시스템
- 규율 준수도 점수화
- 업정 시스템 (9가지 업정)
- 리더보드 경쟁

### 4. 차트 분석
- 컴퓨터 비전 기반 차트 패턴 인식
- 실시간 트레이딩 신호 생성

## 아키텍처

```
├── Frontend (React)
│   ├── AI 챌린저 인터페이스
│   ├── 감정 분석 대시보드
│   └── 게임화 배지 시스템
│
├── Backend (Java Spring Boot)
│   ├── 사용자 데이터 처리
│   └── 게임화 점수 계산
│
├── AI Server (Python FastAPI)
│   ├── 감정 분석 엔진
│   ├── AI 챌린저 서비스
│   ├── 게임화 서비스
│   └── 차트 분석 엔진
│
└── Database (PostgreSQL)
    ├── AI 챌린지 기록
    ├── 감정 분석 결과
    └── 게임화 데이터
```

## 기술 스택

- **Backend**: Java 17, Spring Boot 3
- **AI Server**: Python 3.11, FastAPI, PyTorch, Transformers
- **Frontend**: React, JavaScript
- **Database**: PostgreSQL
- **Deploy**: Docker, Docker Compose

## 실행 방법

### 1. 사전 요구 사항
- Java 17
- Python 3.11
- Node.js 18+
- PostgreSQL
- Docker (선택)

### 2. 설치
```bash
# 프로젝트 클론
git clone <repository-url>
cd tradediary

# 백엔드 설치
cd backend
mvn install

# AI 서버 의존성 설치
cd ai-server
pip install -r requirements.txt

# 프론트엔드 설치
cd frontend
npm install
```

### 3. 환경 설정
```bash
# 데이터베이스 설정
cp .env.example .env
# DB 연결 정보 설정

# AI 서버 설정
cd ai-server
cp .env.example .env
# OpenAI API 키 등 설정
```

### 4. 실행
```bash
# 백엔드
cd backend
mvn spring-boot:run

# AI 서버
cd ai-server
python main.py

# 프론트엔드
cd frontend
npm start
```

### 5. Docker 실행
```bash
docker-compose up -d
```

## API 엔드포인트

### AI 서버 API
- `POST /api/journal/emotion/analyze` - 감정 분석
- `POST /api/journal/ai-challenge/start` - AI 챌린지 시작
- `POST /api/game/score/{user_id}` - 게임화 점수 조회
- `POST /api/chart/analyze` - 차트 분석

### 프론트엔드 컴포넌트
- `AIChallenge` - AI 챌린저 팝업
- `EmotionDashboard` - 감정 분석 대시보드
- `GamificationProfile` - 게임화 프로필

## 데이터베이스 스키마

### 주요 테이블
- `ai_challenges` - AI 챌린지 기록
- `emotion_analyses` - 감정 분석 결과
- `gamification_scores` - 게임화 점수
- `achievements` - 업정 정의
- `user_achievements` - 사용자 업정

## 개발 로드맵

### Phase 1: MVP (완료)
- [x] AI 챌린저 구현
- [x] 감정 분석 엔진
- [x] 기본 게임화 시스템

### Phase 2: 고도화
- [ ] 차트 분석 정확도 향상
- [ ] 멀티모달 AI 모델 통합
- [ ] 실시간 알림 시스템

### Phase 3: 확장
- [ ] 카피 트레이딩 마켓플레이스
- [ ] 거래소 레퍼럴 연동
- [ ] 글로벌 거래사 지원

### Phase 4: 고급 기능
- [ ] 대화형 AI 튜터
- [ ] 예측 분석 모델
- [ ] 프로 트레이더 인증 시스템

## 보안 고려사항

- 거래소 API Key는 AES-256로 암호화
- JWT 토큰 인증 시스템
- Read-Only API만 허용
- 사용자 데이터 개인정보 보호

## 성능 최적화

- AI 모델 배치 처리
- 데이터베이스 인덱싱
- 캐싱 전략
- CDN 이미지 서비스

## 라이선스

MIT License

## 기여

이 프로젝트는 오픈 소스입니다. 기여를 환영합니다.