// [파일 용도] 매매 일기 ↔ 전략 태그 연결 엔티티 (M:N 매핑)

package com.tradediary.journal;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// [클래스] journal_strategy_tags 테이블 매핑 엔티티
@Entity
@Table(name = "journal_strategy_tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JournalStrategyTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_id", nullable = false)
    private TradeJournal journal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private StrategyTag tag;

    @Builder
    public JournalStrategyTag(TradeJournal journal, StrategyTag tag) {
        this.journal = journal;
        this.tag = tag;
    }
}
