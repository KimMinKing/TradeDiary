# 일기 공개 범위 및 사진 보안

## 동작 규칙

- 새 일기는 기본적으로 `PRIVATE`이다.
- 공개 프로필에는 계정의 `diary_public` 설정과 일기의 `visibility=PUBLIC`이 모두 충족된 일기만 표시한다.
- 본인용 목록과 상세 조회는 기존처럼 소유자 ID를 조건에 포함한다.
- 공개 목록 응답에는 base64 사진 원문을 넣지 않고 `has_image`만 반환한다.
- 공개 사진은 `/api/journals/public/{userId}/{journalId}/image`에서 계정 및 일기 공개 범위를 다시 확인한 뒤 조회한다.

## 이미지 제한

- 허용 형식: JPEG, PNG, WebP
- 서버 저장 한도: 디코딩된 데이터 1.5MB
- MIME 선언과 실제 파일 시그니처를 함께 확인한다.
- SVG, 잘못된 base64, 확장자/MIME 위장 파일은 거부한다.
- 프런트엔드는 원본 8MB를 1차 제한하고 JPEG로 축소한 뒤 서버 한도를 다시 확인한다.

## 마이그레이션

`V103__JournalPrivacyAndImageSecurity.sql`은 `trade_journals.visibility`와 공개 조회용 부분 인덱스를 추가한다. 기존 사용 경험을 보존하기 위해 계정 공개 설정이 켜진 사용자의 기존 일기는 `PUBLIC`, 나머지는 `PRIVATE`로 이관한다.

운영 반영 전에는 백업 후 `migrationTest`를 실행하고, Flyway가 V103을 한 번만 적용했는지 확인한다. 이미 적용된 V103 파일은 수정하지 말고 후속 변경은 새 버전 마이그레이션으로 작성한다.
