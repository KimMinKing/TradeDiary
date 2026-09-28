// [파일 용도] 매매 일기 JPA 엔티티

package com.tradediary.journal;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.trade.Trade;
import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
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

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExchangeKey.Exchange exchange;

    // 개별 거래 연결 (포지션 구현 전 임시 사용)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_id")
    private Trade trade;

    @Column(nullable = false)
    private LocalDate tradeDate;   // 거래 발생 날짜 (캘린더 기준, 작성일 createdAt과 구분)

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String symbol;

    // 선택된 거래 스냅샷 목록 (JSON 배열: [{id, symbol, side, price, qty, tradedAt, exchange}])
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String tradeRefsJson;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String entryReason;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String exitReason;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String emotion;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String memo;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String image;          // 첨부 이미지 (base64, JPEG 압축)

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private Visibility visibility;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedJournalFieldConverter.class)
    private String aiFeedback;

    @Column(length = 2)
    private String aiFeedbackLanguage;

    @Column(nullable = false)
    private short contentEncryptionVersion = 1;

    private LocalDateTime contentEncryptedAt;

    private LocalDateTime aiFeedbackUpdatedAt;

    @OneToMany(mappedBy = "journal", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JournalStrategyTag> journalStrategyTags = new ArrayList<>();

    @OneToMany(mappedBy = "journal", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JournalChecklist> journalChecklists = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public TradeJournal(User user, ExchangeKey.Exchange exchange, Trade trade, LocalDate tradeDate, String symbol,
                        String tradeRefsJson, String entryReason, String exitReason,
                        String emotion, String memo, String image, Visibility visibility) {
        this.user = user;
        this.exchange = exchange;
        this.trade = trade;
        this.tradeDate = tradeDate != null ? tradeDate : LocalDate.now();
        this.symbol = symbol;
        this.tradeRefsJson = tradeRefsJson;
        this.entryReason = entryReason;
        this.exitReason = exitReason;
        this.emotion = emotion;
        this.memo = memo;
        this.image = image;
        this.visibility = visibility != null ? visibility : Visibility.PRIVATE;
        this.contentEncryptionVersion = 1;
        this.contentEncryptedAt = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 일기 내용 수정 / [호출] TradeJournalService.updateJournal()
    public void update(String symbol, String tradeRefsJson, String entryReason,
String exitReason, String emotion, String memo, String image, Visibility visibility) {
        this.symbol = symbol;
        this.tradeRefsJson = tradeRefsJson;
        this.entryReason = entryReason;
        this.exitReason = exitReason;
        this.emotion = emotion;
        this.memo = memo;
        this.image = image;
        if (visibility != null) this.visibility = visibility;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateAiFeedback(String aiFeedback, String language) {
        this.aiFeedback = aiFeedback;
        this.aiFeedbackLanguage = language;
        this.aiFeedbackUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 태그 전체 교체 / [호출] TradeJournalService.updateJournal()
    public void clearTags() {
        this.journalStrategyTags.clear();
    }
    public enum Visibility {
        PRIVATE, PUBLIC
    }
}
