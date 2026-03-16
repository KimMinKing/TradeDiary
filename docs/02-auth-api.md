# Phase 2 — 인증 API

## 완료 날짜
2026-03-16

## 개요
JWT 기반 회원가입 / 로그인 / 토큰 재발급 / 로그아웃 구현

## API 목록

| 메서드 | 경로 | 설명 | 인증 필요 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 | X |
| POST | `/api/auth/login` | 로그인 → 토큰 발급 | X |
| POST | `/api/auth/refresh` | AccessToken 재발급 | X |
| POST | `/api/auth/logout` | 로그아웃 | O |

## JWT 흐름

```
로그인
 → AccessToken  (유효시간 15분) → API 호출 시 헤더에 첨부
 → RefreshToken (유효시간 7일)  → AccessToken 만료 시 재발급용

API 요청
 → JwtFilter가 Authorization 헤더 확인
 → 유효하면 SecurityContext에 userId 저장 → 컨트롤러 진입
 → 유효하지 않으면 401 응답
```

## 요청/응답 예시

### 회원가입
```json
POST /api/auth/signup
{
  "email": "test@test.com",
  "password": "password123",
  "nickname": "테스터"
}
→ 200 OK
```

### 로그인
```json
POST /api/auth/login
{
  "email": "test@test.com",
  "password": "password123"
}
→ {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
```

### 로그아웃
```
POST /api/auth/logout
Authorization: Bearer eyJ...
→ 200 OK
```

## 구현 파일

| 파일 | 역할 |
|---|---|
| `user/User.java` | users 테이블 엔티티 |
| `user/UserRepository.java` | 이메일 조회, 중복 확인 |
| `user/UserService.java` | 회원가입/로그인/재발급/로그아웃 로직 |
| `user/AuthController.java` | REST API 엔드포인트 |
| `common/security/JwtUtil.java` | 토큰 생성 및 검증 |
| `common/security/JwtFilter.java` | 요청마다 토큰 검증 필터 |
| `common/security/RefreshToken.java` | refresh_tokens 테이블 엔티티 |
| `common/security/RefreshTokenRepository.java` | RefreshToken CRUD |

## 테스트
`backend/src/test/http/auth.http` → IntelliJ HTTP Client로 실행
