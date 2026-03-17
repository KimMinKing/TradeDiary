# 매매 일기 구현 체크리스트

Last Updated: 2026-03-17

## Backend
- [x] strategy_tags 테이블 생성 (schema.sql 수정, migration V2 추가)
- [x] trade_journals 테이블 생성 (position_id nullable, trade_id/symbol/entry_reason/exit_reason 추가)
- [x] journal_strategy_tags 테이블 생성
- [x] StrategyTag.java 엔티티
- [x] StrategyTagRepository.java
- [x] StrategyTagService.java (목록/생성/삭제)
- [x] StrategyTagController.java
- [x] TradeJournal.java 엔티티
- [x] JournalStrategyTag.java 엔티티
- [x] TradeJournalRepository.java
- [x] TradeJournalService.java (CRUD)
- [x] TradeJournalController.java
- [x] ErrorCode.java 에러 코드 추가 (JOURNAL_NOT_FOUND, TAG_NOT_FOUND, TRADE_NOT_FOUND)

## Frontend
- [x] journalApi.js
- [x] JournalPage.jsx (목록, 필터, 삭제 확인)
- [x] JournalFormModal.jsx (작성/수정, 태그 즉석 생성)
- [x] App.jsx 라우트 추가 (/journal)
- [x] Navbar.jsx 메뉴 추가

## 완료 ✅
