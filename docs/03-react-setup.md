# Phase 2 — React 프론트엔드 초기 설정

## 완료 날짜
2026-03-16

## 개요
Vite + React 프로젝트 생성 및 로그인/회원가입 화면 구현

## 기술 스택
| 라이브러리 | 용도 |
|---|---|
| Vite | 빌드 도구 (Create React App 대신 사용, 빠름) |
| React 19 | UI 프레임워크 |
| react-router-dom | 페이지 라우팅 |
| axios | API 호출 |
| zustand | 전역 상태 관리 (로그인 상태 등) |

## 폴더 구조
```
frontend/src/
├── pages/        ← 화면 단위 컴포넌트
├── components/   ← 재사용 UI 컴포넌트 (추후 추가)
├── api/          ← 서버 API 호출 함수
├── hooks/        ← 커스텀 훅 (추후 추가)
└── store/        ← zustand 전역 상태
```

## 구현 파일

| 파일 | 역할 |
|---|---|
| `api/authApi.js` | 회원가입/로그인/로그아웃 API 호출, axios 인터셉터로 토큰 자동 첨부 |
| `store/authStore.js` | 로그인 상태 전역 관리 (zustand) |
| `pages/LoginPage.jsx` | 로그인 화면 |
| `pages/SignupPage.jsx` | 회원가입 화면 |
| `pages/DashboardPage.jsx` | 로그인 후 메인 화면 (임시) |
| `App.jsx` | 라우터 설정 + PrivateRoute (로그인 안 하면 /login 으로 리다이렉트) |

## 백엔드 변경사항
- `CorsConfig.java` 추가 → `http://localhost:*` CORS 허용 (React 개발 서버용)

## 실행 방법
```bash
cd frontend
npm run dev
# → http://localhost:5173 접속
```

## 페이지 흐름
```
/signup  → 회원가입 성공 → /login
/login   → 로그인 성공  → /dashboard
그 외 URL → 로그인 안 된 상태면 /login 으로 이동
```
