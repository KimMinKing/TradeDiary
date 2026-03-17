# 06. 매매 일기 CRUD

완료 날짜: 2026-03-17

## 개요
거래별 매매 이유·감정·전략태그를 기록하고 조회·수정·삭제하는 일기 기능 구현.
포지션이 미구현된 상태에서 `trade_id`로 개별 거래에 연결 가능하며, 독립적으로도 작성 가능.

---

## 구현 파일 목록

### Backend
| 파일 | 역할 |
|------|------|
| `journal/StrategyTag.java` | 전략 태그 엔티티 |
| `journal/TradeJournal.java` | 매매 일기 엔티티 |
| `journal/JournalStrategyTag.java` | 일기-태그 M:N 연결 엔티티 |
| `journal/StrategyTagRepository.java` | 태그 조회/저장 |
| `journal/TradeJournalRepository.java` | 일기 조회/저장 (필터 JPQL 포함) |
| `journal/StrategyTagService.java` | 태그 목록/생성/삭제 비즈니스 로직 |
| `journal/TradeJournalService.java` | 일기 CRUD 비즈니스 로직 |
| `journal/StrategyTagController.java` | `GET/POST/DELETE /api/strategy-tags` |
| `journal/TradeJournalController.java` | `GET/POST/PUT/DELETE /api/journals` |
| `common/exception/ErrorCode.java` | JOURNAL_NOT_FOUND, TAG_NOT_FOUND, TRADE_NOT_FOUND 추가 |

### Frontend
| 파일 | 역할 |
|------|------|
| `api/journalApi.js` | 일기/태그 API 호출 모듈 |
| `pages/JournalPage.jsx` | 일기 목록, 필터, 삭제 확인 |
| `components/JournalFormModal.jsx` | 일기 작성/수정 모달, 태그 즉석 생성 |
| `App.jsx` | `/journal` 라우트 추가 |
| `components/Navbar.jsx` | 매매 일기 메뉴 추가 |
| `styles/global.css` | 모달, 폼, 태그, 일기 카드 스타일 추가 |

### DB
| 파일 | 역할 |
|------|------|
| `database/schema.sql` | strategy_tags(color 컬럼), trade_journals(재설계), journal_strategy_tags 반영 |
| `database/migrations/V2__trade_journal.sql` | 기존 DB에 적용할 마이그레이션 SQL |

---

## API 엔드포인트

### 전략 태그
- `GET  /api/strategy-tags` — 기본 + 커스텀 태그 목록
- `POST /api/strategy-tags` — 커스텀 태그 생성
- `DELETE /api/strategy-tags/{id}` — 커스텀 태그 삭제 (본인 태그만)

### 매매 일기
- `GET    /api/journals?symbol=&from=&to=` — 목록 조회 (필터 선택)
- `GET    /api/journals/{id}` — 단건 조회
- `POST   /api/journals` — 작성
- `PUT    /api/journals/{id}` — 수정
- `DELETE /api/journals/{id}` — 삭제

---

## 실행 전 필수 작업

기존 DB가 있는 경우 마이그레이션 SQL 실행 필요:
```bash
psql -U tradediary -d tradediary -f database/migrations/V2__trade_journal.sql
```

Docker 컨테이너 내부에서 실행:
```bash
docker exec -i tradediary-postgres psql -U tradediary -d tradediary < database/migrations/V2__trade_journal.sql
```
