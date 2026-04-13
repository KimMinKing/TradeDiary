// [파일 용도] 매매 계획 메모 JPA 엔티티

package com.tradediary.plan;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

// [클래스] trade_plans 테이블 매핑 엔티티 (거래 전 계획 메모)
@Entity
@Table(name = "trade_plans")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TradePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate planDate;

    @Column(length = 30)
    private String symbol;

    @Column(length = 10)
    private String direction; // LONG, SHORT, null

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private boolean done;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public TradePlan(User user, LocalDate planDate, String symbol, String direction, String content) {
        this.user      = user;
        this.planDate  = planDate != null ? planDate : LocalDate.now();
        this.symbol    = symbol;
        this.direction = direction;
        this.content   = content;
        this.done      = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 계획 내용 수정 / [호출] TradePlanService.update()
    public void update(LocalDate planDate, String symbol, String direction, String content) {
        this.planDate  = planDate;
        this.symbol    = symbol;
        this.direction = direction;
        this.content   = content;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 완료 여부 토글 / [호출] TradePlanService.toggleDone()
    public void toggleDone() {
        this.done      = !this.done;
        this.updatedAt = LocalDateTime.now();
    }
}
