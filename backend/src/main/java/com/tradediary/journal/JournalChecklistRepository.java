// [파일 용도] 일기-체크리스트 연결 JPA Repository

package com.tradediary.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// [클래스] journal_checklist 테이블 쿼리 / [호출] ChecklistService, TradeJournalService
@Repository
public interface JournalChecklistRepository extends JpaRepository<JournalChecklist, Long> {

    // [용도] 특정 일기의 체크리스트 상태 조회 / [호출] TradeJournalService.getJournal()
    List<JournalChecklist> findByJournalId(Long journalId);

    // [용도] 특정 체크리스트 항목을 사용하는 일기들 조회 / [호출] 체크리스트 삭제 시 참조 확인
    List<JournalChecklist> findByChecklistId(Long checklistId);
}