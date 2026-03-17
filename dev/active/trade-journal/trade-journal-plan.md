# 매매 일기 CRUD 구현 계획서

Last Updated: 2026-03-17

## 기능 개요
거래(trade)별 매매 이유·감정·전략태그를 기록하고 조회·수정·삭제하는 일기 기능

---

## 영향받는 파일 목록

### Backend (신규 생성)
- `journal/StrategyTag.java` — 전략 태그 엔티티
- `journal/StrategyTagRepository.java`
- `journal/StrategyTagController.java`
- `journal/StrategyTagService.java`
- `journal/TradeJournal.java` — 매매 일기 엔티티
- `journal/JournalStrategyTag.java` — 일기-태그 연결 엔티티
- `journal/TradeJournalRepository.java`
- `journal/TradeJournalController.java`
- `journal/TradeJournalService.java`

### Backend (수정)
- `common/exception/ErrorCode.java` — 일기/태그 관련 에러 코드 추가

### Frontend (신규 생성)
- `api/journalApi.js` — 일기/태그 API 호출
- `pages/JournalPage.jsx` — 일기 목록 페이지
- `components/JournalFormModal.jsx` — 일기 작성/수정 모달

### Frontend (수정)
- `App.jsx` — /journal 라우트 추가
- `components/Navbar.jsx` — 일기 메뉴 추가

---

## DB 변경사항

### 신규 테이블 3개

```sql
-- 전략 태그 (사용자별 커스텀 + 기본 제공)
CREATE TABLE strategy_tags (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(50) NOT NULL,
    color      VARCHAR(20) DEFAULT '#00d4aa',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL
);

-- 매매 일기 (trade_id는 null 허용 — 포지션 없이도 작성 가능)
CREATE TABLE trade_journals (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_id     BIGINT REFERENCES trades(id) ON DELETE SET NULL,
    symbol       VARCHAR(30),
    entry_reason TEXT,
    exit_reason  TEXT,
    emotion      VARCHAR(20),
    memo         TEXT,
    created_at   TIMESTAMP NOT NULL,
    updated_at   TIMESTAMP NOT NULL
);

-- 일기-태그 연결 (M:N)
CREATE TABLE journal_strategy_tags (
    journal_id BIGINT NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
    tag_id     BIGINT NOT NULL REFERENCES strategy_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (journal_id, tag_id)
);
```

---

## API 엔드포인트 설계

### 전략 태그
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | /api/strategy-tags | 내 태그 목록 조회 |
| POST   | /api/strategy-tags | 태그 생성 |
| DELETE | /api/strategy-tags/{id} | 태그 삭제 |

### 매매 일기
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | /api/journals | 일기 목록 (쿼리: symbol, from, to) |
| GET    | /api/journals/{id} | 일기 단건 조회 |
| POST   | /api/journals | 일기 작성 |
| PUT    | /api/journals/{id} | 일기 수정 |
| DELETE | /api/journals/{id} | 일기 삭제 |

---

## 구현 단계

| 단계 | 내용 | 크기 |
|------|------|------|
| 1 | DB 마이그레이션 (테이블 3개) | S |
| 2 | 전략 태그 백엔드 (Entity → Repo → Service → Controller) | S |
| 3 | 매매 일기 백엔드 (Entity → Repo → Service → Controller) | M |
| 4 | ErrorCode 추가 | S |
| 5 | 프론트 API 모듈 (journalApi.js) | S |
| 6 | 프론트 일기 목록 페이지 (JournalPage.jsx) | M |
| 7 | 프론트 일기 작성/수정 모달 (JournalFormModal.jsx) | M |
| 8 | App.jsx + Navbar 라우트/메뉴 연결 | S |

---

## 주의사항

- **소유권 검증 필수**: 일기 조회/수정/삭제 시 `journal.userId == 로그인 userId` 확인
- **태그 소유권**: 태그 삭제 시 해당 유저의 태그인지 확인
- **포지션 미구현**: 현재 `trade_id`로 연결. 포지션 구현 시 `position_id`로 마이그레이션 예정
- **emotion 허용값**: CALM, CONFIDENT, FOMO, GREEDY, FEARFUL, ANXIOUS
