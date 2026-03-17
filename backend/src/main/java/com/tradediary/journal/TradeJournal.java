// [파일 용도] 매매 일기 JPA 엔티티

package com.tradediary.journal;

import com.tradediary.trade.Trade;
import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// [클래스] trade_journals 테이블 매핑 엔티티 (매매 이유/감정/전략태그 기록)
@Entity
@Table(name = "trade_journals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TradeJournal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 개별 거래 연결 (포지션 구현 전 임시 사용)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_id")
    private Trade trade;

    @Column(length = 30)
    private String symbol;

    @Column(columnDefinition = "TEXT")
    private String entryReason;

    @Column(columnDefinition = "TEXT")
    private String exitReason;

    @Column(length = 20)
    private String emotion;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @OneToMany(mappedBy = "journal", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JournalStrategyTag> journalStrategyTags = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public TradeJournal(User user, Trade trade, String symbol,
                        String entryReason, String exitReason,
                        String emotion, String memo) {
        this.user = user;
        this.trade = trade;
        this.symbol = symbol;
        this.entryReason = entryReason;
        this.exitReason = exitReason;
        this.emotion = emotion;
        this.memo = memo;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 일기 내용 수정 / [호출] TradeJournalService.updateJournal()
    public void update(String symbol, String entryReason, String exitReason,
                       String emotion, String memo) {
        this.symbol = symbol;
        this.entryReason = entryReason;
        this.exitReason = exitReason;
        this.emotion = emotion;
        this.memo = memo;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 태그 전체 교체 / [호출] TradeJournalService.updateJournal()
    public void clearTags() {
        this.journalStrategyTags.clear();
    }
}
