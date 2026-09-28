// [파일 용도] 일기-체크리스트 연결 JPA 엔티티

package com.tradediary.journal;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] 일기별 체크리스트 체크 상태 / [호출] ChecklistService, TradeJournal
@Entity
@Table(name = "journal_checklist")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JournalChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_id", nullable = false)
    private TradeJournal journal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private ChecklistItem checklist;

    @Column(nullable = false)
    @Builder.Default
    private Boolean checked = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // [용도] 체크 여부 확인 / [호출] TradeJournalService
    public boolean isChecked() {
        return checked;
    }
}