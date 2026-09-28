# 안정성 및 성능 후속 개선

- 완료 날짜: 2026-08-03

## 개요

프론트엔드 요청 캐시, 현재가 조회, 자동 거래 동기화 및 알림 기간 조회의 경계 조건을 보강했습니다.

## 구현 파일 및 역할

- `frontend/src/api/requestCache.js`: 로그아웃 등 캐시 초기화 이후 이전 요청 응답이 다시 저장되는 경쟁 조건 방지
- `frontend/src/components/ProfitRateDisplay.jsx`: 종목별 현재가 요청 캐시 및 진행 중 요청 공유, 화면 복귀 시 갱신
- `frontend/src/hooks/useAutoSync.js`: Kraken 포함 등록 거래소 병렬 동기화, 온라인·화면 복귀 시 재개
- `frontend/src/pages/TradeListPage.jsx`: 모든 지원 거래소의 최초 동기화 대기 상태 반영
- `backend/src/main/java/com/tradediary/notification/*`: 기간별 알림 조회 API 완성 및 잘못된 기간 검증
- `frontend/src/utils/jwt.js`: Base64URL 호환 JWT 해석 로직 통합
- `backend/.../OAuth2SuccessHandler.java`, `OAuthCallbackPage.jsx`: OAuth 토큰을 URL query 대신 fragment로 전달하고 즉시 주소에서 제거

## 실행 및 검증

```bash
cd frontend
npm run lint
npm run build

cd ../backend
./gradlew test
```
